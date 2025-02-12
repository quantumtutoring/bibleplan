import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import { db } from '../lib/firebase';

/**
 * Custom hook to manage progress tracking for the Bible Reading Planner.
 *
 * This hook handles:
 * - The local progressMap state.
 * - Updating localStorage for each checkbox change.
 * - Shift‑click multi-select behavior.
 * - Debouncing writes to Firestore.
 *
 * @param {object} currentUser - The current user object (used to write to Firestore).
 * @returns {object} An object containing:
 *   - progressMap: The current progress state.
 *   - setProgressMap: Function to update the progress state.
 *   - handleCheckboxChange: Function to handle a checkbox change event.
 *   - syncPending: Boolean indicating whether a sync operation is pending.
 */
export default function useProgressTracker(currentUser) {
  const [progressMap, setProgressMap] = useState({});
  const [syncPending, setSyncPending] = useState(false);
  const lastCheckedRef = useRef(null);
  const debouncedSaveRef = useRef(null);

  useEffect(() => {
    // Set up the debounced function to write progress to Firestore
    debouncedSaveRef.current = debounce((newProgress) => {
      if (currentUser) {
        db.collection('users')
          .doc(currentUser.uid)
          .set({ progress: newProgress }, { merge: true })
          .then(() => {
            console.log('[useProgressTracker] Progress write successful');
            setSyncPending(false);
          })
          .catch((error) => {
            console.error('[useProgressTracker] Error saving progress:', error);
          });
      }
    }, 1000);

    // Cleanup the debounced function on unmount
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [currentUser]);

  /**
   * Handles a checkbox change event.
   *
   * This function updates the progressMap state and localStorage. If shift is held,
   * it applies the change to all days between the last changed day and the current day.
   * It also triggers the debounced Firestore write.
   *
   * @param {number} day - The day number for which the checkbox changed.
   * @param {boolean} checked - The new checked state.
   * @param {Event} event - The event object (to check for shiftKey).
   */
  const handleCheckboxChange = (day, checked, event) => {
    console.log(`[useProgressTracker] Checkbox changed for day ${day} to ${checked}`);
    let newProgress;
    if (event.shiftKey && lastCheckedRef.current !== null) {
      // If shift is held, update all days between the last changed and the current day.
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      newProgress = { ...progressMap };
      for (let i = start; i <= end; i++) {
        newProgress[i] = checked;
        localStorage.setItem('check-day-' + i, checked ? 'true' : 'false');
      }
    } else {
      // Otherwise, update just the current day.
      newProgress = { ...progressMap, [day]: checked };
      localStorage.setItem('check-day-' + day, checked ? 'true' : 'false');
    }
    setProgressMap(newProgress);
    localStorage.setItem('progressMap', JSON.stringify(newProgress));
    setSyncPending(true);
    if (currentUser && debouncedSaveRef.current) {
      debouncedSaveRef.current(newProgress);
    }
    lastCheckedRef.current = day;
  };

  return { progressMap, setProgressMap, handleCheckboxChange, syncPending };
}
