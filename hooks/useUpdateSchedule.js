// hooks/useUpdateSchedule.js
import { useRef } from 'react';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { generateSchedule } from '../utils/generateSchedule';
import isEqual from 'lodash.isequal';

export default function useUpdateSchedule({
  currentVersion,
  setSchedule,
  setCustomSchedule,
  setIsCustomSchedule,
  setDefaultProgressMap,
  setCustomProgressMap,
  setItem,
  updateUserData,
  currentUser,
}) {
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });
  const oldCustomScheduleRef = useRef(null);

  // Helper to build URL based on the current version.
  const buildUrl = (passages) => {
    const encoded = encodeURIComponent(passages);
    if (currentVersion === 'lsb') return `https://read.lsbible.org/?q=${encoded}`;
    if (currentVersion === 'esv') return `https://esv.literalword.com/?q=${encoded}`;
    return `https://www.literalword.com/?q=${encoded}`;
  };

  // Helper to format a Bible reference string.
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

  /**
   * updateScheduleFn handles both custom and default schedule updates.
   *
   * For a default schedule, call as:
   *    updateSchedule(otChapters, ntChapters, fromInit, forceUpdate, clearProgress, false)
   *
   * For a custom schedule, call as:
   *    updateSchedule(customPlanText, undefined, fromInit, forceUpdate, clearProgress, true)
   * where the 6th parameter (isCustom) is true.
   */
  const updateScheduleFn = (
    scheduleOrOt,
    nt,
    fromInit = false,
    forceUpdate = false,
    clearProgress = false,
    isCustom = false
  ) => {
    if (isCustom) {
      // --- Custom Schedule Branch ---
      const customPlanText = scheduleOrOt; // expecting a single string (textarea content)
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
        return { day: index + 1, passages: formattedLine, url: buildUrl(formattedLine) };
      });
      // Skip update if the custom schedule is unchanged.
      if (!forceUpdate && oldCustomScheduleRef.current && isEqual(oldCustomScheduleRef.current, fullCustomSchedule)) {
        console.log('[useUpdateSchedule] Custom schedule is unchanged. Skipping update.');
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
          .then(() =>
            console.log('[useUpdateSchedule] Custom schedule saved to Firestore')
          )
          .catch(error =>
            console.error('[useUpdateSchedule] Error saving custom schedule:', error)
          );
      }
      // Also update the main schedule state.
      setSchedule(fullCustomSchedule);
      return;
    }

    // --- Default Schedule Branch ---
    const otNum = parseInt(scheduleOrOt, 10);
    const ntNum = parseInt(nt, 10);
    if (
      isNaN(otNum) || otNum < 1 || otNum > 100 ||
      isNaN(ntNum) || ntNum < 1 || ntNum > 100
    ) {
      alert('Please enter a valid number between 1 and 100 for both OT and NT chapters per day.');
      return;
    }
    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    // Skip update if settings haven't changed (unless forced).
    if (
      !forceUpdate &&
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[useUpdateSchedule] Default settings unchanged; schedule remains the same.');
      return;
    }
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    let otSchedule = [];
    let ntSchedule = [];
    try {
      otSchedule = generateSchedule(OT_BOOKS, otNum, totalDays, otDays < totalDays);
      ntSchedule = generateSchedule(NT_BOOKS, ntNum, totalDays, ntDays < totalDays);
    } catch (error) {
      console.error('Error generating schedule:', error);
    }
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1] || '';
      const ntText = ntSchedule[day - 1] || '';
      const linkText = `${otText}, ${ntText}`;
      newSchedule.push({ day, passages: linkText, url: buildUrl(linkText) });
    }
    setIsCustomSchedule(false);
    setItem('isCustomSchedule', false);
    if (clearProgress) {
      setDefaultProgressMap({});
      setItem('progressMap', {});
    }
    setSchedule(newSchedule);
    if (currentUser) {
      const updateData = {
        settings: { otChapters: String(otNum), ntChapters: String(ntNum) },
        isCustomSchedule: false,
      };
      if (clearProgress) updateData.defaultProgress = {};
      updateUserData(currentUser.uid, updateData)
        .then(() => console.log('[useUpdateSchedule] Default settings saved to Firestore'))
        .catch(error => console.error('[useUpdateSchedule] Error saving default settings:', error));
    }
  };

  return updateScheduleFn;
}
