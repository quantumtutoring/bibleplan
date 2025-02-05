# Bible Reading Plan

A Next.js/React Bible Reading Plan app that generates daily Bible reading schedules based on user-defined chapters per day for both the Old and New Testaments, integrates with Firebase for user authentication and progress storage, supports shift‑click multi‑selection, and allows exporting the schedule to Excel.

## Features

- **Schedule Generation:**  
  Automatically creates a daily reading schedule for the Bible based on user inputs (OT and NT chapters per day).

- **Persistent Progress:**  
  Checkboxes track reading progress and persist across page reloads using localStorage (and Firestore for signed‑in users).

- **Shift‑Click Support:**  
  Easily mark multiple days as complete by holding shift and clicking checkboxes.

- **Excel Export:**  
  Export your reading schedule and progress to an Excel file using ExcelJS and FileSaver.

- **Firebase Integration:**  
  Manage user authentication and sync user progress/settings via Firebase.

- **Input Validation:**  
  Enforces that chapters per day can only be integers between 1 and 100.

## Technologies

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [ExcelJS](https://www.npmjs.com/package/exceljs)
- [FileSaver](https://www.npmjs.com/package/file-saver)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/bible-reading-plan.git
   cd bible-reading-plan
