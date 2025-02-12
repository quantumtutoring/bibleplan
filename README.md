# Bible Reading Planner

A Next.js/React Bible Reading Planner app that generates daily Bible reading schedules based on user-defined chapter counts for both the Old and New Testaments, integrates with Firebase for user authentication and progress storage, and allows exporting the schedule to Excel—with support for multiple Bible translations: **NASB** (default), **ESV**, and **LSB**.

## Features

- **Bible Version Selection:** Choose from NASB, LSB, or ESV.
- **Schedule Generation:** Create a reading schedule based on the number of chapters per day.
- **User Authentication:** Sign in using email/password or Google authentication.
- **Firestore Integration:** Store and retrieve user settings and reading progress in real time.
- **Excel Export:** Export your reading schedule and progress to an Excel file.
- **Responsive Design:** Built with Next.js and React for a modern, responsive interface.

## Technologies Used

- **Next.js & React:** For building the application and managing routing.
- **Firebase:** For authentication and Firestore as the backend database.
- **ExcelJS & File-Saver:** For generating and downloading Excel files.
- **CSS Modules:** For scoped and maintainable component styling.
- **Lodash.debounce:** For debouncing operations (e.g., Firestore writes).

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
```plaintext
/ (project root)
├── components
│   ├── Header.js              // Displays user authentication info (email, sign‑in/sign‑out controls)
│   ├── ControlsPanel.js       // Contains Bible version selector, chapter input controls, and action buttons (generate schedule, export Excel)
│   ├── ScheduleTable.js       // Renders the reading schedule table with checkboxes for tracking progress
│   └── PlanComponent.js       // Main planner component that orchestrates UI, schedule generation, and Excel export
├── contexts
│   └── UserDataContext.js     // Provides a React context to supply user authentication and Firestore data across the app
├── data
│   └── bibleBooks.js          // Exports OT_BOOKS and NT_BOOKS arrays with Bible books and chapter counts
├── hooks
│   └── useUserData.js         // Custom hook that sets up Firebase authentication and real‑time Firestore listeners
├── lib
│   └── firebase.js            // Firebase configuration and initialization (auth, Firestore, etc.)
├── pages
│   ├── _app.js                // Custom App component that wraps the application with UserDataProvider
│   ├── index.js               // Landing/routing page that directs users based on their saved Bible version
│   ├── signin.js              // Sign‑in page handling email/password, Google sign‑in, and password reset
│   ├── esv.js                 // Renders PlanComponent for the ESV Bible version
│   ├── lsb.js                 // Renders PlanComponent for the LSB Bible version
│   └── nasb.js                // Renders PlanComponent for the NASB Bible version
└── styles
    ├── globals.css            // Global CSS styles and variables
    ├── Home.module.css        // Styles for PlanComponent, ControlsPanel, and ScheduleTable
    └── Signin.module.css      // Styles for the sign‑in page
```


## Usage

1. **Set Chapters Per Day:**  
   Adjust the input fields on the main planner page to specify the desired number of chapters for the Old Testament (OT) and New Testament (NT) per day.

2. **Generate Schedule:**  
   Click the "Update Schedule" button to create a new Bible reading plan. Changing the settings will automatically clear any previously stored progress.

3. **Track Your Progress:**  
   As you complete your daily readings, mark the corresponding checkboxes. You can use shift‑click to quickly mark multiple consecutive days as complete.

4. **Export Schedule:**  
   Click the "Export to Excel" button to download your current reading schedule and progress as an Excel file for offline reference or sharing.

5. **User Authentication:**  
   Sign in via the dedicated sign‑in page to save your progress in Firestore. If you are not signed in, your progress will be stored locally.

6. **Switch Bible Versions:**  
   Navigate to the following routes to switch between Bible translations:  
   - `/nasb` for the NASB version (default)  
   - `/esv` for the ESV version  
   - `/lsb` for the LSB version

## Deployment

You can deploy the Next.js app on popular platforms such as [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/), or any Node.js hosting provider.

## License

This project is open source and available under the [MIT License](LICENSE).
