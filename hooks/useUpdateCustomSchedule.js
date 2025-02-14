// hooks/useUpdateCustomSchedule.js
import { useRef } from 'react';
import isEqual from 'lodash.isequal';

// You could also move these utility functions into a shared utils file.
const buildUrl = (passages, currentVersion) => {
  const encoded = encodeURIComponent(passages);
  if (currentVersion === 'lsb') return `https://read.lsbible.org/?q=${encoded}`;
  if (currentVersion === 'esv') return `https://esv.literalword.com/?q=${encoded}`;
  return `https://www.literalword.com/?q=${encoded}`;
};

const formatBibleReference = (str) => {
  if (!str) return "";
  let formatted = str.trim();
  formatted = formatted.replace(/([,;])(?!\s)/g, "$1 ");
  formatted = formatted.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
  formatted = formatted.replace(/(\d+)([A-Za-z]+)/g, "$1 $2");
  return formatted
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export default function useUpdateCustomSchedule({
  currentVersion,
  setSchedule,
  setCustomSchedule,
  setIsCustomSchedule,
  setCustomProgressMap,
  setItem,
  updateUserData,
  currentUser,
}) {
  const oldCustomScheduleRef = useRef(null);

  const updateCustomSchedule = (customPlanText, forceUpdate = false, clearProgress = false) => {
    const lines = customPlanText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '');
      
    if (lines.length < 1 || lines.length > 2000) {
      alert('Please enter between 1 and 2000 lines for your custom plan.');
      return;
    }
    
    const fullCustomSchedule = lines.map((line, index) => {
      const formattedLine = formatBibleReference(line);
      return { 
        day: index + 1, 
        passages: formattedLine, 
        url: buildUrl(formattedLine, currentVersion) 
      };
    });
    
    // Skip update if unchanged.
    if (!forceUpdate && oldCustomScheduleRef.current && isEqual(oldCustomScheduleRef.current, fullCustomSchedule)) {
      console.log('[useUpdateCustomSchedule] Custom schedule is unchanged. Skipping update.');
      return;
    }
    oldCustomScheduleRef.current = fullCustomSchedule;
    
    // Update state and local storage.
    setCustomSchedule(fullCustomSchedule);
    setIsCustomSchedule(true);
    setItem('isCustomSchedule', true);
    if (clearProgress) {
      setCustomProgressMap({});
      setItem('customProgressMap', {});
    }
    setItem('customSchedule', fullCustomSchedule);
    
    // Save to Firestore if applicable.
    if (currentUser) {
      const updateData = {
        customSchedule: fullCustomSchedule.map(({ day, passages }) => ({ day, passages })),
        isCustomSchedule: true,
      };
      if (clearProgress) {
        updateData.customProgress = {};
      }
      updateUserData(currentUser.uid, updateData)
        .then(() => console.log('[useUpdateCustomSchedule] Custom schedule saved to Firestore'))
        .catch(error =>
          console.error('[useUpdateCustomSchedule] Error saving custom schedule:', error)
        );
    }
    
    // Also update the main schedule state.
    setSchedule(fullCustomSchedule);
  };

  return updateCustomSchedule;
}
