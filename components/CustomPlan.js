// components/CustomPlan.js
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
      { 
        currentUser, 
        userData, 
        currentVersion, 
        updateUserData, 
        customPlanText 
      },
      ref
    ) => {
      const { getItem, setItem } = useLocalStorage();
      const [customSchedule, setCustomSchedule] = useState(() =>
        currentUser ? [] : getItem('customSchedule', [])
      );
      const [customProgressMap, setCustomProgressMap] = useState(() =>
        currentUser ? {} : getItem('customProgressMap', {})
      );
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
  
      // Merge Firestore custom schedule and progress, if available.
      useEffect(() => {
        if (currentUser && userData && userData.customSchedule) {
          setCustomSchedule(userData.customSchedule);
          if (userData.customProgress) {
            setCustomProgressMap(userData.customProgress);
          }
        }
      }, [currentUser, userData]);
  
      // Expose generateSchedule via ref so that the parent can trigger generation.
      // Notice we pass "true" for clearProgress.
      useImperativeHandle(
        ref,
        () => ({
          generateSchedule() {
            if (customPlanText && customPlanText.trim() !== '') {
              // Pass "true" as the third parameter to clear the progress map.
              updateCustomSchedule(customPlanText, false, true);
            }
          },
        }),
        [customPlanText, updateCustomSchedule]
      );
  
      // Handle checkbox changes for custom schedule.
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
        setItem('customProgressMap', newProg);
        lastCheckedRef.current = day;
        if (currentUser) {
          updateUserData(currentUser.uid, { customProgress: newProg }).catch(console.error);
        }
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
  