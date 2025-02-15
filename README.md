# Bible Reading Planner

A Next.js/React Bible Reading Planner app that generates daily Bible reading schedules based on user-defined chapter counts for both the Old and New Testaments. The app integrates with Firebase for user authentication and progress storage, supports multiple Bible translations (**NASB** (default), **ESV**, and **LSB**), and allows users to export their schedule to Excel. Additionally, you can switch between a Default Planner mode and a Custom Planner mode.

## Features

- **Bible Version Selection:**  
  Choose from NASB (default), LSB, or ESV.

- **Schedule Generation:**  
  Generate a daily reading schedule based on your specified chapter counts for the OT and NT.

- **Custom Planner Mode:**  
  Switch to a custom mode to enter your own daily Bible passages (one per line) and generate a personalized schedule.

- **Progress Tracking:**  
  Mark each day as “done” with checkboxes.
  - When signed in, progress is stored in Firestore with debounced updates to minimize writes.
  - When signed out, progress is stored locally in localStorage.

- **User Authentication:**  
  Sign up, sign in (with email/password or Google), and sign out.
  - Upon sign in, user settings (Bible version, chapter counts, progress) are loaded from Firestore.
  - On sign out, the app resets to default values as if you were visiting for the first time.

- **Excel Export:**  
  Export your generated schedule and progress to an Excel file.

- **Debounced Firestore Updates:**  
  Checkbox changes are debounced (300ms delay) so that rapid clicks are batched and Firestore writes are minimized.

## Technologies Used

- **Next.js & React:** For building the application and managing routing.
- **Firebase:** For authentication and Firestore as the backend database (Firestore serves as the source of truth for signed-in users).
- **Local Storage:** For storing default settings and progress when signed out.
- **Lodash.debounce:** For debouncing Firestore update operations.
- **ExcelJS & File-Saver:** For generating and downloading Excel files.
- **CSS Modules:** For scoped and maintainable styling.

## Project Structure

```plaintext
/ (project root)
├── components/             
│   ├── Header.js              // Displays user info and sign-in/sign-out controls.
│   ├── ControlsPanel.js       // Contains Bible version selector, chapter inputs, custom plan text field, and buttons (generate, export).
│   ├── ScheduleTable.js       // Renders the generated reading schedule in a table with checkboxes for progress.
│   ├── PlanComponent.js       // Main planner component that orchestrates UI, schedule generation, and Excel export.
│   ├── DefaultPlan.js         // Default Planner: Generates and displays a schedule based on OT/NT chapter settings.
│   └── CustomPlan.js          // Custom Planner: Generates a schedule from user-provided daily Bible passages.
│
├── contexts/               
│   └── ListenFireStore.js     // Provides a React context for user authentication and Firestore data.
│
├── data/                    
│   └── bibleBooks.js          // Exports OT_BOOKS and NT_BOOKS arrays containing Bible books and chapter counts.
│
├── hooks/                  
│   ├── useLocalStorage.js     // Custom hook that abstracts localStorage operations (get, set, remove, clear).
│   ├── writeFireStore.js      // Centralized Firestore write operations for updating user documents.
│   ├── useSignOut.js          // Custom hook that handles user sign-out and resets app state.
│   ├── useUpdateCustomSchedule.js   // Hook to update the custom schedule and progress in Firestore.
│   └── useUpdateDefaultSchedule.js  // Hook to update the default schedule and progress in Firestore.
│   └── useDebouncedCheckbox.js // Custom hook to handle debounced checkbox updates.
│
├── lib/                    
│   └── firebase.js            // Firebase configuration and initialization (auth, Firestore, etc.).
│
├── pages/                  
│   ├── _app.js                // Custom App component that wraps pages with providers (e.g., ListenFireStore).
│   ├── index.js               // Landing page that checks stored settings and redirects accordingly.
│   ├── signin.js              // Sign-in page for email/password, Google sign-in, and password reset.
│   ├── esv.js                 // Renders PlanComponent for the ESV Bible version.
│   ├── lsb.js                 // Renders PlanComponent for the LSB Bible version.
│   └── nasb.js                // Renders PlanComponent for the NASB Bible version.
│
├── styles/                 
│   ├── globals.css            // Global CSS styles and variables.
│   ├── Home.module.css        // Styles for PlanComponent, ControlsPanel, ScheduleTable, etc.
│   └── Signin.module.css      // Styles for the sign-in page.
│
└── utils/                  
    ├── exportExcel.js         // Helper module to export the reading schedule into an Excel file.
    └── generateScheduleFromFirestore.js // Function to generate a Bible reading schedule based on inputs.
```

## License

This project is open source and available under the [MIT License](LICENSE).
