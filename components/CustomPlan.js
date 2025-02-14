// components/CustomPlan.js
import { useState, useEffect, useRef } from 'react';
import isEqual from 'lodash.isequal';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateCustomSchedule from '../hooks/useUpdateCustomSchedule';
import ScheduleTable from './ScheduleTable';

export default function CustomPlan({ 
  currentUser, 
  userData, 
  currentVersion, 
  updateUserData, 
  customPlanText, 
  generateTrigger 
}) {
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

  // When the generate trigger changes, update the custom schedule.
  useEffect(() => {
    if (customPlanText && customPlanText.trim() !== '') {
      updateCustomSchedule(customPlanText, false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTrigger]);

  // **NEW EFFECT**: When there's no currentUser, clear the custom progress map.
  useEffect(() => {
    if (!currentUser) {
      setCustomProgressMap({});
      setItem('customProgressMap', {});
    }
  }, [currentUser, setItem]);

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
