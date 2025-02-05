// pages/index.js
// Import necessary React hooks for state and lifecycle management.
import { useState, useEffect, useRef } from "react";
// Import Next.js components for managing document head and routing.
import Head from "next/head";
import Link from "next/link";
// Import CSS module styles specific to this page.
import styles from "../styles/Home.module.css";
// Import the npm package FileSaver (saveAs function) for exporting Excel files.
import { saveAs } from "file-saver"; 

// Import Firebase configuration and modules (firebase, authentication, and Firestore database).
import { firebase, auth, db } from "../lib/firebase";

export default function Home() {
  // ----------------------------
  // Component State Initialization
  // ----------------------------
  // otChapters and ntChapters hold the user input for chapters per day.
  const [otChapters, setOtChapters] = useState(3);
  const [ntChapters, setNtChapters] = useState(2);
  // schedule holds the generated reading schedule.
  const [schedule, setSchedule] = useState([]);
  // progressMap tracks which days have been checked off.
  const [progressMap, setProgressMap] = useState({});
  // currentUser holds the Firebase authenticated user (if any).
  const [currentUser, setCurrentUser] = useState(null);

  // ----------------------------
  // Refs for Persistent Variables
  // ----------------------------
  // lastCheckedRef is used to track the last checkbox clicked (for shift-click functionality).
  const lastCheckedRef = useRef(null);
  // oldSettingsRef stores the last saved input settings (OT, NT, totalDays) to detect changes.
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  // ----------------------------
  // Firebase Authentication & Data Loading
  // ----------------------------
  useEffect(() => {
    // Listen for changes in authentication state.
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If a user is signed in, store the user and load their data from Firestore.
        setCurrentUser(user);
        loadUserData(user);
      } else {
        // Otherwise, clear currentUser and load data from localStorage.
        setCurrentUser(null);
        loadLocalSettings();
      }
    });

    // Fallback in case the auth state isn't determined quickly.
    const timeoutId = setTimeout(() => {
      if (!currentUser) {
        loadLocalSettings();
      }
    }, 1000);

    // Cleanup: unsubscribe from auth listener and clear the timeout.
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----------------------------
  // Load Settings & Progress for Unsigned Users
  // ----------------------------
  const loadLocalSettings = () => {
    // Get stored chapter values from localStorage.
    const storedOT = localStorage.getItem("otChapters");
    const storedNT = localStorage.getItem("ntChapters");
    if (storedOT) {
      setOtChapters(parseInt(storedOT, 10));
    }
    if (storedNT) {
      setNtChapters(parseInt(storedNT, 10));
    }
    // Retrieve saved progress if available.
    const storedProgress = localStorage.getItem("progressMap");
    if (storedProgress) {
      setProgressMap(JSON.parse(storedProgress));
    }
    // Generate schedule without clearing progress since this is an initial load.
    updateSchedule(
      parseInt(storedOT, 10) || otChapters,
      parseInt(storedNT, 10) || ntChapters,
      true // fromInit flag is true during initial load.
    );
  };

  // ----------------------------
  // Load User Data from Firestore
  // ----------------------------
  const loadUserData = (user) => {
    // Retrieve the user's document from Firestore.
    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          // If settings exist, update the component state and localStorage.
          if (data.settings) {
            if (data.settings.otChapters) {
              setOtChapters(data.settings.otChapters);
            }
            if (data.settings.ntChapters) {
              setNtChapters(data.settings.ntChapters);
            }
            localStorage.setItem("otChapters", data.settings.otChapters);
            localStorage.setItem("ntChapters", data.settings.ntChapters);
          }
          // Merge local progress (if any) with progress stored in Firestore.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr ? JSON.parse(localProgressStr) : {};
          const mergedProgress = { ...localProgress, ...(data.progress || {}) };
          setProgressMap(mergedProgress);
          // Update Firestore with the merged progress.
          db.collection("users")
            .doc(user.uid)
            .set({ progress: mergedProgress }, { merge: true });
          // Update schedule without clearing progress.
          updateSchedule(
            data.settings?.otChapters || otChapters,
            data.settings?.ntChapters || ntChapters,
            true
          );
        } else {
          // If no user document exists, fall back to local progress.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr ? JSON.parse(localProgressStr) : {};
          setProgressMap(localProgress);
          db.collection("users")
            .doc(user.uid)
            .set({ progress: localProgress }, { merge: true });
          updateSchedule(otChapters, ntChapters, true);
        }
      })
      .catch((err) => {
        console.error("Error loading user data:", err);
      });
  };

  // ----------------------------
  // Save User Settings
  // ----------------------------
  // Save the user's chapter settings to localStorage and Firestore (if authenticated).
  const saveUserSettings = (ot, nt) => {
    localStorage.setItem("otChapters", ot);
    localStorage.setItem("ntChapters", nt);
    if (currentUser) {
      db.collection("users")
        .doc(currentUser.uid)
        .set({ settings: { otChapters: ot, ntChapters: nt } }, { merge: true })
        .catch((error) => console.error("Error saving settings:", error));
    }
  };

  // ----------------------------
  // Clear All Progress
  // ----------------------------
  // Clear progress from both localStorage and Firestore (if user is signed in).
  const clearAllProgress = () => {
    console.log("Clearing saved progress.");
    setProgressMap({});
    localStorage.removeItem("progressMap");
    // Remove individual checkbox keys.
    for (let i = 1; i < 1000; i++) {
      localStorage.removeItem("check-day-" + i);
    }
    if (currentUser) {
      db.collection("users")
        .doc(currentUser.uid)
        .set({ progress: {} }, { merge: true })
        .catch((error) =>
          console.error("Error clearing progress in Firestore:", error)
        );
    }
  };

  // ----------------------------
  // Update Schedule
  // ----------------------------
  // Generate a new schedule based on current OT and NT chapter settings.
  // If it's a user-initiated update (fromInit is false) and settings have changed, clear progress.
  const updateSchedule = (ot = otChapters, nt = ntChapters, fromInit = false) => {
    const otNum = parseInt(ot, 10);
    const ntNum = parseInt(nt, 10);
    // Validate input values.
    if (
      isNaN(otNum) ||
      otNum < 1 ||
      otNum > 100 ||
      isNaN(ntNum) ||
      ntNum < 1 ||
      ntNum > 100
    ) {
      alert("Please enter a valid number between 1 and 100 for both OT and NT chapters per day.");
      return;
    }
    // Save the current settings.
    saveUserSettings(otNum, ntNum);

    // Calculate total days based on total chapters in OT and NT.
    const totalOT = 929, totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    if (!fromInit) {
      // For user-initiated updates, check if settings have actually changed.
      if (
        oldSettingsRef.current.ot !== null &&
        oldSettingsRef.current.ot === otNum &&
        oldSettingsRef.current.nt === ntNum &&
        oldSettingsRef.current.total === totalDays
      ) {
        console.log("Settings unchanged; schedule remains the same.");
        return;
      } else {
        // Settings have changed: clear all progress.
        clearAllProgress();
      }
    }
    // Update the stored old settings.
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    // Bible books arrays for OT and NT.
    const otBooks = [
      { name: "Gen", chapters: 50 },
      { name: "Exod", chapters: 40 },
      { name: "Lev", chapters: 27 },
      { name: "Num", chapters: 36 },
      { name: "Deut", chapters: 34 },
      { name: "Josh", chapters: 24 },
      { name: "Judg", chapters: 21 },
      { name: "Ruth", chapters: 4 },
      { name: "1 Sam", chapters: 31 },
      { name: "2 Sam", chapters: 24 },
      { name: "1 Kgs", chapters: 22 },
      { name: "2 Kgs", chapters: 25 },
      { name: "1 Chr", chapters: 29 },
      { name: "2 Chr", chapters: 36 },
      { name: "Ezra", chapters: 10 },
      { name: "Neh", chapters: 13 },
      { name: "Est", chapters: 10 },
      { name: "Job", chapters: 42 },
      { name: "Ps", chapters: 150 },
      { name: "Prov", chapters: 31 },
      { name: "Eccl", chapters: 12 },
      { name: "Song", chapters: 8 },
      { name: "Isa", chapters: 66 },
      { name: "Jer", chapters: 52 },
      { name: "Lam", chapters: 5 },
      { name: "Ezek", chapters: 48 },
      { name: "Dan", chapters: 12 },
      { name: "Hos", chapters: 14 },
      { name: "Joel", chapters: 3 },
      { name: "Amos", chapters: 9 },
      { name: "Obad", chapters: 1 },
      { name: "Jonah", chapters: 4 },
      { name: "Mic", chapters: 7 },
      { name: "Nah", chapters: 3 },
      { name: "Hab", chapters: 3 },
      { name: "Zeph", chapters: 3 },
      { name: "Hag", chapters: 2 },
      { name: "Zech", chapters: 14 },
      { name: "Mal", chapters: 4 },
    ];
    const ntBooks = [
      { name: "Matt", chapters: 28 },
      { name: "Mark", chapters: 16 },
      { name: "Luke", chapters: 24 },
      { name: "John", chapters: 21 },
      { name: "Acts", chapters: 28 },
      { name: "Rom", chapters: 16 },
      { name: "1 Cor", chapters: 16 },
      { name: "2 Cor", chapters: 13 },
      { name: "Gal", chapters: 6 },
      { name: "Eph", chapters: 6 },
      { name: "Phil", chapters: 4 },
      { name: "Col", chapters: 4 },
      { name: "1 Thess", chapters: 5 },
      { name: "2 Thess", chapters: 3 },
      { name: "1 Tim", chapters: 6 },
      { name: "2 Tim", chapters: 4 },
      { name: "Titus", chapters: 3 },
      { name: "Philem", chapters: 1 },
      { name: "Heb", chapters: 13 },
      { name: "Jas", chapters: 5 },
      { name: "1 Pet", chapters: 5 },
      { name: "2 Pet", chapters: 3 },
      { name: "1 John", chapters: 5 },
      { name: "2 John", chapters: 1 },
      { name: "3 John", chapters: 1 },
      { name: "Jude", chapters: 1 },
      { name: "Rev", chapters: 22 },
    ];

    // Determine if the reading schedule should cycle through books.
    const otCycle = otDays < totalDays;
    const ntCycle = ntDays < totalDays;
    // Generate schedule arrays for OT and NT using legacy logic.
    const otSchedule = generateSchedule(otBooks, otNum, totalDays, otCycle);
    const ntSchedule = generateSchedule(ntBooks, ntNum, totalDays, ntCycle);

    // Build the schedule array from the OT and NT schedules.
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1];
      const ntText = ntSchedule[day - 1];
      // Prepare URL query by removing spaces.
      const otQuery = otText.replace(/\s/g, "");
      const ntQuery = ntText.replace(/\s/g, "");
      const url = `https://www.literalword.com/?q=${otQuery},${ntQuery}`;
      const linkText = `${otText} | ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }
    // Update the schedule state with the newly generated schedule.
    setSchedule(newSchedule);
  };

  // ----------------------------
  // Schedule Generator (Legacy Logic)
  // ----------------------------
  // This function generates an array of daily reading passages based on the provided books and chapters per day.
  const generateSchedule = (books, chaptersPerDay, totalDays, cycle) => {
    let scheduleArr = [];
    let bookIdx = 0, chapter = 1;
    for (let day = 1; day <= totalDays; day++) {
      let daily = [];
      let remaining = chaptersPerDay;
      while (remaining > 0) {
        if (bookIdx >= books.length) {
          if (cycle) {
            // Reset to the beginning if cycling is enabled.
            bookIdx = 0;
            chapter = 1;
          } else break;
        }
        const book = books[bookIdx].name;
        const total = books[bookIdx].chapters;
        const available = total - chapter + 1;
        if (available <= remaining) {
          // If the remaining chapters in the book are less than or equal to the needed chapters,
          // add the whole remaining range.
          daily.push(available === 1 ? `${book} ${chapter}` : `${book} ${chapter}-${total}`);
          remaining -= available;
          bookIdx++;
          chapter = 1;
        } else {
          // Otherwise, add only the required number of chapters.
          const end = chapter + remaining - 1;
          daily.push(remaining === 1 ? `${book} ${chapter}` : `${book} ${chapter}-${end}`);
          chapter = end + 1;
          remaining = 0;
        }
      }
      scheduleArr.push(daily.join(", "));
    }
    return scheduleArr;
  };

  // ----------------------------
  // Checkbox and Progress Handling
  // ----------------------------
  // This function handles checkbox clicks and supports shift-click for selecting a range.
  const handleCheckboxChange = (day, checked, event) => {
    if (event.shiftKey && lastCheckedRef.current !== null) {
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      // Build a new progress map covering the range between last clicked and current day.
      const newProgress = { ...progressMap };
      for (let i = start; i <= end; i++) {
        newProgress[i] = checked;
        localStorage.setItem("check-day-" + i, checked ? "true" : "false");
      }
      // Update state and localStorage with the new progress map.
      setProgressMap(newProgress);
      localStorage.setItem("progressMap", JSON.stringify(newProgress));
      // If user is signed in, update progress in Firestore.
      if (currentUser) {
        db.collection("users")
          .doc(currentUser.uid)
          .set({ progress: newProgress }, { merge: true })
          .catch((error) => console.error("Error saving progress:", error));
      }
    } else {
      // Handle a single checkbox click.
      const newProgress = { ...progressMap, [day]: checked };
      localStorage.setItem("check-day-" + day, checked ? "true" : "false");
      setProgressMap(newProgress);
      localStorage.setItem("progressMap", JSON.stringify(newProgress));
      if (currentUser) {
        db.collection("users")
          .doc(currentUser.uid)
          .set({ progress: newProgress }, { merge: true })
          .catch((error) => console.error("Error saving progress:", error));
      }
    }
    // Update lastClickedRef with the current day.
    lastCheckedRef.current = day;
  };

  // ----------------------------
  // Excel Export Functionality
  // ----------------------------
  // Dynamically imports ExcelJS, creates a workbook from the schedule and progress, and triggers a download.
  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      const header = ["Day", "Passages", "Done"];
      worksheet.addRow(header);

      // Add each day's data into the worksheet.
      schedule.forEach((item) => {
        const done = progressMap[item.day] ? "X" : "";
        const passageCellValue = { text: item.passages, hyperlink: item.url };
        worksheet.addRow([item.day, passageCellValue, done]);
      });

      // Format the passages column to appear as hyperlinks.
      worksheet.getColumn(2).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        if (cell.value && cell.value.hyperlink) {
          cell.font = { color: { argb: "FF0000FF" }, underline: true };
        }
      });

      // Compute column widths based on cell content.
      let data = [];
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let cellText = "";
          if (cell.value && typeof cell.value === "object" && cell.value.text)
            cellText = cell.value.text;
          else cellText = cell.value ? cell.value.toString() : "";
          rowData.push(cellText);
        });
        data.push(rowData);
      });
      const computeColWidths = (data, maxWidth = 30) => {
        const colCount = data[0].length;
        const colWidths = new Array(colCount).fill(0);
        data.forEach((row) => {
          for (let j = 0; j < colCount; j++) {
            let cellText = row[j] || "";
            colWidths[j] = Math.max(colWidths[j], cellText.length);
          }
        });
        return colWidths.map((w) => ({ width: Math.min(w + 2, maxWidth) }));
      };
      const colWidths = computeColWidths(data, 30);
      colWidths.forEach((cw, i) => {
        worksheet.getColumn(i + 1).width = cw.width;
      });

      // Generate the Excel file and trigger a download.
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      saveAs(blob, "bible_reading_progress.xlsx");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  // ----------------------------
  // Sign Out Functionality
  // ----------------------------
  // Signs out the current user, clears progress and localStorage (if desired).
  const signOut = async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
      setProgressMap({});
      // Uncomment the next line if you want unsigned progress to persist after sign-out.
      localStorage.clear();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // ----------------------------
  // Render Component
  // ----------------------------
  // The component renders the header, controls (input fields, buttons), and the schedule table.
  return (
    <>
      <Head>
        <title>Bible Reading Plan</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <div className={styles.header} id="auth-header">
        {currentUser ? (
          <span className="user-info">
            Welcome, {currentUser.email}{" "}
            <button onClick={signOut}>Sign Out</button>
          </span>
        ) : (
          <Link href="/signin">Sign in</Link>
        )}
      </div>
      <div className={styles.container} id="main-content">
        <h1>Bible Reading Plan</h1>
        <div className={styles.controls}>
          <label>
            OT chapters/day (929 total):
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={otChapters}
              onChange={(e) => {
                let value = parseInt(e.target.value, 10);
                if (isNaN(value)) value = 1;
                if (value < 1) value = 1;
                if (value > 100) value = 100;
                setOtChapters(value);
              }}
            />
          </label>
          <br />
          <label>
            NT chapters/day (260 total):
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={ntChapters}
              onChange={(e) => {
                let value = parseInt(e.target.value, 10);
                if (isNaN(value)) value = 1;
                if (value < 1) value = 1;
                if (value > 100) value = 100;
                setNtChapters(value);
              }}
            />
          </label>
          <br /><br />
          <button onClick={() => updateSchedule()}>Update Schedule</button>
          <button onClick={exportToExcel}>Export to Excel</button>
        </div>
        <br />
        <div className={styles.homeTableWrapper}>
          <table id="scheduleTable" className={styles.scheduleTable}>
            <thead>
              <tr>
                <th>Day</th>
                <th>Passages</th>
                <th className={styles.checkboxCell}>Done</th>
              </tr>
            </thead>
            <tbody id="scheduleBody">
              {schedule.map((item) => (
                <tr key={item.day} id={`day-${item.day}`}>
                  <td>{item.day}</td>
                  <td>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hyperlink"
                    >
                      {item.passages}
                    </a>
                  </td>
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      id={`check-day-${item.day}`}
                      checked={!!progressMap[item.day]}
                      onClick={(e) =>
                        handleCheckboxChange(item.day, e.target.checked, e)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
