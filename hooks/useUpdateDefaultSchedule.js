// hooks/useUpdateDefaultSchedule.js
import { useRef } from 'react';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { generateSchedule } from '../utils/generateSchedule';
import { generateScheduleFromFirestore } from '../utils/generateScheduleFromFirestore';
import isEqual from 'lodash.isequal';

export default function useUpdateDefaultSchedule({
  currentVersion,
  setSchedule,
  setDefaultProgressMap,
  setItem,
  updateUserData,
  currentUser,
}) {
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  const updateDefaultSchedule = (
    otChapters,
    ntChapters,
    fromInit = false,
    forceUpdate = false,
    clearProgress = false
  ) => {
    const otNum = parseInt(otChapters, 10);
    const ntNum = parseInt(ntChapters, 10);
    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    // Skip update if settings haven't changed (unless forced).
    if (
      !forceUpdate &&
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[useUpdateDefaultSchedule] Settings unchanged; skipping update.');
      return;
    }
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    // IMPORTANT: Instead of always using an empty default progress,
    // if you want to preserve Firestore's existing progress on sign-in,
    // you should pass in the Firestore value. Here, for simplicity, we assume
    // that when updateDefaultSchedule is called for generation (by the user)
    // you'll pass clearProgress = true; otherwise, for sign-in, you call this
    // function differently.
    const localDefaultProgress = clearProgress ? {} : {};
    const { schedule, progressMap } = generateScheduleFromFirestore(
      otChapters,
      ntChapters,
      localDefaultProgress,
      currentVersion
    );

    // Update local state.
    setSchedule(schedule);

    // Build the update object for Firestore.
    const updateData = {
      otChapters: String(otNum),
      ntChapters: String(ntNum),
      version: currentVersion,
      isCustomSchedule: false,
    };

    // Conditionally include defaultProgress:
    if (clearProgress) {
      // If explicitly clearing, include an empty object.
      updateData.defaultProgress = {};
      setDefaultProgressMap({});
      setItem('progressMap', {});
    } else if (progressMap && Object.keys(progressMap).length > 0) {
      // If progressMap is non-empty, then update local state.
      setDefaultProgressMap(progressMap);
      setItem('progressMap', progressMap);
      // Do NOT update Firestore if progressMap is empty.
      // (For sign-in, you want to preserve Firestore's data.)
      if (!isEqual(progressMap, {})) {
        updateData.defaultProgress = progressMap;
      }
    }
    // Only update Firestore if a user is signed in.
    if (currentUser) {
      updateUserData(currentUser.uid, updateData)
        .then(() => console.log('[useUpdateDefaultSchedule] Updated Firestore.'))
        .catch((error) =>
          console.error('[useUpdateDefaultSchedule] Error updating Firestore:', error)
        );
    }
  };

  return updateDefaultSchedule;
}
