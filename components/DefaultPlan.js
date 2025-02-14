// components/DefaultPlan.js
import { useState, useEffect, useRef } from 'react';
import isEqual from 'lodash.isequal';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateDefaultSchedule from '../hooks/useUpdateDefaultSchedule';
import ScheduleTable from './ScheduleTable';
import { generateScheduleFromFirestore } from '../utils/generateScheduleFromFirestore';

export default function DefaultPlan({
  currentUser,
  userData,
  currentVersion,
  otChapters,
  ntChapters,
  updateUserData,
  generateTrigger,
}) {
  const { getItem, setItem } = useLocalStorage();
  const [schedule, setSchedule] = useState(() =>
    currentUser ? [] : getItem('defaultSchedule', [])
  );
  const [defaultProgressMap, setDefaultProgressMap] = useState(() =>
    currentUser ? {} : getItem('progressMap', {})
  );
  const updateDefaultSchedule = useUpdateDefaultSchedule({
    currentVersion,
    setSchedule,
    setDefaultProgressMap,
    setItem,
    updateUserData,
    currentUser,
  });

  // When Firestore data is available, update state.
  useEffect(() => {
    if (currentUser && userData) {
      const { otChapters: fsOT, ntChapters: fsNT, defaultProgress, version } = userData;
      try {
        const { schedule: fsSchedule, progressMap } = generateScheduleFromFirestore(
          fsOT || otChapters,
          fsNT || ntChapters,
          defaultProgress,
          version
        );
        setSchedule(fsSchedule);
        if (progressMap && Object.keys(progressMap).length > 0) {
          setDefaultProgressMap(progressMap);
          setItem('progressMap', progressMap);
        }
      } catch (error) {
        console.error("Error generating default schedule:", error);
      }
    }
  }, [currentUser, userData, otChapters, ntChapters, setItem]);

  // When the generate trigger changes, regenerate the default schedule.
  useEffect(() => {
    updateDefaultSchedule(otChapters, ntChapters, false, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTrigger]);


  // Handle checkbox changes for default schedule.
  const lastCheckedRef = useRef(null);
  const handleCheckboxChange = (day, checked, event) => {
    const currentProgress = defaultProgressMap;
    let newProg;
    if (event.shiftKey && lastCheckedRef.current !== null) {
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      newProg = { ...currentProgress };
      for (let i = start; i <= end; i++) {
        newProg[i] = checked;
      }
    } else {
      newProg = { ...currentProgress, [day]: checked };
    }
    if (isEqual(newProg, currentProgress)) return;
    setDefaultProgressMap(newProg);
    setItem('progressMap', newProg);
    lastCheckedRef.current = day;
    if (currentUser) {
      updateUserData(currentUser.uid, { defaultProgress: newProg }).catch(console.error);
    }
  };

  return schedule && schedule.length > 0 ? (
    <ScheduleTable
      schedule={schedule}
      progressMap={defaultProgressMap}
      handleCheckboxChange={handleCheckboxChange}
    />
  ) : (
    <p></p>
  );
}
