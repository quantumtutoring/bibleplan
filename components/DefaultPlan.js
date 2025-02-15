// DefaultPlan.js
import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import isEqual from 'lodash.isequal';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateDefaultSchedule from '../hooks/useUpdateDefaultSchedule';
import { generateScheduleFromFirestore } from '../utils/generateScheduleFromFirestore';
import ScheduleTable from './ScheduleTable';

const DefaultPlan = forwardRef(
  (
    { currentUser, userData, currentVersion, otChapters, ntChapters, updateUserData },
    ref
  ) => {
    const { getItem, setItem } = useLocalStorage();

    // The schedule is maintained locally. Initially, we read from localStorage.
    const initialSchedule = getItem('defaultSchedule', []);
    const [schedule, setSchedule] = useState(initialSchedule);

    // For progress, if signed in and Firestore has data, use that; otherwise, fallback to localStorage.
    const initialProgress =
      currentUser && userData && userData.defaultProgress
        ? userData.defaultProgress
        : getItem('progressMap', {});
    const [defaultProgressMap, setDefaultProgressMap] = useState(initialProgress);

    const updateDefaultSchedule = useUpdateDefaultSchedule({
      currentVersion,
      setSchedule,
      setDefaultProgressMap,
      setItem,
      updateUserData,
      currentUser,
    });

    // On mount only (run once), generate the schedule.
    useEffect(() => {
      if (currentUser && userData) {
        // Use Firestore chapter values if available; else, fall back to props.
        const fsOT = userData.otChapters ? userData.otChapters : otChapters;
        const fsNT = userData.ntChapters ? userData.ntChapters : ntChapters;
        // Generate the schedule using the utility function directly.
        const { schedule: newSchedule, progressMap: newProgressMap } = generateScheduleFromFirestore(
          fsOT,
          fsNT,
          defaultProgressMap,
          currentVersion
        );
        if (newSchedule && newSchedule.length > 0) {
          setSchedule(newSchedule);
          setItem('defaultSchedule', newSchedule);
        }
        if (newProgressMap && Object.keys(newProgressMap).length > 0) {
          setDefaultProgressMap(newProgressMap);
          setItem('progressMap', newProgressMap);
        }
        console.log("Loaded schedule from Firestore chapter values on mount (no live updates).");
      } else {
        // For signed-out users, generate schedule from local values once.
        updateDefaultSchedule(otChapters, ntChapters, false, false, false, defaultProgressMap);
      }
      // Empty dependency array: this effect runs only once on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for changes in Firestore progress (if signed in) and update local state.
    useEffect(() => {
      if (currentUser && userData && userData.defaultProgress) {
        setDefaultProgressMap(userData.defaultProgress);
        setItem('progressMap', userData.defaultProgress);
      }
    }, [currentUser, userData, setItem]);

    // Expose generateSchedule via ref. This method is triggered only when the user presses the generate button.
    useImperativeHandle(
      ref,
      () => ({
        generateSchedule(clearProgress) {
          updateDefaultSchedule(otChapters, ntChapters, false, false, clearProgress);
        },
      }),
      [otChapters, ntChapters, updateDefaultSchedule]
    );

    // Handle checkbox changes.
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
      // Write to Firestore if signed in; otherwise update localStorage.
      if (currentUser) {
        updateUserData(currentUser.uid, { defaultProgress: newProg }).catch(console.error);
      } else {
        setItem('progressMap', newProg);
      }
      lastCheckedRef.current = day;
    };

    return schedule && schedule.length > 0 ? (
      <ScheduleTable
        schedule={schedule}
        progressMap={defaultProgressMap}
        handleCheckboxChange={handleCheckboxChange}
      />
    ) : (
      <p>No schedule available.</p>
    );
  }
);

export default DefaultPlan;
