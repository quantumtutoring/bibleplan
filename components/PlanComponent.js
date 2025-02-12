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
import { auth } from '../lib/firebase';
import { useUserDataContext } from '../contexts/UserDataContext';
import debounce from 'lodash.debounce';
// Import Bible books data.
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
// Import extracted components.
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
import { generateSchedule } from '../utils/generateSchedule';
// Import the Excel export helper.
import { exportScheduleToExcel } from '../utils/exportExcel';
// Import the unified Firestore write hook.
import useUserDataSync from '../hooks/useUserDataSync';
// Import the new localStorage hook.
import useLocalStorage from '../hooks/useLocalStorage';

export default function PlanComponent() {
  // Use our localStorage hook.
  const { getItem, setItem, removeItem, clear } = useLocalStorage();

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
  // 4. Helper Functions (using useUserDataSync and useLocalStorage)
  // ----------------------------------------------------------
  const { updateUserData } = useUserDataSync();

  function saveUserVersion(newVersion, currentUser) {
    const storedVersion = getItem('version');
    if (storedVersion === newVersion) {
      console.log('[PlanComponent] Version unchanged; skipping Firestore write');
      return;
    }
    console.log('[PlanComponent] Saving version to localStorage and Firestore:', newVersion);
    setItem('version', newVersion);
    if (currentUser) {
      // Use the hook to update the version.
      incrementFirestoreWrites();
      updateUserData(currentUser.uid, { settings: { version: newVersion } })
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
        setItem('otChapters', newOT);
      }
      if (userData.settings.ntChapters) {
        const newNT = String(userData.settings.ntChapters);
        console.log('[PlanComponent] Updating NT chapters from Firestore:', newNT);
        setNtChapters(newNT);
        setItem('ntChapters', newNT);
      }
    }
    if (userData && userData.progress) {
      console.log('[PlanComponent] Updating progressMap from Firestore:', userData.progress);
      setProgressMap(userData.progress);
      setItem('progressMap', userData.progress);
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
      const storedOT = getItem('otChapters');
      const storedNT = getItem('ntChapters');
      if (storedOT) {
        console.log('[PlanComponent] Loading OT chapters from localStorage:', storedOT);
        setOtChapters(storedOT);
      }
      if (storedNT) {
        console.log('[PlanComponent] Loading NT chapters from localStorage:', storedNT);
        setNtChapters(storedNT);
      }
      const storedProgress = getItem('progressMap');
      if (storedProgress) {
        console.log('[PlanComponent] Loading progressMap from localStorage:', storedProgress);
        setProgressMap(storedProgress);
      }
      updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
    }
  }, [currentUser, loading]);

  // Combined function: Update user settings, progress, and schedule in one call.
  const updateUserDoc = (data) => {
    // Save relevant data to localStorage.
    if (data.settings) {
      if (data.settings.otChapters !== undefined) {
        setItem('otChapters', String(data.settings.otChapters));
      }
      if (data.settings.ntChapters !== undefined) {
        setItem('ntChapters', String(data.settings.ntChapters));
      }
      if (data.settings.version !== undefined) {
        setItem('version', data.settings.version);
      }
    }
    if (data.progress !== undefined) {
      setItem('progressMap', data.progress);
    }
    // Remove any individual check-day items.
    for (let i = 1; i < 1000; i++) {
      removeItem('check-day-' + i);
    }
    // Clear local progress state.
    setProgressMap({});

    // If a user is signed in, update Firestore in one call.
    if (currentUser) {
      console.log('[PlanComponent] Updating user document for user:', currentUser.uid, data);
      incrementFirestoreWrites();
      updateUserData(currentUser.uid, data)
        .then(() => console.log('[PlanComponent] User document update successful'))
        .catch((error) => console.error('[PlanComponent] Error updating user document:', error));
    }
  };

  // For example, when generating a new schedule:
  const updateCombinedUserData = (ot, nt) => {
    updateUserDoc({
      settings: { otChapters: ot, ntChapters: nt },
      progress: {} // Clear progress.
    });
  };

  // ----------------------------------------------------------
  // 5. Schedule Generation and Progress Handling
  // ----------------------------------------------------------
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
      // Update the user document (settings and clear progress) in one call.
      updateCombinedUserData(otNum, ntNum);
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

  // Debounced save function for checkbox progress updates.
  const lastCheckedRef2 = useRef(null);
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce((newProgress) => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Debounced function triggered. Writing progress:', newProgress);
        incrementFirestoreWrites();
        // Use the unified update function to update progress.
        updateUserData(currentUserRef.current.uid, { progress: newProgress })
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
        setItem('check-day-' + i, checked ? 'true' : 'false');
      }
    } else {
      newProgress = { ...progressMap, [day]: checked };
      setItem('check-day-' + day, checked ? 'true' : 'false');
    }
    setProgressMap(newProgress);
    setItem('progressMap', newProgress);
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
      clear();
      setItem('version', 'nasb');
      setItem('otChapters', '2');
      setItem('ntChapters', '1');
      setItem('progressMap', {});
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
      <Header currentUser={currentUser} syncPending={syncPending} signOut={signOut} 
                exportToExcel={handleExportExcel}
      />

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
