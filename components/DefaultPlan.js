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
  import ScheduleTable from './ScheduleTable';
  
  const DefaultPlan = forwardRef(
    (
      { currentUser, userData, currentVersion, otChapters, ntChapters, updateUserData },
      ref
    ) => {
      const { getItem, setItem } = useLocalStorage();
      // Initialize progressMap from localStorage if signed out.
      const [defaultProgressMap, setDefaultProgressMap] = useState(() =>
        currentUser ? {} : getItem('progressMap', {})
      );
      const [schedule, setSchedule] = useState(() =>
        currentUser ? [] : getItem('defaultSchedule', [])
      );
  
      const updateDefaultSchedule = useUpdateDefaultSchedule({
        currentVersion,
        setSchedule,
        setDefaultProgressMap,
        setItem,
        updateUserData,
        currentUser,
      });
  
      // On mount, update schedule WITHOUT clearing progress.
      useEffect(() => {
        updateDefaultSchedule(
          otChapters,
          ntChapters,
          false,
          false,
          false,
          defaultProgressMap // pass the saved progress
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // runs only once on mount
  
      // Expose generateSchedule via ref for manual triggering.
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
  );
  
  export default DefaultPlan;
  