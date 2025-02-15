// hooks/useUpdateDefaultSchedule.js
import { useRef } from 'react';
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
    clearProgress = false,
    existingProgress = {}
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

    // Use the existing progress if not clearing.
    const localDefaultProgress = clearProgress ? {} : existingProgress || {};

    const { schedule, progressMap } = generateScheduleFromFirestore(
      otChapters,
      ntChapters,
      localDefaultProgress,
      currentVersion
    );

    // Update local schedule state.
 // Only update local schedule state if schedule is non-empty.
  setSchedule(schedule);

    // Build the update object for Firestore.
    const updateData = {
      otChapters: String(otNum),
      ntChapters: String(ntNum),
      version: currentVersion,
      isCustomSchedule: false,
    };

    // Conditionally update progress.
    if (clearProgress) {
      updateData.defaultProgress = {};
      setDefaultProgressMap({});
      setItem('progressMap', {});
    } else if (progressMap && Object.keys(progressMap).length > 0) {
      setDefaultProgressMap(progressMap);
      setItem('progressMap', progressMap);
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
