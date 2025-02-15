// CustomPlan.js
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
  import useUpdateCustomSchedule from '../hooks/useUpdateCustomSchedule';
  import ScheduleTable from './ScheduleTable';
  
  const CustomPlan = forwardRef(
    (
      { currentUser, userData, currentVersion, updateUserData, customPlanText },
      ref
    ) => {
      const { getItem, setItem } = useLocalStorage();
  
      // For signed-in users, derive initial schedule and progress solely from Firestore.
      // For signed-out users, fall back to localStorage.
      const initialSchedule = currentUser
        ? (userData?.customSchedule || [])
        : getItem('customSchedule', []);
      const [customSchedule, setCustomSchedule] = useState(initialSchedule);
  
      const initialProgress = currentUser
        ? (userData?.customProgress || {})
        : getItem('customProgressMap', {});
      const [customProgressMap, setCustomProgressMap] = useState(initialProgress);
  
      // A flag to indicate that a local custom progress update is pending.
      const [progressPending, setProgressPending] = useState(false);
  
      const updateCustomSchedule = useUpdateCustomSchedule({
        currentVersion,
        setSchedule: setCustomSchedule,
        setCustomSchedule,
        setIsCustomSchedule: () => {},
        setCustomProgressMap,
        setItem,
        updateUserData,
        currentUser,
      });
  
      // Sync Firestore changes to local state and localStorage for custom schedule/progress,
      // but only update progress if no local change is pending.
      useEffect(() => {
        if (currentUser && userData) {
          if (
            userData.customSchedule &&
            !isEqual(userData.customSchedule, customSchedule)
          ) {
            setCustomSchedule(userData.customSchedule);
            setItem('customSchedule', userData.customSchedule);
          }
          if (
            userData.customProgress &&
            !isEqual(userData.customProgress, customProgressMap) &&
            !progressPending
          ) {
            setCustomProgressMap(userData.customProgress);
            setItem('customProgressMap', userData.customProgress);
          }
        }
      }, [currentUser, userData, customSchedule, customProgressMap, progressPending, setItem]);
  
      // Expose generateSchedule via ref.
      // When generate is called, we clear the custom progress map.
      useImperativeHandle(
        ref,
        () => ({
          generateSchedule() {
            if (customPlanText && customPlanText.trim() !== '') {
              // Pass true as a flag to clear progress.
              updateCustomSchedule(customPlanText, false, true);
            }
          },
        }),
        [customPlanText, updateCustomSchedule]
      );
  
      // Create a debounced function for updating custom progress.
      const debouncedUpdateProgress = useCallback(
        debounce((progress) => {
          if (currentUser) {
            updateUserData(currentUser.uid, { customProgress: progress })
              .catch(console.error)
              .finally(() => {
                setProgressPending(false);
              });
          } else {
            setItem('customProgressMap', progress);
            setProgressPending(false);
          }
        }, 1000),
        [currentUser, updateUserData, setItem]
      );
  
      // Handle checkbox changes.
      const lastCheckedRef = useRef(null);
      const handleCheckboxChange = (day, checked, event) => {
        const currentProgress = customProgressMap;
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
        // Update UI immediately.
        setCustomProgressMap(newProg);
        // Mark that a local update is pending.
        setProgressPending(true);
        // Debounce the update to Firestore/localStorage.
        debouncedUpdateProgress(newProg);
        lastCheckedRef.current = day;
      };
  
      return customSchedule && customSchedule.length > 0 ? (
        <ScheduleTable
          schedule={customSchedule}
          progressMap={customProgressMap}
          handleCheckboxChange={handleCheckboxChange}
        />
      ) : (
        <p></p>
      );
    }
  );
  
  export default CustomPlan;
  