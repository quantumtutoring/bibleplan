// utils/generateSchedule.js

/**
 * Generates a Bible reading schedule.
 *
 * This function takes an array of Bible books (each with a name and chapter count),
 * the number of chapters to read per day, the total number of days for the schedule,
 * and a flag indicating whether to cycle through the books if they are exhausted.
 *
 * @param {Array} books - Array of book objects (e.g., { name: "Gen", chapters: 50 }).
 * @param {number} chaptersPerDay - The number of chapters to read per day.
 * @param {number} totalDays - The total number of days to generate a schedule for.
 * @param {boolean} cycle - If true, the schedule will restart from the first book when all books are exhausted.
 * @returns {Array} An array of strings where each string represents a day’s reading plan.
 */
export function generateSchedule(books, chaptersPerDay, totalDays, cycle) {
    const scheduleArr = [];
    let bookIndex = 0;
    let chapter = 1;
  
    for (let day = 1; day <= totalDays; day++) {
      const dailyPlan = [];
      let remaining = chaptersPerDay;
  
      while (remaining > 0) {
        // If we've gone past the last book, optionally cycle back to the first book.
        if (bookIndex >= books.length) {
          if (cycle) {
            bookIndex = 0;
            chapter = 1;
          } else {
            break;
          }
        }
  
        const currentBook = books[bookIndex];
        const availableChapters = currentBook.chapters - chapter + 1;
  
        if (availableChapters <= remaining) {
          // Use all remaining chapters from the current book.
          dailyPlan.push(
            availableChapters === 1
              ? `${currentBook.name} ${chapter}`
              : `${currentBook.name} ${chapter}-${currentBook.chapters}`
          );
          remaining -= availableChapters;
          bookIndex++;
          chapter = 1;
        } else {
          // Only part of the current book is needed.
          const endChapter = chapter + remaining - 1;
          dailyPlan.push(
            remaining === 1
              ? `${currentBook.name} ${chapter}`
              : `${currentBook.name} ${chapter}-${endChapter}`
          );
          chapter = endChapter + 1;
          remaining = 0;
        }
      }
  
      scheduleArr.push(dailyPlan.join(', '));
    }
  
    return scheduleArr;
  }
  