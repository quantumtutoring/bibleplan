import { useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * useUserDataSync
 *
 * Provides a unified method for updating the user's Firestore document.
 */
const useUserDataSync = () => {
  const updateUserData = useCallback((uid, data) => {
    if (!uid) {
      return Promise.reject(new Error("No user ID provided"));
    }
    console.log(`[useUserDataSync] Updating data for user ${uid}`, data);
    return setDoc(doc(db, "users", uid), data, { merge: true })
      .then(() => {
        console.log(`[useUserDataSync] Update successful for user ${uid}`);
        return true;
      })
      .catch((error) => {
        console.error(`[useUserDataSync] Update error for user ${uid}:`, error);
        throw error;
      });
  }, []);

  return { updateUserData };
};

export default useUserDataSync;
