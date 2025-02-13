import { useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * writeFireStore
 *
 * Provides a unified method for updating the user's Firestore document.
 */
const writeFireStore = () => {
  const updateUserData = useCallback((uid, data) => {
    if (!uid) {
      return Promise.reject(new Error("No user ID provided"));
    }
    console.log(`[writeFireStore] Updating data for user ${uid}`, data);
    return setDoc(doc(db, "users", uid), data, { merge: true })
      .then(() => {
        console.log(`[writeFireStore] Update successful for user ${uid}`);
        return true;
      })
      .catch((error) => {
        console.error(`[writeFireStore] Update error for user ${uid}:`, error);
        throw error;
      });
  }, []);

  return { updateUserData };
};

export default writeFireStore;
