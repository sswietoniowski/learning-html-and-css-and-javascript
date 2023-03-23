import { useState, useEffect, useRef } from 'react';
import { app, auth, db } from '../firebase.config';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import Spinner from '../components/Spinner';

interface FormData {
  type: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  parking: boolean;
  furnished: boolean;
  address: string;
  offer: boolean;
  regularPrice: number;
  discountedPrice?: number;
  images?: File[];
  latitude?: number;
  longitude?: number;
  userRef?: string;
}

interface ListingData {
  type: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  parking: boolean;
  furnished: boolean;
  offer: boolean;
  regularPrice: number;
  discountedPrice?: number;
  imageUrls?: string[];
  location: string;
  geolocation: {
    lat: number;
    lng: number;
  };
  timestamp: any;
  userRef: string;
}

const CreateListing = () => {
  const [geolocationEnabled, setGeolocationEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    type: 'rent',
    name: '',
    bedrooms: 0,
    bathrooms: 0,
    parking: false,
    furnished: false,
    address: '',
    offer: false,
    regularPrice: 0,
    discountedPrice: 0,
    images: [],
    latitude: 0,
    longitude: 0,
  });

  const {
    type,
    name,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    address,
    offer,
    regularPrice,
    discountedPrice,
    latitude,
    longitude,
  } = formData;

  const navigate = useNavigate();
  const isMounted = useRef(true);

  useEffect(() => {
    if (isMounted.current) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          setFormData({ ...formData, userRef: user.uid });
        } else {
          navigate('/sign-in');
        }
      });
    }
    return () => {
      isMounted.current = false;
    };
  }, [isMounted]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const {
      type,
      name,
      bedrooms,
      bathrooms,
      parking,
      furnished,
      address,
      offer,
      regularPrice,
      discountedPrice,
      images,
      latitude,
      longitude,
    } = formData;

    setLoading(true);

    if (discountedPrice != null && discountedPrice >= regularPrice) {
      setLoading(false);
      toast.error('Discounted price needs to be less than regular price');
      return;
    }

    const MAX_IMAGES = 6;

    if (images!.length > MAX_IMAGES) {
      setLoading(false);
      toast.error('Max 6 images');
      return;
    }

    if (!geolocationEnabled && (latitude == null || longitude == null)) {
      setLoading(false);
      toast.error('Latitude and longitude are required');
      return;
    }

    let geolocation = { lat: 0, lng: 0 };
    let location = '';

    if (geolocationEnabled) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${
          import.meta.env.VITE_GOOGLE_MAPS_API_KEY
        }`
      );

      const data = await response.json();

      console.log(data);

      if (data.status === 'OK' && data.status !== 'ZERO_RESULTS') {
        geolocation = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        };

        location = data.results[0].formatted_address;
      } else {
        setLoading(false);
        toast.error('Please enter a correct address');
        return;
      }
    } else {
      geolocation = {
        lat: latitude!,
        lng: longitude!,
      };
      location = address;
    }

    // Store images in firebase storage
    const storeImage = async (image: File) => {
      return new Promise<string>((resolve, reject) => {
        const storage = getStorage();
        const fileName = `${auth.currentUser!.uid}-${
          image.name
        }-${uuidv4()}.jpg`;

        const storageRef = ref(storage, `images/${fileName}`);

        const uploadTask = uploadBytesResumable(storageRef, image);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
              case 'paused':
                console.log('Upload is paused');
                break;
              case 'running':
                console.log('Upload is running');
                break;
            }
          },
          (error) => {
            reject(error);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL);
            });
          }
        );
      });
    };

    let imageUrls = await Promise.all(
      images!.map((image) => storeImage(image))
    ).catch(() => {
      setLoading(false);
      toast.error('Images could not be uploaded');
      return;
    });

    if (imageUrls == null) {
      imageUrls = [];
    }

    const newListing: ListingData = {
      type,
      name,
      bedrooms,
      bathrooms,
      parking,
      furnished,
      location,
      offer,
      regularPrice,
      discountedPrice,
      imageUrls,
      geolocation,
      timestamp: serverTimestamp(),
      userRef: auth.currentUser!.uid,
    };

    const docRef = await addDoc(collection(db, 'listings'), newListing);

    console.log('Listing added with ID: ', docRef.id);

    setLoading(false);

    toast.success('Listing created successfully');

    navigate(`/category/${type}/${docRef.id}`);
  };

  const onMutate = <E extends React.SyntheticEvent>(e: E) => {
    const target = e.currentTarget;

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement
    ) {
      const id = target.id;

      if (id === 'images') {
        const images: File[] = Array.from(
          (target as HTMLInputElement).files!
        ).map((file) => file);

        console.log(JSON.stringify({ [id]: images }));

        if (images.length > 0) {
          setFormData({ ...formData, images });
        }
      } else {
        let value: string | number | boolean = target.value;

        if (['parking', 'furnished', 'offer'].indexOf(id) > -1) {
          value = value === 'true' ? true : false;
        }

        console.log(JSON.stringify({ [id]: value }));

        setFormData({ ...formData, [id]: value });
      }
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className='profile'>
      <header>
        <p className='pageHeader'>Create a Listing</p>
      </header>

      <main>
        <form onSubmit={onSubmit}>
          <label className='formLabel'>Sell / Rent</label>
          <div className='formButtons'>
            <button
              type='button'
              className={type === 'sale' ? 'formButtonActive' : 'formButton'}
              id='type'
              value='sale'
              onClick={onMutate}
            >
              Sell
            </button>
            <button
              type='button'
              className={type === 'rent' ? 'formButtonActive' : 'formButton'}
              id='type'
              value='rent'
              onClick={onMutate}
            >
              Rent
            </button>
          </div>

          <label className='formLabel'>Name</label>
          <input
            className='formInputName'
            type='text'
            id='name'
            value={name}
            onChange={onMutate}
            minLength={10}
            maxLength={32}
            required
          />

          <div className='formRooms flex'>
            <div>
              <label className='formLabel'>Bedrooms</label>
              <input
                className='formInputSmall'
                type='number'
                id='bedrooms'
                value={bedrooms}
                onChange={onMutate}
                min='1'
                max='50'
                required
              />
            </div>
            <div>
              <label className='formLabel'>Bathrooms</label>
              <input
                className='formInputSmall'
                type='number'
                id='bathrooms'
                value={bathrooms}
                onChange={onMutate}
                min='1'
                max='50'
                required
              />
            </div>
          </div>

          <label className='formLabel'>Parking spot</label>
          <div className='formButtons'>
            <button
              className={parking ? 'formButtonActive' : 'formButton'}
              type='button'
              id='parking'
              value='true'
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              className={
                !parking && parking !== null ? 'formButtonActive' : 'formButton'
              }
              type='button'
              id='parking'
              value='false'
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label className='formLabel'>Furnished</label>
          <div className='formButtons'>
            <button
              className={furnished ? 'formButtonActive' : 'formButton'}
              type='button'
              id='furnished'
              value='true'
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              className={
                !furnished && furnished !== null
                  ? 'formButtonActive'
                  : 'formButton'
              }
              type='button'
              id='furnished'
              value='false'
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label className='formLabel'>Address</label>
          <textarea
            className='formInputAddress'
            id='address'
            value={address}
            onChange={onMutate}
            required
          />

          {!geolocationEnabled && (
            <div className='formLatLng flex'>
              <div>
                <label className='formLabel'>Latitude</label>
                <input
                  className='formInputSmall'
                  type='number'
                  id='latitude'
                  value={latitude}
                  onChange={onMutate}
                  required
                />
              </div>
              <div>
                <label className='formLabel'>Longitude</label>
                <input
                  className='formInputSmall'
                  type='number'
                  id='longitude'
                  value={longitude}
                  onChange={onMutate}
                  required
                />
              </div>
            </div>
          )}

          <label className='formLabel'>Offer</label>
          <div className='formButtons'>
            <button
              className={offer ? 'formButtonActive' : 'formButton'}
              type='button'
              id='offer'
              value='true'
              onClick={onMutate}
            >
              Yes
            </button>
            <button
              className={
                !offer && offer !== null ? 'formButtonActive' : 'formButton'
              }
              type='button'
              id='offer'
              value='false'
              onClick={onMutate}
            >
              No
            </button>
          </div>

          <label className='formLabel'>Regular Price</label>
          <div className='formPriceDiv'>
            <input
              className='formInputSmall'
              type='number'
              id='regularPrice'
              value={regularPrice}
              onChange={onMutate}
              min='50'
              max='750000000'
              required
            />
            {type === 'rent' && <p className='formPriceText'>$ / Month</p>}
          </div>

          {offer && (
            <>
              <label className='formLabel'>Discounted Price</label>
              <input
                className='formInputSmall'
                type='number'
                id='discountedPrice'
                value={discountedPrice}
                onChange={onMutate}
                min='50'
                max='750000000'
              />
            </>
          )}

          <label className='formLabel'>Images</label>
          <p className='imagesInfo'>
            The first image will be the cover (max 6).
          </p>
          <input
            className='formInputFile'
            type='file'
            id='images'
            onChange={onMutate}
            max='6'
            accept='.jpg,.png,.jpeg'
            multiple
            required
          />
          <button type='submit' className='primaryButton createListingButton'>
            Create Listing
          </button>
        </form>
      </main>
    </div>
  );
};

export default CreateListing;
