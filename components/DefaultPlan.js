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

    // Always maintain the schedule locally (not loaded from Firestore).
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

    // On mount, generate the schedule using chapter values.
    useEffect(() => {
      if (currentUser && userData) {
        // Use Firestore chapter values if available, else fall back to props.
        const fsOT = userData.otChapters ? userData.otChapters : otChapters;
        const fsNT = userData.ntChapters ? userData.ntChapters : ntChapters;
        // Generate the schedule and progress map using the utility function directly.
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
        console.log("Generated table from FS chapter values without writing to Firestore.");
      } else {
        // For signed-out users, update using local values (this may write to localStorage/Firestore as defined).
        updateDefaultSchedule(otChapters, ntChapters, false, false, false, defaultProgressMap);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, userData, otChapters, ntChapters, currentVersion]);

    // When Firestore progress becomes available, update local progress.
    useEffect(() => {
      if (currentUser && userData && userData.defaultProgress) {
        setDefaultProgressMap(userData.defaultProgress);
        setItem('progressMap', userData.defaultProgress);
      }
    }, [currentUser, userData, setItem]);

    // Expose generateSchedule via ref.
    useImperativeHandle(
      ref,
      () => ({
        generateSchedule(clearProgress) {
          // When the user explicitly triggers generation (e.g. by pressing the generate button),
          // we call updateDefaultSchedule which will write to Firestore if needed.
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
      // On checkbox change, write to Firestore if signed in; otherwise, update localStorage.
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
