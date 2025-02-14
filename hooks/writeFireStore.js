import { useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Module-level counter for writes.
let writeCount = 0;

const writeFireStore = () => {
  const updateUserData = useCallback((uid, data) => {
    if (!uid) {
      return Promise.reject(new Error("No user ID provided"));
    }
    writeCount++;
    const timeStamp = new Date().toISOString();
    console.log(`[${timeStamp}] Write #${writeCount}: Updating data for user ${uid}`, data);
    return setDoc(doc(db, "users", uid), data, { merge: true })
      .then(() => {
        const successTime = new Date().toISOString();
        console.log(`[${successTime}] Write #${writeCount} successful for user ${uid}`);
        console.log(`[${successTime}] Running total writes: ${writeCount}`);
        return true;
      })
      .catch((error) => {
        const errorTime = new Date().toISOString();
        console.error(`[${errorTime}] Write #${writeCount} error for user ${uid}:`, error);
        throw error;
      });
  }, []);

  return { updateUserData, writeCount };
};

export default writeFireStore;
