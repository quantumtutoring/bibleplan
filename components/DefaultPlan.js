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
  
      // If signed in and Firestore has data, use that; otherwise, fall back to localStorage.
      const initialSchedule =
        currentUser && userData && userData.defaultSchedule
          ? userData.defaultSchedule
          : getItem('defaultSchedule', []);
      const [schedule, setSchedule] = useState(initialSchedule);
  
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
  
      // When the component mounts, update schedule without clearing progress.
      useEffect(() => {
        updateDefaultSchedule(otChapters, ntChapters, false, false, false, defaultProgressMap);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
  
      // NEW: When Firestore data becomes available, update local state.
      useEffect(() => {
        if (currentUser && userData) {
          if (userData.defaultSchedule) {
            setSchedule(userData.defaultSchedule);
            setItem('defaultSchedule', userData.defaultSchedule);
          }
          if (userData.defaultProgress) {
            setDefaultProgressMap(userData.defaultProgress);
            setItem('progressMap', userData.defaultProgress);
          }
        }
      }, [currentUser, userData, setItem]);
  
      // Expose generateSchedule via ref.
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
        // If signed in, update Firestore; otherwise, update localStorage.
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
        <p></p>
      );
    }
  );
  
  export default DefaultPlan;
  