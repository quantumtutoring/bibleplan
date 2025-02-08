/**
 * PlanComponent.js
 *
 * Main component for the Bible Reading Planner.
 *
 * Key functionalities:
 * - Determines the Bible version (NASB, LSB, ESV) from the current route.
 * - Loads user settings and progress either from Firestore (for signed‑in users) or from localStorage (for guests).
 * - Creates a reading schedule based on OT and NT chapter settings.
 * - Handles user interactions such as checkbox progress updates, schedule generation, and Excel export.
 * - Provides sign‑out functionality that resets localStorage to default values (version "nasb", OT chapters "2", NT chapters "1", and cleared progress) and routes the user to the homepage.
 */

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { saveAs } from "file-saver"; // Used for exporting to Excel.
import Image from "next/image";

// Import Firebase configuration and modules (auth, Firestore DB, etc.).
import { firebase, auth, db } from "../lib/firebase";

export default function PlanComponent() {
  // ----------------------------------------------------------
  // 1. Determine Bible Version from Router Path
  // ----------------------------------------------------------
  const router = useRouter();
  const path = router.pathname; // e.g., "/nasb", "/lsb", or "/esv"
  let version = "nasb"; // default version
  if (path === "/lsb") {
    version = "lsb";
  } else if (path === "/esv") {
    version = "esv";
  }

  // ----------------------------------------------------------
  // 2. Dropdown Handler for Changing Bible Version
  // ----------------------------------------------------------
  const handleVersionChange = (e) => {
    const newVal = e.target.value; // "nasb", "lsb", or "esv"
    saveUserVersion(newVal, currentUser, db);
    if (newVal === "lsb") {
      router.push("/lsb");
    } else if (newVal === "esv") {
      router.push("/esv");
    } else {
      router.push("/nasb");
    }
  };

  // ----------------------------------------------------------
  // 3. Component State Variables
  // ----------------------------------------------------------
  const [otChapters, setOtChapters] = useState("2");
  const [ntChapters, setNtChapters] = useState("1");
  const [schedule, setSchedule] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // ----------------------------------------------------------
  // 4. Helper Functions
  // ----------------------------------------------------------
  /**
   * saveUserVersion
   *
   * Saves the selected Bible version to localStorage. If a user is signed in,
   * it also updates the version in Firestore under the user's settings.
   */
  function saveUserVersion(version, currentUser, db) {
    localStorage.setItem("version", version);
    if (currentUser) {
      db.collection("users")
        .doc(currentUser.uid)
        .set({ settings: { version } }, { merge: true })
        .catch((err) =>
          console.error("Error saving version to Firestore:", err)
        );
    }
  }

  // Save version whenever it changes or the user logs in/out.
  useEffect(() => {
    if (version) {
      saveUserVersion(version, currentUser, db);
    }
  }, [version, currentUser]);

  // Refs used for:
  // - Tracking the last checked checkbox (to support shift-click functionality).
  // - Storing old schedule settings to determine if a new schedule is needed.
  const lastCheckedRef = useRef(null);
  // oldSettingsRef now holds the previously-used OT, NT, and totalDays settings.
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  // ----------------------------------------------------------
  // 5. Firebase Auth and Realtime Firestore Sync
  // ----------------------------------------------------------
  useEffect(() => {
    let unsubscribeUserSnapshot;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        // Set up a realtime listener for user data in Firestore.
        unsubscribeUserSnapshot = loadUserData(user);
      } else {
        setCurrentUser(null);
        loadLocalSettings();
      }
    });

    // In case the auth state isn't determined quickly, load local settings after a short delay.
    const timeoutId = setTimeout(() => {
      if (!currentUser) {
        loadLocalSettings();
      }
    }, 1000);

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot();
      }
      clearTimeout(timeoutId);
    };
  }, []);

  /**
   * loadLocalSettings
   *
   * Loads the OT and NT chapter settings and progress map from localStorage.
   */
  const loadLocalSettings = () => {
    const storedOT = localStorage.getItem("otChapters");
    const storedNT = localStorage.getItem("ntChapters");
    if (storedOT) {
      setOtChapters(storedOT);
    }
    if (storedNT) {
      setNtChapters(storedNT);
    }
    const storedProgress = localStorage.getItem("progressMap");
    if (storedProgress) {
      setProgressMap(JSON.parse(storedProgress));
    }
    // Generate the reading schedule using the loaded settings.
    updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
  };

  /**
   * loadUserData
   *
   * Sets up a realtime Firestore listener on the signed‑in user's document.
   */
  const loadUserData = (user) => {
    return db
      .collection("users")
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          // Update OT and NT chapter settings if available.
          if (data.settings) {
            if (data.settings.otChapters) {
              const newOT = String(data.settings.otChapters);
              setOtChapters(newOT);
              localStorage.setItem("otChapters", newOT);
            }
            if (data.settings.ntChapters) {
              const newNT = String(data.settings.ntChapters);
              setNtChapters(newNT);
              localStorage.setItem("ntChapters", newNT);
            }
          }
          // Update progressMap unconditionally.
          if (data.progress) {
            setProgressMap(data.progress);
            localStorage.setItem("progressMap", JSON.stringify(data.progress));
          }
          // Generate/update the reading schedule based on the latest settings.
          updateSchedule(
            data.settings && data.settings.otChapters
              ? String(data.settings.otChapters)
              : otChapters,
            data.settings && data.settings.ntChapters
              ? String(data.settings.ntChapters)
              : ntChapters,
            true // Indicate this is an initialization from Firestore.
          );
        } else {
          // If no user document exists, just generate the schedule from localStorage.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr
            ? JSON.parse(localProgressStr)
            : {};
          setProgressMap(localProgress);
          updateSchedule(otChapters, ntChapters, true);
        }
      });
  };

  /**
   * saveUserSettings
   *
   * Saves the OT and NT chapter settings to localStorage and, if applicable, to Firestore.
   */
  const saveUserSettings = (ot, nt) => {
    localStorage.setItem("otChapters", String(ot));
    localStorage.setItem("ntChapters", String(nt));
    if (currentUser) {
      db.collection("users")
        .doc(currentUser.uid)
        .set({ settings: { otChapters: ot, ntChapters: nt } }, { merge: true })
        .catch((error) => console.error("Error saving settings:", error));
    }
  };

  // ----------------------------------------------------------
  // 6. Schedule and Progress Management Functions
  // ----------------------------------------------------------

  /**
   * clearAllProgress
   *
   * Clears the progress state and removes progress-related data from localStorage.
   */
  const clearAllProgress = () => {
    console.log("Clearing saved progress.");
    setProgressMap({});
    localStorage.removeItem("progressMap");
    for (let i = 1; i < 1000; i++) {
      localStorage.removeItem("check-day-" + i);
    }
    if (currentUser) {
      db.collection("users")
        .doc(currentUser.uid)
        .update({ progress: {} })
        .catch((error) =>
          console.error("Error clearing progress in Firestore:", error)
        );
    }
  };

  /**
   * updateSchedule
   *
   * Generates the reading schedule based on the current OT and NT chapter settings.
   *
   * ---- New Behavior to Avoid Unnecessary Firestore Writes ----
   * Instead of unconditionally writing the settings to Firestore (via saveUserSettings)
   * every time updateSchedule is called, we now do the following:
   *
   * 1. Parse and validate the new settings.
   * 2. Calculate the total number of days required.
   * 3. Compare the new settings with the previously stored settings (in oldSettingsRef).
   *    - If they are unchanged, log a message and return immediately.
   * 4. Update oldSettingsRef with the new settings.
   * 5. Only if this is a user‑initiated change (i.e. not during initialization via Firestore)
   *    do we write the new settings to Firestore (and update localStorage) and clear progress.
   *
   * This prevents the onSnapshot listener (which calls updateSchedule with fromInit = true)
   * from triggering a write back to Firestore when nothing has actually changed.
   *
   * @param {string} ot - OT chapters (as a string).
   * @param {string} nt - NT chapters (as a string).
   * @param {boolean} fromInit - True if this call is part of the initial load from Firestore.
   */
  const updateSchedule = (ot = otChapters, nt = ntChapters, fromInit = false) => {
    // Parse the OT and NT chapter values.
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
      alert(
        "Please enter a valid number between 1 and 100 for both OT and NT chapters per day."
      );
      return;
    }

    // Calculate total days required based on overall chapters.
    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    // ----------------- New Conditional Check Start -----------------
    // Check if the new settings are identical to the previously used settings.
    // If so, no need to re-save the settings or regenerate the schedule.
    if (
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log("Settings unchanged; schedule remains the same.");
      return;
    }
    // Update the oldSettingsRef with the new settings.
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    // Only update Firestore and clear progress if this is a user-initiated change.
    // When fromInit is true (i.e. loading data from Firestore), we assume the settings are already up-to-date.
    if (!fromInit) {
      // Save the new settings to localStorage and Firestore.
      saveUserSettings(otNum, ntNum);
      // Since settings have changed, clear the user's progress.
      clearAllProgress();
    }
    // ------------------ New Conditional Check End ------------------

    // Define the arrays of Bible books for OT and NT.
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

    // Generate individual schedule arrays for OT and NT using the helper function.
    const otSchedule = generateSchedule(
      otBooks,
      otNum,
      totalDays,
      otDays < totalDays
    );
    const ntSchedule = generateSchedule(
      ntBooks,
      ntNum,
      totalDays,
      ntDays < totalDays
    );

    // Build a combined schedule array where each day includes OT and NT passages.
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1];
      const ntText = ntSchedule[day - 1];
      // Remove extra whitespace for query formatting.
      const otQuery = otText.replace(/\s/g, " ");
      const ntQuery = ntText.replace(/\s/g, " ");

      // Construct the URL based on the selected Bible version.
      let url;
      if (version === "lsb") {
        url = `https://read.lsbible.org/?q=${otQuery}, ${ntQuery}`;
      } else if (version === "esv") {
        url = `https://esv.literalword.com/?q=${otQuery}, ${ntQuery}`;
      } else {
        url = `https://www.literalword.com/?q=${otQuery}, ${ntQuery}`;
      }

      const linkText = `${otText} | ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }

    // Update the schedule state.
    setSchedule(newSchedule);
  };

  /**
   * generateSchedule
   *
   * Helper function that generates a schedule array for the given books.
   */
  const generateSchedule = (books, chaptersPerDay, totalDays, cycle) => {
    let scheduleArr = [];
    let bookIdx = 0,
      chapter = 1;
    for (let day = 1; day <= totalDays; day++) {
      let daily = [];
      let remaining = chaptersPerDay;
      while (remaining > 0) {
        if (bookIdx >= books.length) {
          if (cycle) {
            bookIdx = 0;
            chapter = 1;
          } else break;
        }
        const book = books[bookIdx].name;
        const total = books[bookIdx].chapters;
        const available = total - chapter + 1;
        if (available <= remaining) {
          daily.push(
            available === 1
              ? `${book} ${chapter}`
              : `${book} ${chapter}-${total}`
          );
          remaining -= available;
          bookIdx++;
          chapter = 1;
        } else {
          const end = chapter + remaining - 1;
          daily.push(
            remaining === 1
              ? `${book} ${chapter}`
              : `${book} ${chapter}-${end}`
          );
          chapter = end + 1;
          remaining = 0;
        }
      }
      scheduleArr.push(daily.join(", "));
    }
    return scheduleArr;
  };

  // ----------------------------------------------------------
  // 7. Checkbox and Progress Handling
  // ----------------------------------------------------------
  const lastCheckedRef2 = useRef(null);

  const handleCheckboxChange = (day, checked, event) => {
    if (event.shiftKey && lastCheckedRef2.current !== null) {
      const start = Math.min(lastCheckedRef2.current, day);
      const end = Math.max(lastCheckedRef2.current, day);
      const newProgress = { ...progressMap };
      for (let i = start; i <= end; i++) {
        newProgress[i] = checked;
        localStorage.setItem("check-day-" + i, checked ? "true" : "false");
      }
      setProgressMap(newProgress);
      localStorage.setItem("progressMap", JSON.stringify(newProgress));
      if (currentUser) {
        db.collection("users")
          .doc(currentUser.uid)
          .set({ progress: newProgress }, { merge: true })
          .catch((error) =>
            console.error("Error saving progress:", error)
          );
      }
    } else {
      const newProgress = { ...progressMap, [day]: checked };
      localStorage.setItem("check-day-" + day, checked ? "true" : "false");
      setProgressMap(newProgress);
      localStorage.setItem("progressMap", JSON.stringify(newProgress));
      if (currentUser) {
        db.collection("users")
          .doc(currentUser.uid)
          .set({ progress: newProgress }, { merge: true })
          .catch((error) =>
            console.error("Error saving progress:", error)
          );
      }
    }
    lastCheckedRef2.current = day;
  };

  // ----------------------------------------------------------
  // 8. Excel Export Functionality
  // ----------------------------------------------------------
  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet1");
      const header = ["Day", "Passages", "Done"];
      worksheet.addRow(header);

      schedule.forEach((item) => {
        const done = progressMap[item.day] ? "X" : "";
        const passageCellValue = { text: item.passages, hyperlink: item.url };
        worksheet.addRow([item.day, passageCellValue, done]);
      });

      worksheet.getColumn(2).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        if (cell.value && cell.value.hyperlink) {
          cell.font = { color: { argb: "FF0000FF" }, underline: true };
        }
      });

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

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      saveAs(blob, "bible_reading_progress.xlsx");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  };

  // ----------------------------------------------------------
  // 9. Sign Out Functionality
  // ----------------------------------------------------------
  const signOut = async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      localStorage.setItem("version", "nasb");
      localStorage.setItem("otChapters", "2");
      localStorage.setItem("ntChapters", "1");
      localStorage.setItem("progressMap", JSON.stringify({}));
      setCurrentUser(null);
      setProgressMap({});
      router.push("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // ----------------------------------------------------------
  // 10. Component Rendering
  // ----------------------------------------------------------
  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>

      <div className={styles.header} id="auth-header">
        {currentUser ? (
          <span className="user-info">
            {currentUser.email}{" "}
            <button onClick={signOut}>Sign Out</button>
          </span>
        ) : (
          <Link href="/signin">Sign in</Link>
        )}
      </div>

      <div className={styles.container} id="main-content">
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <select value={version} onChange={handleVersionChange}>
            <option value="nasb">NASB</option>
            <option value="lsb">LSB</option>
            <option value="esv">ESV</option>
          </select>
        </div>

        <h1>Bible Reading Planner</h1>

        <div className={styles.controls}>
          <label>
            OT chapters/day (929 total):
            <input
              type="number"
              step="1"
              value={otChapters}
              onChange={(e) => {
                setOtChapters(e.target.value);
              }}
            />
          </label>
          <br />
          <label>
            NT chapters/day (260 total):
            <input
              type="number"
              step="1"
              value={ntChapters}
              onChange={(e) => {
                setNtChapters(e.target.value);
              }}
            />
          </label>
          <br />
          <br />
          <button onClick={() => updateSchedule()}>Create Schedule</button>
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
    </div>
  );
}
