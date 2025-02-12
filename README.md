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

## Project Structure
```plaintext
/ (project root)
├── components/             
│   ├── Header.js              // Displays user info (e.g., email, sign‑in/sign‑out controls)
│   ├── ControlsPanel.js       // Contains Bible version selector, chapter input controls, and buttons (generate schedule, export Excel)
│   ├── ScheduleTable.js       // Renders the generated reading schedule in a table with checkboxes for tracking progress
│   └── PlanComponent.js       // Main planner component that orchestrates UI, schedule generation, and Excel export
│
├── contexts/               
│   └── UserDataContext.js     // Provides a React context for user authentication and Firestore data across the app
│
├── data/                    
│   └── bibleBooks.js          // Exports OT_BOOKS and NT_BOOKS arrays containing Bible books and chapter counts
│
├── hooks/                  
│   ├── useLocalStorage.js     // Custom hook that abstracts localStorage interactions (getItem, setItem, removeItem, clear)
│   ├── useUserData.js         // Custom hook that sets up Firebase authentication and Firestore snapshot listeners
│   └── useUserDataSync.js     // Unified hook that centralizes all Firestore write operations for the user’s document
│
├── lib/                    
│   └── firebase.js            // Firebase configuration and initialization (auth, Firestore, etc.)
│
├── pages/                  
│   ├── _app.js                // Custom App component that wraps all pages with the UserDataProvider
│   ├── index.js               // Landing/routing page that checks for a saved Bible version and redirects accordingly
│   ├── signin.js              // Sign‑in page that handles email/password, Google sign‑in, and password reset
│   ├── esv.js                 // Renders PlanComponent for the ESV Bible version
│   ├── lsb.js                 // Renders PlanComponent for the LSB Bible version
│   └── nasb.js                // Renders PlanComponent for the NASB Bible version
│
├── styles/                 
│   ├── globals.css            // Global CSS styles and variables
│   ├── Home.module.css        // Styles for PlanComponent, ControlsPanel, and ScheduleTable
│   └── Signin.module.css      // Styles for the sign‑in page
│
└── utils/                  
    ├── exportExcel.js         // Helper module to export the generated schedule into an Excel file
    └── generateSchedule.js    // Function to generate a Bible reading schedule based on books, chapters per day, etc.
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
