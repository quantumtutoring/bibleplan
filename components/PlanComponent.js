// components/PlanComponent.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import { useUserDataContext } from '../contexts/UserDataContext';
import debounce from 'lodash.debounce';
import { OT_BOOKS, NT_BOOKS } from '../data/bibleBooks';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
import { generateSchedule } from '../utils/generateSchedule';
import { exportScheduleToExcel } from '../utils/exportExcel';
import useUserDataSync from '../hooks/useUserDataSync';
import useLocalStorage from '../hooks/useLocalStorage';

export default function PlanComponent() {
  const { getItem, setItem, removeItem, clear } = useLocalStorage();

  useEffect(() => {
    console.log('PlanComponent mounted');
    return () => {
      console.log('PlanComponent unmounted');
    };
  }, []);

  const [firestoreReads, setFirestoreReads] = useState(0);
  const [firestoreWrites, setFirestoreWrites] = useState(0);
  const incrementFirestoreReads = () => setFirestoreReads((prev) => prev + 1);
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

  const router = useRouter();
  const path = router.pathname;
  let version = 'nasb';
  if (path === '/lsb') version = 'lsb';
  else if (path === '/esv') version = 'esv';

  const handleVersionChange = (e) => {
    const newVal = e.target.value;
    console.log('[PlanComponent] Changing version to:', newVal);
    saveUserVersion(newVal, currentUser);
    router.push(`/${newVal}`);
  };

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [otChapters, setOtChapters] = useState('2');
  const [ntChapters, setNtChapters] = useState('1');
  const [schedule, setSchedule] = useState([]);
  // Separate progress maps for default and custom schedules.
  const [defaultProgressMap, setDefaultProgressMap] = useState({});
  const [customProgressMap, setCustomProgressMap] = useState({});
  // Flag for current schedule mode.
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const lastCheckedRef = useRef(null);
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });
  // State to hold the custom schedule so that it can be restored later.
  const [customSchedule, setCustomSchedule] = useState(null);
  // Ref to ensure we load the initial schedule only once.
  const initialScheduleLoaded = useRef(false);

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
      incrementFirestoreWrites();
      updateUserData(currentUser.uid, { settings: { version: newVersion } })
        .then(() => console.log('[PlanComponent] Version write successful'))
        .catch((err) =>
          console.error('[PlanComponent] Error saving version to Firestore:', err)
        );
    }
  }

  useEffect(() => {
    if (version) saveUserVersion(version, currentUser);
  }, [version, currentUser]);

  // When userData is loaded (from Firestore) restore settings and progress maps.
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
    // Load progress maps from userData.
    if (userData && userData.defaultProgress) {
      setDefaultProgressMap(userData.defaultProgress);
      setItem('progressMap', userData.defaultProgress);
    }
    if (userData && userData.customProgress) {
      setCustomProgressMap(userData.customProgress);
      setItem('customProgressMap', userData.customProgress);
    }
    // Restore schedule from localStorage if it exists.
    if (userData && !initialScheduleLoaded.current) {
      const savedCustomSchedule = getItem('customSchedule');
      const savedDefaultSchedule = getItem('defaultSchedule');
      if (savedCustomSchedule) {
        console.log('[PlanComponent] Restoring custom schedule from localStorage.');
        updateSchedule(savedCustomSchedule, null, true);
      } else if (savedDefaultSchedule) {
        console.log('[PlanComponent] Restoring default schedule from localStorage.');
        setSchedule(savedDefaultSchedule);
      } else {
        // No saved schedule; generate one.
        updateSchedule(
          userData.settings && userData.settings.otChapters
            ? String(userData.settings.otChapters)
            : otChapters,
          userData.settings && userData.settings.ntChapters
            ? String(userData.settings.ntChapters)
            : ntChapters,
          true
        );
      }
      initialScheduleLoaded.current = true;
    }
  }, [userData]);

  // When no user is logged in (or during first load) read from localStorage.
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
      // Load default progress map.
      const storedDefaultProgress = getItem('progressMap', {});
      if (storedDefaultProgress) {
        console.log('[PlanComponent] Loading default progressMap from localStorage:', storedDefaultProgress);
        setDefaultProgressMap(storedDefaultProgress);
      }
      // Load custom progress map.
      const storedCustomProgress = getItem('customProgressMap', {});
      if (storedCustomProgress) {
        console.log('[PlanComponent] Loading custom progressMap from localStorage:', storedCustomProgress);
        setCustomProgressMap(storedCustomProgress);
      }
      // Load schedule if it exists.
      const savedDefaultSchedule = getItem('defaultSchedule');
      if (savedDefaultSchedule) {
        console.log('[PlanComponent] Restoring default schedule from localStorage.');
        setSchedule(savedDefaultSchedule);
      } else {
        updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
      }
    }
  }, [currentUser, loading]);

  // Combined function to update the user document.
  const updateUserDoc = (data) => {
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
    if (data.customProgress !== undefined) {
      setItem('customProgressMap', data.customProgress);
    }
    if (data.schedule !== undefined) {
      setItem('defaultSchedule', data.schedule);
    }
    if (data.customSchedule !== undefined) {
      setItem('customSchedule', data.customSchedule);
    }
    for (let i = 1; i < 1000; i++) {
      removeItem('check-day-' + i);
    }
    if (currentUser) {
      console.log('[PlanComponent] Updating user document for user:', currentUser.uid, data);
      incrementFirestoreWrites();
      updateUserData(currentUser.uid, data)
        .then(() => console.log('[PlanComponent] User document update successful'))
        .catch((error) => console.error('[PlanComponent] Error updating user document:', error));
    }
  };

  const updateCombinedUserData = (ot, nt) => {
    updateUserDoc({
      settings: { otChapters: ot, ntChapters: nt },
      progress: {}
    });
  };

  /**
   * updateSchedule:
   *
   * Two branches:
   *
   * 1. Custom schedule branch:
   *    If the first argument is an array, treat it as a custom schedule.
   *    - Save the custom schedule and (if clearProgress is true) clear the custom progress.
   *
   * 2. Default schedule branch:
   *    Otherwise, generate the schedule from the OT/NT numbers.
   */
  const updateSchedule = (scheduleOrOt, nt, fromInit = false, forceUpdate = false, clearProgress = false) => {
    // Custom schedule branch.
    if (Array.isArray(scheduleOrOt)) {
      console.log('[PlanComponent] Custom schedule provided.');
      setCustomSchedule(scheduleOrOt);
      setIsCustomSchedule(true);
      if (clearProgress) {
        setCustomProgressMap({});
        setItem('customProgressMap', {});
        if (currentUser) {
          incrementFirestoreWrites();
          updateUserData(currentUser.uid, { customProgress: {} });
        }
      }
      // Persist custom schedule locally and in Firestore.
      setItem('customSchedule', scheduleOrOt);
      if (currentUser) {
        updateUserData(currentUser.uid, { customSchedule: scheduleOrOt })
          .then(() => console.log('[PlanComponent] Custom schedule saved to Firestore'))
          .catch((error) => console.error('[PlanComponent] Error saving custom schedule:', error));
      }
      setSchedule(scheduleOrOt);
      return;
    }
    // Default schedule branch.
    const otNum = parseInt(scheduleOrOt, 10);
    const ntNum = parseInt(nt, 10);
    if (isNaN(otNum) || otNum < 1 || otNum > 100 || isNaN(ntNum) || ntNum < 1 || ntNum > 100) {
      alert('Please enter a valid number between 1 and 100 for both OT and NT chapters per day.');
      return;
    }
    const totalOT = 929;
    const totalNT = 260;
    const otDays = Math.ceil(totalOT / otNum);
    const ntDays = Math.ceil(totalNT / ntNum);
    const totalDays = Math.max(otDays, ntDays);
    if (
      !forceUpdate &&
      oldSettingsRef.current.ot === otNum &&
      oldSettingsRef.current.nt === ntNum &&
      oldSettingsRef.current.total === totalDays
    ) {
      console.log('[PlanComponent] Settings unchanged; schedule remains the same.');
      return;
    }
    console.log('[PlanComponent] Updating default schedule' + (clearProgress ? ' with cleared progress.' : '.'));
    oldSettingsRef.current = { ot: otNum, nt: ntNum, total: totalDays };
    if (!fromInit) {
      updateCombinedUserData(otNum, ntNum);
    }
    let otSchedule = [];
    let ntSchedule = [];
    try {
      otSchedule = generateSchedule(OT_BOOKS, otNum, totalDays, otDays < totalDays);
      ntSchedule = generateSchedule(NT_BOOKS, ntNum, totalDays, ntDays < totalDays);
    } catch (error) {
      console.error('Error generating schedule:', error);
      otSchedule = [];
      ntSchedule = [];
    }
    const newSchedule = [];
    for (let day = 1; day <= totalDays; day++) {
      const otText = (otSchedule[day - 1] || '') + '';
      const ntText = (ntSchedule[day - 1] || '') + '';
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
    setIsCustomSchedule(false);
    if (clearProgress) {
      setDefaultProgressMap({});
      setItem('progressMap', {});
      if (currentUser) {
        incrementFirestoreWrites();
        updateUserData(currentUser.uid, { defaultProgress: {} });
      }
    }
    setSchedule(newSchedule);
    // Persist the default schedule locally and in Firestore.
    setItem('defaultSchedule', newSchedule);
    if (currentUser) {
      updateUserData(currentUser.uid, { schedule: newSchedule })
        .then(() => console.log('[PlanComponent] Default schedule saved to Firestore'))
        .catch((error) => console.error('[PlanComponent] Error saving default schedule:', error));
    }
  };

  // Compute the active progress map on the fly.
  const activeProgressMap = isCustomSchedule ? customProgressMap : defaultProgressMap;

  // Update the checkbox change handler to work with the proper state.
  const handleCheckboxChange = (day, checked, event) => {
    console.log(`[PlanComponent] Checkbox changed for day ${day} to ${checked}`);
    let newProg;
    // Use the current active progress map.
    const currentProgress = activeProgressMap;
    if (event.shiftKey && lastCheckedRef.current !== null) {
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      newProg = { ...currentProgress };
      for (let i = start; i <= end; i++) {
        newProg[i] = checked;
        setItem('check-day-' + i, checked ? 'true' : 'false');
      }
    } else {
      newProg = { ...currentProgress, [day]: checked };
      setItem('check-day-' + day, checked ? 'true' : 'false');
    }
    if (isCustomSchedule) {
      setCustomProgressMap(newProg);
      setItem('customProgressMap', newProg);
    } else {
      setDefaultProgressMap(newProg);
      setItem('progressMap', newProg);
    }
    setSyncPending(true);
    if (currentUserRef.current && debouncedSaveRef.current) {
      debouncedSaveRef.current(newProg);
    }
    lastCheckedRef.current = day;
  };

  // Debounced function to save progress.
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce((newProg) => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Debounced function triggered. Writing progress:', newProg);
        incrementFirestoreWrites();
        const updateField = isCustomSchedule
          ? { customProgress: newProg }
          : { defaultProgress: newProg };
        updateUserData(currentUserRef.current.uid, updateField)
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
  }, [isCustomSchedule]);

  const handleExportExcel = () => {
    exportScheduleToExcel(schedule, activeProgressMap);
  };

  const signOut = async () => {
    try {
      console.log('[PlanComponent] Signing out user');
      await auth.signOut();
      clear();
      setItem('version', 'nasb');
      setItem('otChapters', '2');
      setItem('ntChapters', '1');
      setItem('progressMap', {});
      setItem('customProgressMap', {});
      removeItem('defaultSchedule');
      removeItem('customSchedule');
      router.push('/');
    } catch (error) {
      console.error('[PlanComponent] Sign out error:', error);
    }
  };

  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <Header
        currentUser={currentUser}
        syncPending={syncPending}
        signOut={signOut}
        exportToExcel={handleExportExcel}
      />
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
          customSchedule={customSchedule}
        />
        <ScheduleTable
          schedule={schedule}
          progressMap={activeProgressMap}
          handleCheckboxChange={handleCheckboxChange}
        />
      </div>
    </div>
  );
}
