# Bible Reading Planner

A Next.js/React Bible Reading Planner app that generates daily Bible reading schedules based on user-defined chapters per day for both the Old and New Testaments, integrates with Firebase for user authentication and progress storage, supports shift‑click multi‑selection, and allows exporting the schedule to Excel. The app now supports multiple Bible translations: **NASB** (default), **ESV**, and **LSB**.

## Features

- **Schedule Generation:**  
  Automatically creates a daily reading schedule for the Bible based on user inputs (OT and NT chapters per day).

- **Multiple Bible Versions:**  
  Choose from NASB (default), ESV, or LSB versions. The application provides separate pages for ESV and LSB (`/pages/esv.js` and `/pages/lsb.js` respectively), while the NASB version is available on the main page (`/pages/index.js`).

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
   git clone https://github.com/quantumtutoring/bibleplan.git  
   cd bibleplan

2. **Install dependencies:**
   ```bash
   npm install  
   or  
   yarn install
   ```

3. **Set up Firebase:**

   - Create a Firebase project at https://console.firebase.google.com/.
   - In the lib/firebase.js file, configure your Firebase credentials (apiKey, authDomain, projectId, etc.).

4. **Run the development server:**
   ```bash
   npm run dev  
   or  
   yarn dev
   ```

   Open http://localhost:3000 in your browser.

## Project Structure
```pgsql
bible-plan/
├── components/
│   └── PlanComponent.js      (Logic and formatting for the Bible Reading Planner pages)
├── lib/
│   └── firebase.js       (Firebase initialization and configuration)
├── pages/
│   ├── _app.js           (Global App wrapper, imports global CSS, providers, etc.)
│   ├── index.js          (Default NASB Bible Reading Planner page)
│   ├── esv.js            (ESV Bible Reading Planner page)
│   ├── lsb.js            (LSB Bible Reading Planner page)
│   └── signin.js         (Sign-in page)
├── public/
│   └── favicon.svg       (Favicon)
├── styles/
│   ├── globals.css       (Global CSS styles)
│   ├── Home.module.css   (Styles for the index page)
│   └── Signin.module.css (Styles for the sign-in page)
├── package.json
└── README.md

```


## Usage

1. **Set Chapters/Day:**  
   Use the input fields on the main page to set the number of OT and NT chapters per day (values must be between 1 and 100).

2. **Update Schedule:**  
   Click "Update Schedule" to generate a new Bible reading plan. If the settings have changed, the app clears the stored progress.

3. **Mark Progress:**  
   Check the boxes for each day as you complete the readings. Use shift‑click to mark multiple days at once.

4. **Export to Excel:**  
   Click "Export to Excel" to download your reading schedule and progress in an Excel file.

5. **Authentication:**  
   Sign in using the provided sign‑in page to save your progress in Firestore; unsigned progress is stored locally.

6. **Switch Bible Versions:**  
   Navigate to / for the NASB version (default), /esv for the ESV version, or /lsb for the LSB version.

## Deployment

You can deploy the Next.js app on popular platforms such as [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/), or any Node.js hosting provider.

## License

This project is open source and available under the [MIT License](LICENSE).
