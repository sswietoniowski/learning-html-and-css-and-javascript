import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { toast } from 'react-toastify';
import Spinner from '../components/Spinner';
import ListingItem from '../components/ListingItem';

const Offers = () => {
  const [listings, setListings] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        // get reference to the collection
        const listingsRef = collection(db, 'listings');

        // create a query
        const q = query(
          listingsRef,
          where('offer', '==', true),
          orderBy('timestamp', 'desc'),
          limit(10)
        );

        // execute the query
        const querySnapshot = await getDocs(q);

        let listings: DocumentData[] = [];

        querySnapshot.forEach((doc) => {
          return listings.push({ id: doc.id, data: doc.data() });
        });

        setListings(listings);
        setLoading(false);
      } catch (err) {
        toast.error('Could not fetch listings');
      }
    };

    fetchListing();
  }, []);

  const listingItems =
    listings && listings.length > 0 ? (
      <main>
        <ul className='categoryListings'>
          {listings.map((listing) => (
            <ListingItem
              key={listing.id}
              id={listing.id}
              listing={listing.data}
            />
          ))}
        </ul>
      </main>
    ) : (
      <p>There are no current offers</p>
    );

  return (
    <div className='category'>
      <header>
        <p className='pageHeader'>Offers</p>
      </header>
      {loading ? <Spinner /> : listingItems}
    </div>
  );
};

export default Offers;
