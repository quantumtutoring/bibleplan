// hooks/useUpdateSchedule.js
import { useRef } from 'react';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { generateSchedule } from '../utils/generateSchedule';

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

  const updateSchedule = (
    scheduleOrOt,
    nt,
    fromInit = false,
    forceUpdate = false,
    clearProgress = false
  ) => {
    // Custom schedule branch.
    if (Array.isArray(scheduleOrOt)) {
      console.log('[useUpdateSchedule] Custom schedule provided.');
      const fullCustomSchedule = scheduleOrOt.map(item => {
        let newUrl;
        if (currentVersion === 'lsb') {
          newUrl = `https://read.lsbible.org/?q=${encodeURIComponent(item.passages)}`;
        } else if (currentVersion === 'esv') {
          newUrl = `https://esv.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        } else {
          newUrl = `https://www.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        }
        return { ...item, url: newUrl };
      });
      const strippedCustomSchedule = fullCustomSchedule.map(({ day, passages }) => ({
        day,
        passages,
      }));
      setCustomSchedule(fullCustomSchedule);
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
      if (clearProgress) {
        setCustomProgressMap({});
        setItem('customProgressMap', {});
      }
      setItem('customSchedule', fullCustomSchedule);
      if (currentUser) {
        const updateData = { customSchedule: strippedCustomSchedule, isCustomSchedule: true };
        if (clearProgress) {
          updateData.customProgress = {};
        }
        updateUserData(currentUser.uid, updateData)
          .then(() =>
            console.log('[useUpdateSchedule] Custom schedule saved to Firestore without URLs')
          )
          .catch(error =>
            console.error('[useUpdateSchedule] Error saving custom schedule:', error)
          );
      }
      setSchedule(fullCustomSchedule);
      return;
    }

    // Default schedule branch.
    const otNum = parseInt(scheduleOrOt, 10);
    const ntNum = parseInt(nt, 10);
    if (
      isNaN(otNum) ||
      otNum < 1 ||
      otNum > 100 ||
      isNaN(ntNum) ||
      ntNum < 1 ||
      ntNum > 100
    ) {
      alert(
        'Please enter a valid number between 1 and 100 for both OT and NT chapters per day.'
      );
      return;
    }
    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);
    if (
      !forceUpdate &&
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[useUpdateSchedule] Settings unchanged; schedule remains the same.');
      return;
    }
    console.log(
      '[useUpdateSchedule] Updating default schedule' +
        (clearProgress ? ' with cleared progress.' : '.')
    );
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    let otSchedule = [];
    let ntSchedule = [];
    try {
      otSchedule = generateSchedule(OT_BOOKS, otNum, totalDays, otDays < totalDays);
      ntSchedule = generateSchedule(NT_BOOKS, ntNum, totalDays, ntDays < totalDays);
    } catch (error) {
      console.error('Error generating schedule:', error);
      otSchedule = [];
      ntSchedule = [];
    }
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = (otSchedule[day - 1] || '') + '';
      const ntText = (ntSchedule[day - 1] || '') + '';
      let url;
      if (currentVersion === 'lsb') {
        url = `https://read.lsbible.org/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      } else if (currentVersion === 'esv') {
        url = `https://esv.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      } else {
        url = `https://www.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      }
      const linkText = `${otText}, ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
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
        settings: { otChapters: otNum, ntChapters: ntNum },
        isCustomSchedule: false,
      };
      if (clearProgress) {
        updateData.defaultProgress = {};
      }
      updateUserData(currentUser.uid, updateData)
        .then(() => console.log('[useUpdateSchedule] Default settings saved to Firestore'))
        .catch(error => console.error('[useUpdateSchedule] Error saving default settings:', error));
    }
  };

  return updateSchedule;
}
