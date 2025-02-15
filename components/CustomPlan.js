// CustomPlan.js
import React, {
    useState,
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
  } from 'react';
  import isEqual from 'lodash.isequal';
  import useLocalStorage from '../hooks/useLocalStorage';
  import useUpdateCustomSchedule from '../hooks/useUpdateCustomSchedule';
  import ScheduleTable from './ScheduleTable';
  
  const CustomPlan = forwardRef(
    (
      { currentUser, userData, currentVersion, updateUserData, customPlanText },
      ref
    ) => {
      const { getItem, setItem } = useLocalStorage();
  
      // When signed in, derive initial schedule and progress solely from Firestore.
      // For signed-out users, fall back to localStorage.
      const initialSchedule = currentUser
        ? (userData?.customSchedule || [])
        : getItem('customSchedule', []);
      const [customSchedule, setCustomSchedule] = useState(initialSchedule);
  
      const initialProgress = currentUser
        ? (userData?.customProgress || {})
        : getItem('customProgressMap', {});
      const [customProgressMap, setCustomProgressMap] = useState(initialProgress);
  
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
  
      // Sync Firestore changes to local state and localStorage.
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
            !isEqual(userData.customProgress, customProgressMap)
          ) {
            setCustomProgressMap(userData.customProgress);
            setItem('customProgressMap', userData.customProgress);
          }
        }
      }, [currentUser, userData, customSchedule, customProgressMap, setItem]);
  
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
        setCustomProgressMap(newProg);
        if (currentUser) {
          updateUserData(currentUser.uid, { customProgress: newProg }).catch(console.error);
        } else {
          setItem('customProgressMap', newProg);
        }
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
  