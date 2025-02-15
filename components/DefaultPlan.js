// DefaultPlan.js
import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import isEqual from 'lodash.isequal';
import debounce from 'lodash.debounce';
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

    // For signed-in users, ignore localStorage; for signed-out users, use localStorage as fallback.
    const initialSchedule = currentUser ? [] : getItem('defaultSchedule', []);
    const [schedule, setSchedule] = useState(initialSchedule);

    const initialProgress = currentUser ? {} : getItem('progressMap', {});
    const [defaultProgressMap, setDefaultProgressMap] = useState(initialProgress);

    // Flag to indicate a local progress update is pending.
    const [progressPending, setProgressPending] = useState(false);

    const updateDefaultSchedule = useUpdateDefaultSchedule({
      currentVersion,
      setSchedule,
      setDefaultProgressMap,
      setItem,
      updateUserData,
      currentUser,
    });

    // For signed-in users, auto-update schedule when OT/NT or version change.
    useEffect(() => {
      if (currentUser && userData) {
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
          setItem('defaultSchedule', newSchedule);
        }
        // Only update progress from Firestore if no local change is pending.
        if (!progressPending && userData.defaultProgress && !isEqual(userData.defaultProgress, defaultProgressMap)) {
          setDefaultProgressMap(userData.defaultProgress);
          setItem('progressMap', userData.defaultProgress);
        }
        console.log("Schedule auto-updated (signed-in) due to chapter/version change.");
      }
    }, [otChapters, ntChapters, currentVersion, currentUser, userData, setItem, schedule, defaultProgressMap, progressPending]);

    // For signed-out users, generate the schedule only once on mount.
    useEffect(() => {
      if (!currentUser) {
        updateDefaultSchedule(otChapters, ntChapters, false, false, false, defaultProgressMap);
      }
      // Run only once on mount.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Listen for changes in Firestore progress (if signed in) and update local state,
    // but skip updates while a local change is pending.
    useEffect(() => {
      if (currentUser && userData && userData.defaultProgress && !progressPending) {
        setDefaultProgressMap(userData.defaultProgress);
        setItem('progressMap', userData.defaultProgress);
      }
    }, [currentUser, userData, setItem, progressPending]);

    // Expose generateSchedule via ref (for manual generation).
    useImperativeHandle(
      ref,
      () => ({
        generateSchedule(clearProgress) {
          updateDefaultSchedule(otChapters, ntChapters, false, false, clearProgress);
        },
      }),
      [otChapters, ntChapters, updateDefaultSchedule]
    );

    // Create a debounced function for updating progress.
    const debouncedUpdateProgress = useCallback(
      debounce((progress) => {
        if (currentUser) {
          updateUserData(currentUser.uid, { defaultProgress: progress })
            .catch(console.error)
            .finally(() => {
              setProgressPending(false);
            });
        } else {
          setItem('progressMap', progress);
          setProgressPending(false);
        }
      }, 1000),
      [currentUser, updateUserData, setItem]
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
      // Immediately update UI state.
      setDefaultProgressMap(newProg);
      // Mark that a local update is pending.
      setProgressPending(true);
      // Debounce the update to Firestore/localStorage.
      debouncedUpdateProgress(newProg);
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
