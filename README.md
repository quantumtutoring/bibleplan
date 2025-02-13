# Bible Reading Planner

A Next.js/React Bible Reading Planner app that generates daily Bible reading schedules based on user-defined chapter counts for both the Old and New Testaments, integrates with Firebase for user authentication and progress storage, and allows exporting the schedule to Excel—with support for multiple Bible translations: **NASB** (default), **ESV**, and **LSB**.

## Features

- **Bible Version Selection:** Choose from NASB, LSB, or ESV.
- **Schedule Generation:** Create a reading schedule based on the number of chapters per day.
- **User Authentication:** Sign in using email/password or Google authentication.
- **Firestore Integration:** Store and retrieve user settings and reading progress in real time. (Firestore is treated as the source of truth.)
- **Excel Export:** Export your reading schedule and progress to an Excel file.
- **Responsive Design:** Built with Next.js and React for a modern, responsive interface.
- **Custom Planner Mode:** In addition to the default schedule generated from your OT/NT chapter settings, you can switch to Custom Planner mode. In this mode, you can enter your own daily reading passages via a text field (one day per line).

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
│   ├── ControlsPanel.js       // Contains Bible version selector, chapter input controls, custom plan text field (for custom mode), and buttons (generate schedule, export Excel)
│   ├── ScheduleTable.js       // Renders the generated reading schedule in a table with checkboxes for tracking progress
│   └── PlanComponent.js       // Main planner component that orchestrates UI, schedule generation, and Excel export
│
├── contexts/               
│   └── ListenFireStore.js     // Provides a React context for user authentication and Firestore data across the app
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

## License

This project is open source and available under the [MIT License](LICENSE).
