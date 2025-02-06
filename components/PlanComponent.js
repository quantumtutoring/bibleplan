import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import { saveAs } from "file-saver"; // using the npm package

// Import your Firebase configuration and modules.
import { firebase, auth, db } from "../lib/firebase";

export default function PlanComponent() {
  // 1) Determine which version (HOME, LSB, ESV) from the router path.
  const router = useRouter();
  const path = router.pathname; // "/", "/lsb", or "/esv"

  let version = "home";
  if (path === "/lsb") {
    version = "lsb";
  } else if (path === "/esv") {
    version = "esv";
  }

  // 2) Handler for changing the dropdown value.
  const handleVersionChange = (e) => {
    const newVal = e.target.value; // "home", "lsb", or "esv"
    if (newVal === "lsb") {
      router.push("/lsb");
    } else if (newVal === "esv") {
      router.push("/esv");
    } else {
      // default to home
      router.push("/");
    }
  };

  // --- State variables ---
  // Same improved number input logic from your code: storing as strings
  // so the user can clear the field and type fresh.
  const [otChapters, setOtChapters] = useState("3");
  const [ntChapters, setNtChapters] = useState("2");
  const [schedule, setSchedule] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Refs for tracking last clicked checkbox (for shift–click) and old settings.
  const lastCheckedRef = useRef(null);
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
      setOtChapters(storedOT);
    }
    if (storedNT) {
      setNtChapters(storedNT);
    }
    const storedProgress = localStorage.getItem("progressMap");
    if (storedProgress) {
      setProgressMap(JSON.parse(storedProgress));
    }
    // During initial load, pass fromInit=true so that progress isn't cleared.
    updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
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
              setOtChapters(String(data.settings.otChapters));
            }
            if (data.settings.ntChapters) {
              setNtChapters(String(data.settings.ntChapters));
            }
            localStorage.setItem(
              "otChapters",
              String(data.settings.otChapters)
            );
            localStorage.setItem(
              "ntChapters",
              String(data.settings.ntChapters)
            );
          }
          // Merge local progress with Firestore progress.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr
            ? JSON.parse(localProgressStr)
            : {};
          const mergedProgress = { ...localProgress, ...(data.progress || {}) };
          setProgressMap(mergedProgress);
          // Save merged progress back to Firestore:
          db.collection("users")
            .doc(user.uid)
            .set({ progress: mergedProgress }, { merge: true });

          updateSchedule(
            data.settings?.otChapters
              ? String(data.settings.otChapters)
              : otChapters,
            data.settings?.ntChapters
              ? String(data.settings.ntChapters)
              : ntChapters,
            true
          );
        } else {
          // No user doc exists – use local progress.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr
            ? JSON.parse(localProgressStr)
            : {};
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
    localStorage.setItem("otChapters", String(ot));
    localStorage.setItem("ntChapters", String(nt));
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
  const updateSchedule = (ot = otChapters, nt = ntChapters, fromInit = false) => {
    // Parse the values from strings to integers.
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
      alert(
        "Please enter a valid number between 1 and 100 for both OT and NT chapters per day."
      );
      return;
    }
    saveUserSettings(otNum, ntNum);

    const totalOT = 929;
    const totalNT = 260;
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

    // Generate schedule arrays
    const otSchedule = generateSchedule(otBooks, otNum, totalDays, otDays < totalDays);
    const ntSchedule = generateSchedule(ntBooks, ntNum, totalDays, ntDays < totalDays);

    // Build the schedule array.
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1];
      const ntText = ntSchedule[day - 1];
      const otQuery = otText.replace(/\s/g, "");
      const ntQuery = ntText.replace(/\s/g, "");

      // 3) Construct the passage URL based on version:
      let url;
      if (version === "lsb") {
        url = `https://read.lsbible.org/?Q=${otQuery},${ntQuery}`;
      } else if (version === "esv") {
        url = `https://esv.literalword.com/?q=${otQuery},${ntQuery}`;
      } else {
        // default: home
        url = `https://www.literalword.com/?q=${otQuery},${ntQuery}`;
      }

      const linkText = `${otText} | ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }

    setSchedule(newSchedule);
  };

  // Schedule generator (unchanged from your snippet).
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

  // --- Checkbox and Progress Handling ---
  const lastCheckedRef2 = useRef(null);

  const handleCheckboxChange = (day, checked, event) => {
    if (event.shiftKey && lastCheckedRef2.current !== null) {
      const start = Math.min(lastCheckedRef2.current, day);
      const end = Math.max(lastCheckedRef2.current, day);
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
    lastCheckedRef2.current = day;
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

      // Auto-size columns
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
        {/* Dropdown in top-left */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <select value={version} onChange={handleVersionChange}>
            <option value="home">HOME</option>
            <option value="lsb">LSB</option>
            <option value="esv">ESV</option>
          </select>
        </div>

        <h1>Bible Reading Plan</h1>

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
