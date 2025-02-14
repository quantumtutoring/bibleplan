// hooks/useUpdateDefaultSchedule.js
import { useRef } from 'react';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { generateSchedule } from '../utils/generateSchedule';

// Reuse the same buildUrl function.
const buildUrl = (passages, currentVersion) => {
  const encoded = encodeURIComponent(passages);
  if (currentVersion === 'lsb') return `https://read.lsbible.org/?q=${encoded}`;
  if (currentVersion === 'esv') return `https://esv.literalword.com/?q=${encoded}`;
  return `https://www.literalword.com/?q=${encoded}`;
};

export default function useUpdateDefaultSchedule({
  currentVersion,
  setSchedule,
  setDefaultProgressMap,
  setItem,
  updateUserData,
  currentUser,
}) {
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  const updateDefaultSchedule = (otChapters, ntChapters, fromInit = false, forceUpdate = false, clearProgress = false) => {
    const otNum = parseInt(otChapters, 10);
    const ntNum = parseInt(ntChapters, 10);
    
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

    // Skip update if settings haven't changed.
    if (
      !forceUpdate &&
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[useUpdateDefaultSchedule] Default settings unchanged; schedule remains the same.');
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
      newSchedule.push({ 
        day, 
        passages: linkText, 
        url: buildUrl(linkText, currentVersion) 
      });
    }
    
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
        .then(() => console.log('[useUpdateDefaultSchedule] Default settings saved to Firestore'))
        .catch(error => console.error('[useUpdateDefaultSchedule] Error saving default settings:', error));
    }
  };

  return updateDefaultSchedule;
}
