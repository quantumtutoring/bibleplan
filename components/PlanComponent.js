// components/PlanComponent.js
/**
 * PlanComponent.js
 *
 * Main component for the Bible Reading Planner.
 *
 * Key functionalities:
 * - Determines the Bible version (NASB, LSB, ESV) from the current route.
 * - Loads user settings and progress either from Firestore (for signed‑in users)
 *   via the centralized UserDataContext or from localStorage (for guests).
 * - Creates a reading schedule based on OT and NT chapter settings.
 * - Handles user interactions such as checkbox progress updates, schedule generation,
 *   and Excel export.
 * - Provides sign‑out functionality that resets localStorage to default values
 *   (version "nasb", OT chapters "2", NT chapters "1", and cleared progress)
 */

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { saveAs } from 'file-saver';
import { auth, db } from '../lib/firebase';
import { useUserDataContext } from '../contexts/UserDataContext';
import debounce from 'lodash.debounce';

export default function PlanComponent() {
  // Log mount/unmount for debugging.
  useEffect(() => {
    console.log('PlanComponent mounted');
    return () => {
      console.log('PlanComponent unmounted');
    };
  }, []);

  // ----------------------------------------------------------
  // 0. Firestore Operation Counters (reads and writes)
  // ----------------------------------------------------------
  const [firestoreReads, setFirestoreReads] = useState(0);
  const [firestoreWrites, setFirestoreWrites] = useState(0);

  const incrementFirestoreReads = () => {
    setFirestoreReads((prev) => prev + 1);
  };

  const incrementFirestoreWrites = () => {
    setFirestoreWrites((prev) => prev + 1);
  };

  // Log counter changes to the console.
  useEffect(() => {
    console.log(`[PlanComponent] Firestore Reads updated: ${firestoreReads}`);
  }, [firestoreReads]);

  useEffect(() => {
    console.log(`[PlanComponent] Firestore Writes updated: ${firestoreWrites}`);
  }, [firestoreWrites]);

  // Example: count each time new userData is received as a "read" from Firestore.
  const { currentUser, userData, loading } = useUserDataContext();
  useEffect(() => {
    if (userData) {
      console.log('[PlanComponent] userData received from Firestore (read operation)');
      incrementFirestoreReads();
    }
  }, [userData]);

  // ----------------------------------------------------------
  // 1. Determine Bible Version from Router Path
  // ----------------------------------------------------------
  const router = useRouter();
  const path = router.pathname; // e.g., "/nasb", "/lsb", or "/esv"
  let version = 'nasb'; // default version
  if (path === '/lsb') {
    version = 'lsb';
  } else if (path === '/esv') {
    version = 'esv';
  }

  // Handle version change
  const handleVersionChange = (e) => {
    const newVal = e.target.value; // "nasb", "lsb", or "esv"
    console.log('[PlanComponent] Changing version to:', newVal);
    saveUserVersion(newVal, currentUser);
    if (newVal === 'lsb') {
      router.push('/lsb');
    } else if (newVal === 'esv') {
      router.push('/esv');
    } else {
      router.push('/nasb');
    }
  };

  // Use a ref to always have the latest currentUser.
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // ----------------------------------------------------------
  // 2. Local State Variables
  // ----------------------------------------------------------
  const [otChapters, setOtChapters] = useState('2');
  const [ntChapters, setNtChapters] = useState('1');
  const [schedule, setSchedule] = useState([]);
  const [progressMap, setProgressMap] = useState({});

  // New state: syncPending indicates whether local changes are pending sync.
  const [syncPending, setSyncPending] = useState(false);

  // Refs for avoiding redundant schedule writes and handling shift‑click.
  const lastCheckedRef = useRef(null);
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  // ----------------------------------------------------------
  // 3. Helper Functions
  // ----------------------------------------------------------
  function saveUserVersion(newVersion, currentUser) {
    const storedVersion = localStorage.getItem('version');
    if (storedVersion === newVersion) {
      console.log('[PlanComponent] Version unchanged; skipping Firestore write');
      return;
    }
    console.log('[PlanComponent] Saving version to localStorage and Firestore:', newVersion);
    localStorage.setItem('version', newVersion);
    if (currentUser) {
      console.log('[PlanComponent] Writing version to Firestore for user:', currentUser.uid);
      incrementFirestoreWrites();
      db.collection('users')
        .doc(currentUser.uid)
        .set({ settings: { version: newVersion } }, { merge: true })
        .then(() => console.log('[PlanComponent] Version write successful'))
        .catch((err) =>
          console.error('[PlanComponent] Error saving version to Firestore:', err)
        );
    }
  }

  useEffect(() => {
    if (version) {
      saveUserVersion(version, currentUser);
    }
  }, [version, currentUser]);

  // ----------------------------------------------------------
  // 4. Synchronize Data from Centralized Context or Local Storage
  // ----------------------------------------------------------
  useEffect(() => {
    if (userData && userData.settings) {
      if (userData.settings.otChapters) {
        const newOT = String(userData.settings.otChapters);
        console.log('[PlanComponent] Updating OT chapters from Firestore:', newOT);
        setOtChapters(newOT);
        localStorage.setItem('otChapters', newOT);
      }
      if (userData.settings.ntChapters) {
        const newNT = String(userData.settings.ntChapters);
        console.log('[PlanComponent] Updating NT chapters from Firestore:', newNT);
        setNtChapters(newNT);
        localStorage.setItem('ntChapters', newNT);
      }
    }
    if (userData && userData.progress) {
      console.log('[PlanComponent] Updating progressMap from Firestore:', userData.progress);
      setProgressMap(userData.progress);
      localStorage.setItem('progressMap', JSON.stringify(userData.progress));
    }
    updateSchedule(
      userData && userData.settings && userData.settings.otChapters
        ? String(userData.settings.otChapters)
        : otChapters,
      userData && userData.settings && userData.settings.ntChapters
        ? String(userData.settings.ntChapters)
        : ntChapters,
      true // fromInit flag prevents triggering additional writes
    );
  }, [userData]);

  useEffect(() => {
    if (!currentUser && !loading) {
      const storedOT = localStorage.getItem('otChapters');
      const storedNT = localStorage.getItem('ntChapters');
      if (storedOT) {
        console.log('[PlanComponent] Loading OT chapters from localStorage:', storedOT);
        setOtChapters(storedOT);
      }
      if (storedNT) {
        console.log('[PlanComponent] Loading NT chapters from localStorage:', storedNT);
        setNtChapters(storedNT);
      }
      const storedProgress = localStorage.getItem('progressMap');
      if (storedProgress) {
        console.log('[PlanComponent] Loading progressMap from localStorage:', storedProgress);
        setProgressMap(JSON.parse(storedProgress));
      }
      updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
    }
  }, [currentUser, loading]);

  const saveUserSettings = (ot, nt) => {
    console.log('[PlanComponent] Saving user settings:', ot, nt);
    localStorage.setItem('otChapters', String(ot));
    localStorage.setItem('ntChapters', String(nt));
    if (currentUser) {
      console.log('[PlanComponent] Writing settings to Firestore for user:', currentUser.uid);
      incrementFirestoreWrites();
      db.collection('users')
        .doc(currentUser.uid)
        .set({ settings: { otChapters: ot, ntChapters: nt } }, { merge: true })
        .then(() => console.log('[PlanComponent] Settings write successful'))
        .catch((error) => console.error('[PlanComponent] Error saving settings:', error));
    }
  };

  const clearAllProgress = () => {
    console.log('[PlanComponent] Clearing all progress.');
    setProgressMap({});
    localStorage.removeItem('progressMap');
    for (let i = 1; i < 1000; i++) {
      localStorage.removeItem('check-day-' + i);
    }
    if (currentUser) {
      console.log('[PlanComponent] Clearing progress in Firestore for user:', currentUser.uid);
      incrementFirestoreWrites();
      db.collection('users')
        .doc(currentUser.uid)
        .update({ progress: {} })
        .then(() => console.log('[PlanComponent] Progress cleared in Firestore'))
        .catch((error) =>
          console.error('[PlanComponent] Error clearing progress in Firestore:', error)
        );
    }
  };

  const updateSchedule = (ot = otChapters, nt = ntChapters, fromInit = false) => {
    console.log('[PlanComponent] updateSchedule called with OT:', ot, 'NT:', nt, 'fromInit:', fromInit);
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
      alert('Please enter a valid number between 1 and 100 for both OT and NT chapters per day.');
      return;
    }

    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);

    if (
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[PlanComponent] Settings unchanged; schedule remains the same.');
      return;
    }
    console.log('[PlanComponent] Settings changed. Updating schedule...');
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };

    if (!fromInit) {
      saveUserSettings(otNum, ntNum);
      clearAllProgress();
    }

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

    const otSchedule = generateSchedule(otBooks, otNum, totalDays, otDays < totalDays);
    const ntSchedule = generateSchedule(ntBooks, ntNum, totalDays, ntDays < totalDays);

    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = otSchedule[day - 1];
      const ntText = ntSchedule[day - 1];
      const otQuery = otText.replace(/\s/g, ' ');
      const ntQuery = ntText.replace(/\s/g, ' ');
      let url;
      if (version === 'lsb') {
        url = `https://read.lsbible.org/?q=${otQuery}, ${ntQuery}`;
      } else if (version === 'esv') {
        url = `https://esv.literalword.com/?q=${otQuery}, ${ntQuery}`;
      } else {
        url = `https://www.literalword.com/?q=${otQuery}, ${ntQuery}`;
      }
      const linkText = `${otText} | ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }
    console.log('[PlanComponent] New schedule generated:', newSchedule);
    setSchedule(newSchedule);
  };

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
      scheduleArr.push(daily.join(', '));
    }
    return scheduleArr;
  };

  // ----------------------------------------------------------
  // 5. Checkbox and Progress Handling (using lodash.debounce)
  // ----------------------------------------------------------
  const lastCheckedRef2 = useRef(null);

  // Create the debounced save function only once.
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce((newProgress) => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Writing batched progress to Firestore');
        incrementFirestoreWrites();
        db.collection('users')
          .doc(currentUserRef.current.uid)
          .set({ progress: newProgress }, { merge: true })
          .then(() => {
            console.log('[PlanComponent] Progress write successful');
            // Mark the sync as complete.
            setSyncPending(false);
          })
          .catch((error) =>
            console.error('[PlanComponent] Error saving progress:', error)
          );
      }
    }, 1000);
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, []);

  const handleCheckboxChange = (day, checked, event) => {
    console.log(`[PlanComponent] Checkbox changed for day ${day} to ${checked}`);
    let newProgress;
    if (event.shiftKey && lastCheckedRef2.current !== null) {
      const start = Math.min(lastCheckedRef2.current, day);
      const end = Math.max(lastCheckedRef2.current, day);
      newProgress = { ...progressMap };
      for (let i = start; i <= end; i++) {
        newProgress[i] = checked;
        localStorage.setItem('check-day-' + i, checked ? 'true' : 'false');
      }
    } else {
      newProgress = { ...progressMap, [day]: checked };
      localStorage.setItem('check-day-' + day, checked ? 'true' : 'false');
    }
    setProgressMap(newProgress);
    localStorage.setItem('progressMap', JSON.stringify(newProgress));
    // Mark as pending sync immediately.
    setSyncPending(true);
    if (currentUserRef.current && debouncedSaveRef.current) {
      debouncedSaveRef.current(newProgress);
    }
    lastCheckedRef2.current = day;
  };

  // ----------------------------------------------------------
  // 6. Excel Export Functionality
  // ----------------------------------------------------------
  const exportToExcel = async () => {
    try {
      console.log('[PlanComponent] Exporting schedule to Excel');
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Sheet1');
      const header = ['Day', 'Passages', 'Done'];
      worksheet.addRow(header);
      schedule.forEach((item) => {
        const done = progressMap[item.day] ? 'X' : '';
        const passageCellValue = { text: item.passages, hyperlink: item.url };
        worksheet.addRow([item.day, passageCellValue, done]);
      });
      worksheet.getColumn(2).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        if (cell.value && cell.value.hyperlink) {
          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }
      });
      let data = [];
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let cellText = '';
          if (cell.value && typeof cell.value === 'object' && cell.value.text)
            cellText = cell.value.text;
          else cellText = cell.value ? cell.value.toString() : '';
          rowData.push(cellText);
        });
        data.push(rowData);
      });
      const computeColWidths = (data, maxWidth = 30) => {
        const colCount = data[0].length;
        const colWidths = new Array(colCount).fill(0);
        data.forEach((row) => {
          for (let j = 0; j < colCount; j++) {
            let cellText = row[j] || '';
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
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      console.log('[PlanComponent] Excel export complete. Saving file.');
      saveAs(blob, 'bible_reading_progress.xlsx');
    } catch (error) {
      console.error('[PlanComponent] Error exporting to Excel:', error);
    }
  };

  // ----------------------------------------------------------
  // 7. Sign Out Functionality
  // ----------------------------------------------------------
  const signOut = async () => {
    try {
      console.log('[PlanComponent] Signing out user');
      await auth.signOut();
      localStorage.clear();
      localStorage.setItem('version', 'nasb');
      localStorage.setItem('otChapters', '2');
      localStorage.setItem('ntChapters', '1');
      localStorage.setItem('progressMap', JSON.stringify({}));
      setProgressMap({});
      router.push('/');
    } catch (error) {
      console.error('[PlanComponent] Sign out error:', error);
    }
  };

  // ----------------------------------------------------------
  // 8. Component Rendering
  // ----------------------------------------------------------
  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      {/* 
          Make the header fixed so that it stays visible during scroll.
          (You may want to adjust the background and height in your CSS as needed.)
      */}
      <div className={styles.header} id="auth-header">
        {currentUser ? (
          <div>
            <span className={syncPending ? styles.emailPending : styles.emailSynced}>
              {currentUser.email}
            </span>
            {/* The read/write counters have been removed from the UI.
                Their values are now logged to the console. */}
<button onClick={signOut} className={`${styles.button} ${styles.signoutButton}`}>
  Sign Out
</button>

          </div>
        ) : (
          <Link href="/signin">Sign in</Link>
        )}
      </div>

      <div className={styles.container} id="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
              onChange={(e) => setOtChapters(e.target.value)}
            />
          </label>
          <br />
          <label>
            NT chapters/day (260 total):
            <input
              type="number"
              step="1"
              value={ntChapters}
              onChange={(e) => setNtChapters(e.target.value)}
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
                      onChange={(e) => handleCheckboxChange(item.day, e.target.checked, e)}
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
