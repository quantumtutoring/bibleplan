import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import { generateSchedule } from './generateSchedule';

/**
 * Generates a reading schedule and progress map based on Firestore values.
 *
 * @param {string} otChapters - The number of Old Testament chapters per day (stored as a string).
 * @param {string} ntChapters - The number of New Testament chapters per day (stored as a string).
 * @param {object} defaultProgress - An object mapping day numbers to completion status.
 * @param {string} version - Bible version ("nasb", "esv", "lsb") to generate appropriate URLs.
 * @returns {object} An object containing the generated `schedule` and `progressMap`.
 */
export function generateScheduleFromFirestore(otChapters, ntChapters, defaultProgress, version) {
  // Ensure defaultProgress is an object.
  defaultProgress = defaultProgress || {};

  // Convert OT and NT chapters to numbers.
  const otNum = parseInt(otChapters, 10);
  const ntNum = parseInt(ntChapters, 10);

  // Validate chapter numbers.
  if (isNaN(otNum) || otNum < 1 || otNum > 2000) {
    throw new Error("Invalid OT chapter number. It must be between 1 and 2000.");
  }
  if (isNaN(ntNum) || ntNum < 1 || ntNum > 2000) {
    throw new Error("Invalid NT chapter number. It must be between 1 and 2000.");
  }

  // Constants for total chapters.
  const totalOT = 929;
  const totalNT = 260;

  // Determine the number of days needed for each testament.
  const otDays = Math.ceil(totalOT / otNum);
  const ntDays = Math.ceil(totalNT / ntNum);
  const totalDays = Math.max(otDays, ntDays);

  // Generate reading schedules for OT and NT.
  const otSchedule = generateSchedule(OT_BOOKS, otNum, totalDays, otDays < totalDays);
  const ntSchedule = generateSchedule(NT_BOOKS, ntNum, totalDays, ntDays < totalDays);

  // Construct the final schedule.
  const schedule = [];
  for (let day = 1; day <= totalDays; day++) {
    const otText = (otSchedule[day - 1] || '') + '';
    const ntText = (ntSchedule[day - 1] || '') + '';

    // Generate appropriate URL based on selected Bible version.
    let url;
    if (version === 'lsb') {
      url = `https://read.lsbible.org/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
    } else if (version === 'esv') {
      url = `https://esv.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
    } else {
      url = `https://www.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
    }

    const linkText = `${otText}, ${ntText}`;
    schedule.push({ day, passages: linkText, url });
  }

  // Ensure progressMap includes every day from the generated schedule.
  // For any missing day, default it to false.
  const progressMap = { ...defaultProgress };
  for (let day = 1; day <= totalDays; day++) {
    if (!(day in progressMap)) {
      progressMap[day] = false;
    }
  }

  return { schedule, progressMap };
}
