// hooks/useUserDataSync.js
import { useCallback } from 'react';
import { db } from '../lib/firebase';

/**
 * useUserDataSync
 *
 * This hook provides a unified method for updating the user's Firestore document.
 * It centralizes all writes to the user’s document so that error handling, logging,
 * and merging behavior remain consistent across the application.
 *
 * It is designed to handle the following four cases:
 *
 * 1. Version Update:
 *    - When the user changes their Bible version (e.g., NASB, LSB, ESV).
 *
 * 2. Combined Settings/Progress Update:
 *    - When updating OT/NT chapter settings and clearing progress (for example,
 *      when generating a new schedule).
 *
 * 3. Debounced Progress Update:
 *    - When checkbox progress updates are debounced to prevent rapid-fire writes.
 *
 * 4. Sign-Up Flow:
 *    - When a new user is created, this hook is used to populate their document
 *      with default settings and progress data.
 *
 * @returns {object} - An object containing:
 *   - updateUserData(uid: string, data: object): Promise<boolean>
 *     Updates the user document for the given uid with the provided data, merging it with existing data.
 */
const useUserDataSync = () => {
  const updateUserData = useCallback((uid, data) => {
    if (!uid) {
      return Promise.reject(new Error("No user ID provided"));
    }
    console.log(`[useUserDataSync] Updating data for user ${uid}`, data);
    return db
      .collection('users')
      .doc(uid)
      .set(data, { merge: true })
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
