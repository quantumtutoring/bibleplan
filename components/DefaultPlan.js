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

    // For signed-in users, initialize with empty values (never read from localStorage).
    const initialSchedule = currentUser ? [] : getItem('defaultSchedule', []);
    const [schedule, setSchedule] = useState(initialSchedule);

    const initialProgress = currentUser ? {} : getItem('progressMap', {});
    const [defaultProgressMap, setDefaultProgressMap] = useState(initialProgress);

    const updateDefaultSchedule = useUpdateDefaultSchedule({
      currentVersion,
      setSchedule,
      setDefaultProgressMap,
      setItem,
      updateUserData,
      currentUser,
    });

    // Update schedule whenever chapters or version change.
    useEffect(() => {
      if (currentUser && userData) {
        // Use Firestore chapter values if available; otherwise, fall back to props.
        const fsOT = userData.otChapters ? userData.otChapters : otChapters;
        const fsNT = userData.ntChapters ? userData.ntChapters : ntChapters;
        const { schedule: newSchedule, progressMap: newProgressMap } = generateScheduleFromFirestore(
          fsOT,
          fsNT,
          defaultProgressMap,
          currentVersion
        );
        if (!isEqual(newSchedule, schedule)) {
          setSchedule(newSchedule);
          // Write to localStorage even when signed in.
          setItem('defaultSchedule', newSchedule);
        }
        if (!isEqual(newProgressMap, defaultProgressMap)) {
          setDefaultProgressMap(newProgressMap);
          setItem('progressMap', newProgressMap);
        }
        console.log("Schedule updated (signed-in) due to chapter/version change.");
      } else {
        // For signed-out users, update using local values and persist to localStorage.
        updateDefaultSchedule(otChapters, ntChapters, false, false, false, defaultProgressMap);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otChapters, ntChapters, currentVersion, currentUser, userData]);

    // Listen for changes in Firestore progress (if signed in) and update local state.
    useEffect(() => {
      if (currentUser && userData && userData.defaultProgress) {
        setDefaultProgressMap(userData.defaultProgress);
        setItem('progressMap', userData.defaultProgress);
      }
    }, [currentUser, userData, setItem]);

    // Expose generateSchedule via ref (manual regeneration, e.g. when pressing a button).
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
