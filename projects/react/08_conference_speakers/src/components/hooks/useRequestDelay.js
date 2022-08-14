import { useState, useEffect } from 'react';

export const REQUEST_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  FAILURE: 'failure',
};

const useRequestDelay = (delayTimeInMs = 1000, initialData = []) => {
  const [data, setData] = useState(initialData);
  const [requestStatus, setRequestStatus] = useState(REQUEST_STATUS.LOADING);
  const [error, setError] = useState('');

  const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  useEffect(() => {
    const delayFunc = async (ms) => {
      try {
        await delay(ms);
        // throw 'Had error!';
        setData(data);
        setRequestStatus(REQUEST_STATUS.SUCCESS);
      } catch (error) {
        setRequestStatus(REQUEST_STATUS.FAILURE);
        setError(error);
      }
    };

    delayFunc(delayTimeInMs);
  }, []);

  const updateRecord = (recordUpdated, doneCallback) => {
    const originalRecords = [...data];
    const newRecords = data.map(function (rec) {
      return rec.id === recordUpdated.id ? recordUpdated : rec;
    });

    const delayFunc = async (ms) => {
      try {
        setData(newRecords);
        await delay(ms);
        // throw 'Had error!';
        if (doneCallback) {
          doneCallback();
        }
      } catch (error) {
        console.log('error thrown inside delayFunction', error);
        if (doneCallback) {
          doneCallback();
        }
        setData(originalRecords);
      }
    };

    delayFunc(delayTimeInMs);
  };

  return {
    data,
    requestStatus,
    error,
    updateRecord,
  };
};

export default useRequestDelay;
