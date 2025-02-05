// pages/index.js
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";
import { saveAs } from "file-saver"; // using the npm package

// Import your Firebase configuration and modules.
import { firebase, auth, db } from "../lib/firebase";

export default function Home() {
  // State variables
  const [otChapters, setOtChapters] = useState(3);
  const [ntChapters, setNtChapters] = useState(2);
  const [schedule, setSchedule] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Refs for tracking last clicked checkbox (for shift–click) and old settings
  const lastCheckedRef = useRef(null);
  // oldSettingsRef stores the last saved settings: { ot, nt, total }
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  // --- Firebase Auth and User Data Loading ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        loadUserData(user);
      } else {
        setCurrentUser(null);
        loadLocalSettings();
      }
    });

    // In case auth state isn't determined quickly, load local settings.
    const timeoutId = setTimeout(() => {
      if (!currentUser) {
        loadLocalSettings();
      }
    }, 1000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load settings and progress from localStorage (for unsigned users)
  const loadLocalSettings = () => {
    const storedOT = localStorage.getItem("otChapters");
    const storedNT = localStorage.getItem("ntChapters");
    if (storedOT) {
      setOtChapters(parseInt(storedOT, 10));
    }
    if (storedNT) {
      setNtChapters(parseInt(storedNT, 10));
    }
    const storedProgress = localStorage.getItem("progressMap");
    if (storedProgress) {
      setProgressMap(JSON.parse(storedProgress));
    }
    // During initial load, pass fromInit=true so that progress isn't cleared.
    updateSchedule(
      parseInt(storedOT, 10) || otChapters,
      parseInt(storedNT, 10) || ntChapters,
      true
    );
  };

  // Load user settings and progress from Firestore.
  const loadUserData = (user) => {
    db.collection("users")
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          const data = doc.data();
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
          // Merge local progress with Firestore progress.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr ? JSON.parse(localProgressStr) : {};
          const mergedProgress = { ...localProgress, ...(data.progress || {}) };
          setProgressMap(mergedProgress);
          db.collection("users")
            .doc(user.uid)
            .set({ progress: mergedProgress }, { merge: true });
          updateSchedule(
            data.settings?.otChapters || otChapters,
            data.settings?.ntChapters || ntChapters,
            true
          );
        } else {
          // No user doc exists – use local progress.
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

  // Save user settings to localStorage and Firestore (if signed in)
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

  // --- Schedule and Progress Management ---
  // Clear progress (and update Firestore if signed in)
  const clearAllProgress = () => {
    console.log("Clearing saved progress.");
    setProgressMap({});
    localStorage.removeItem("progressMap");
    // Remove individual day keys if present.
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

  // Update the schedule based on OT and NT chapters per day.
  // If this is a user‑initiated update (fromInit=false) and the settings have changed,
  // then clear all progress. During initial load (fromInit=true) do not clear progress.
  const updateSchedule = (ot = otChapters, nt = ntChapters, fromInit = false) => {
    const otNum = parseInt(ot, 10);
    const ntNum = parseInt(nt, 10);
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
    saveUserSettings(otNum, ntNum);

    const totalOT = 929, totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    if (!fromInit) {
      // For a user‑initiated update, check if the settings have changed.
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
    // Update the stored settings.
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    // Bible books arrays (OT and NT)
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

    const otCycle = otDays < totalDays;
    const ntCycle = ntDays < totalDays;
    const otSchedule = generateSchedule(otBooks, otNum, totalDays, otCycle);
    const ntSchedule = generateSchedule(ntBooks, ntNum, totalDays, ntCycle);

    // Build the schedule array.
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1];
      const ntText = ntSchedule[day - 1];
      const otQuery = otText.replace(/\s/g, "");
      const ntQuery = ntText.replace(/\s/g, "");
      const url = `https://read.lsbible.org/?q=${otQuery},${ntQuery}`;
      const linkText = `${otText} | ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }
    setSchedule(newSchedule);
  };

  // Schedule generator (legacy logic)
  const generateSchedule = (books, chaptersPerDay, totalDays, cycle) => {
    let scheduleArr = [];
    let bookIdx = 0, chapter = 1;
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
          daily.push(available === 1 ? `${book} ${chapter}` : `${book} ${chapter}-${total}`);
          remaining -= available;
          bookIdx++;
          chapter = 1;
        } else {
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

  // --- Checkbox and Progress Handling ---
  // Use onClick to capture shiftKey events.
  const handleCheckboxChange = (day, checked, event) => {
    if (event.shiftKey && lastCheckedRef.current !== null) {
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      // Build a new progress map for the entire range.
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
          .catch((error) => console.error("Error saving progress:", error));
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
          .catch((error) => console.error("Error saving progress:", error));
      }
    }
    lastCheckedRef.current = day;
  };

  // --- Excel Export ---
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

  // --- Sign Out ---
  const signOut = async () => {
    try {
      await auth.signOut();
      setCurrentUser(null);
      setProgressMap({});
      // If you want unsigned progress to persist after sign-out, comment out the next line.
      localStorage.clear();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // --- Render ---
  return (
    <>
      <Head>
        <title>Bible Reading Plan</title>
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
