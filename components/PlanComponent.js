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
 * - Provides sign‑out functionality that resets localStorage to default values.
 */

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { auth, db } from '../lib/firebase';
import { useUserDataContext } from '../contexts/UserDataContext';
import debounce from 'lodash.debounce';
// Import Bible books data.
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
// Import extracted components.
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
// Import the Excel export helper.
import { exportScheduleToExcel } from '../utils/exportExcel';

export default function PlanComponent() {
  // ----------------------------------------------------------
  // 0. Debug Logging on Mount/Unmount
  // ----------------------------------------------------------
  useEffect(() => {
    console.log('PlanComponent mounted');
    return () => {
      console.log('PlanComponent unmounted');
    };
  }, []);

  // ----------------------------------------------------------
  // 1. Firestore Operation Counters
  // ----------------------------------------------------------
  const [firestoreReads, setFirestoreReads] = useState(0);
  const [firestoreWrites, setFirestoreWrites] = useState(0);

  const incrementFirestoreReads = () => {
    setFirestoreReads((prev) => prev + 1);
  };

  const incrementFirestoreWrites = () => {
    setFirestoreWrites((prev) => {
      const newVal = prev + 1;
      console.log(`[PlanComponent] incrementFirestoreWrites: ${newVal}`);
      return newVal;
    });
  };

  useEffect(() => {
    console.log(`[PlanComponent] Firestore Reads updated: ${firestoreReads}`);
  }, [firestoreReads]);

  useEffect(() => {
    console.log(`[PlanComponent] Firestore Writes updated: ${firestoreWrites}`);
  }, [firestoreWrites]);

  const { currentUser, userData, loading } = useUserDataContext();
  useEffect(() => {
    if (userData) {
      console.log('[PlanComponent] userData from Firestore (read operation)');
      incrementFirestoreReads();
    }
  }, [userData]);

  // ----------------------------------------------------------
  // 2. Determine Bible Version from Router Path
  // ----------------------------------------------------------
  const router = useRouter();
  const path = router.pathname; // Expected values: "/nasb", "/lsb", or "/esv"
  let version = 'nasb';
  if (path === '/lsb') {
    version = 'lsb';
  } else if (path === '/esv') {
    version = 'esv';
  }

  // Handle version changes from the version selector.
  const handleVersionChange = (e) => {
    const newVal = e.target.value; // "nasb", "lsb", or "esv"
    console.log('[PlanComponent] Changing version to:', newVal);
    saveUserVersion(newVal, currentUser);
    router.push(`/${newVal}`);
  };

  // Use a ref to ensure asynchronous callbacks have access to the latest currentUser.
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // ----------------------------------------------------------
  // 3. Component State Variables
  // ----------------------------------------------------------
  const [otChapters, setOtChapters] = useState('2');
  const [ntChapters, setNtChapters] = useState('1');
  const [schedule, setSchedule] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [syncPending, setSyncPending] = useState(false);

  const lastCheckedRef = useRef(null);
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });

  // ----------------------------------------------------------
  // 4. Helper Functions
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
      true
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

    const otSchedule = generateSchedule(OT_BOOKS, otNum, totalDays, otDays < totalDays);
    const ntSchedule = generateSchedule(NT_BOOKS, ntNum, totalDays, ntDays < totalDays);

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
  // 5. Checkbox and Progress Handling (Debounced Writes)
  // ----------------------------------------------------------
  const lastCheckedRef2 = useRef(null);
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce((newProgress) => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Debounced function triggered. Writing progress:', newProgress);
        incrementFirestoreWrites();
        db.collection('users')
          .doc(currentUserRef.current.uid)
          .set({ progress: newProgress }, { merge: true })
          .then(() => {
            console.log('[PlanComponent] Progress write successful');
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
    setSyncPending(true);
    if (currentUserRef.current && debouncedSaveRef.current) {
      debouncedSaveRef.current(newProgress);
    }
    lastCheckedRef2.current = day;
  };

  // ----------------------------------------------------------
  // 6. Excel Export Functionality (Using Helper Module)
  // ----------------------------------------------------------
  const handleExportExcel = () => {
    exportScheduleToExcel(schedule, progressMap);
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

      {/* Render Header */}
      <Header currentUser={currentUser} syncPending={syncPending} signOut={signOut} />

      {/* Render ControlsPanel */}
      <div className={styles.container} id="main-content">
        <ControlsPanel
          version={version}
          handleVersionChange={handleVersionChange}
          otChapters={otChapters}
          setOtChapters={setOtChapters}
          ntChapters={ntChapters}
          setNtChapters={setNtChapters}
          updateSchedule={updateSchedule}
          exportToExcel={handleExportExcel}
        />

        {/* Render ScheduleTable */}
        <ScheduleTable
          schedule={schedule}
          progressMap={progressMap}
          handleCheckboxChange={handleCheckboxChange}
        />
      </div>
    </div>
  );
}
