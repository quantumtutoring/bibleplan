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
│   ├── ControlsPanel.js    
│   │   // Renders input controls (e.g., chapter settings, buttons) for the planner.
│   ├── Header.js           
│   │   // Displays the app header, user info, and sign‑out button.
│   ├── PlanComponent.js    
│   │   // The main Bible reading planner component. 
│   │   // Integrates schedule generation, progress updates, Firestore writes (via hooks),
│   │   // and localStorage (via useLocalStorage) to manage user settings and progress.
│   └── ScheduleTable.js    
│       // Renders the reading schedule in a table format with checkboxes for progress.
│
├── contexts/               
│   └── UserDataContext.js  
│       // Provides a centralized context for user data (current user, Firestore data, loading state).
│       // Ensures only one real-time snapshot listener is attached to the user's Firestore document.
│
├── hooks/                  
│   ├── useLocalStorage.js  
│   │   // Custom hook that abstracts localStorage interactions (getItem, setItem, removeItem, clear).
│   ├── useUserData.js      
│   │   // Sets up a real-time listener (onSnapshot) to fetch user data from Firestore.
│   └── useUserDataSync.js  
│       // Unified hook that centralizes all Firestore write operations for the user’s document.
│       // Handles writes for version updates, settings/progress updates, and sign‑up data population.
│
├── lib/                    
│   └── firebase.js         
│       // Initializes Firebase and exports configured instances (auth, db, etc.) for use throughout the app.
│
├── pages/                  
│   ├── _app.js             
│   │   // The top-level Next.js component that wraps all pages with providers (e.g., UserDataProvider).
│   ├── index.js            
│   │   // The landing/routing page that checks authentication and stored Bible version.
│   │   // Routes signed‑in users using Firestore data and guest users using localStorage (via useLocalStorage).
│   └── signin.js           
│       // Handles user authentication (sign‑in, sign‑up, password reset, Google sign‑in).
│       // Uses the unified Firestore write hook to update new user data.
│
├── styles/                 
│   └── globals.css         
│       // Global CSS styles applied to the entire application.
│
└── utils/                  
    ├── exportExcel.js      
    │   // Helper module to export the generated schedule into an Excel file.
    └── generateSchedule.js 
        // Contains the function to generate a Bible reading schedule based on the list of books,
        // chapters per day, total days, and whether to cycle through books.
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
