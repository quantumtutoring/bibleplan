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
  // Use null as the default so that a stored progress map isn’t overwritten by an empty object.
  const [defaultProgressMap, setDefaultProgressMap] = useState(null);
  const [customProgressMap, setCustomProgressMap] = useState(null);
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
    const storedVersion = getItem('version', null);
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

  // Restore stored values (both schedules and progress maps) from local storage.
  useEffect(() => {
    // Load OT/NT chapters.
    const storedOT = getItem('otChapters', null);
    if (storedOT) { setOtChapters(storedOT); }
    const storedNT = getItem('ntChapters', null);
    if (storedNT) { setNtChapters(storedNT); }
    // Load default schedule.
    const storedDefaultSchedule = getItem('defaultSchedule', null);
    if (storedDefaultSchedule) {
      console.log('[PlanComponent] Restoring default schedule from localStorage.');
      setSchedule(storedDefaultSchedule);
    }
    // Load custom schedule.
    const storedCustomSchedule = getItem('customSchedule', null);
    if (storedCustomSchedule) {
      console.log('[PlanComponent] Restoring custom schedule from localStorage.');
      setCustomSchedule(storedCustomSchedule);
    }
    // Load progress maps.
    const storedDefaultProgress = getItem('progressMap', null);
    if (storedDefaultProgress) { setDefaultProgressMap(storedDefaultProgress); }
    const storedCustomProgress = getItem('customProgressMap', null);
    if (storedCustomProgress) { setCustomProgressMap(storedCustomProgress); }
    // Load mode flag.
    const savedMode = getItem('isCustomSchedule', false);
    setIsCustomSchedule(savedMode);
    // If no default schedule is stored (and no userData to generate one), generate one.
    if (!storedDefaultSchedule && !userData) {
         updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
    }
    initialScheduleLoaded.current = true;
  }, [currentUser, loading]);

  // Also, if userData is available from Firestore, use that to update values (if not already loaded).
  useEffect(() => {
    if (userData && !initialScheduleLoaded.current) {
      if (userData.settings) {
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
      if (userData.defaultProgress) {
        setDefaultProgressMap(userData.defaultProgress);
        setItem('progressMap', userData.defaultProgress);
      }
      if (userData.customProgress) {
        setCustomProgressMap(userData.customProgress);
        setItem('customProgressMap', userData.customProgress);
      }
      const storedDefaultSchedule = getItem('defaultSchedule', null);
      if (storedDefaultSchedule) {
        console.log('[PlanComponent] Restoring default schedule from localStorage.');
        setSchedule(storedDefaultSchedule);
      }
      const storedCustomSchedule = getItem('customSchedule', null);
      if (storedCustomSchedule) {
        console.log('[PlanComponent] Restoring custom schedule from localStorage.');
        setCustomSchedule(storedCustomSchedule);
      }
      const savedMode = getItem('isCustomSchedule', false);
      setIsCustomSchedule(savedMode);
      initialScheduleLoaded.current = true;
    }
  }, [userData]);

  // Combined function to update the user document.
  // updateCombinedUserData now accepts a third parameter "updateProgress" (default true).
  const updateCombinedUserData = (ot, nt, updateProgress = true) => {
    const data = {
      settings: { otChapters: ot, ntChapters: nt }
    };
    if (updateProgress) {
      data.progress = {};
    }
    updateUserDoc(data);
  };

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

  /**
   * updateSchedule:
   *
   * Two branches:
   *
   * 1. Custom schedule branch:
   *    If the first argument is an array, treat it as a custom schedule.
   *    - Save the custom schedule (and clear its progress if clearProgress is true).
   *
   * 2. Default schedule branch:
   *    Otherwise, generate the schedule from the OT/NT numbers.
   *
   * New Parameter: preserveProgress (default false) – if true, the default progress map is preserved.
   */
  const updateSchedule = (scheduleOrOt, nt, fromInit = false, forceUpdate = false, clearProgress = false, preserveProgress = false) => {
    // Custom schedule branch.
    if (Array.isArray(scheduleOrOt)) {
      console.log('[PlanComponent] Custom schedule provided.');
      setCustomSchedule(scheduleOrOt);
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
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
      // IMPORTANT: When updating a custom schedule, we also update the displayed schedule.
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
      // If preserveProgress is true, then we pass false to updateCombinedUserData for updating progress.
      updateCombinedUserData(otNum, ntNum, !preserveProgress);
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
    setItem('isCustomSchedule', false);
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
  // Compute the active schedule. If in custom mode, use the custom schedule; otherwise, the default schedule.
  const activeSchedule = isCustomSchedule ? customSchedule : schedule;

  // Update the checkbox change handler.
  const handleCheckboxChange = (day, checked, event) => {
    console.log(`[PlanComponent] Checkbox changed for day ${day} to ${checked}`);
    let newProg;
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
    exportScheduleToExcel(activeSchedule, activeProgressMap);
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
          isCustomSchedule={isCustomSchedule}
          setIsCustomSchedule={setIsCustomSchedule}
        />
        {/* Render the table only if the active schedule exists. */}
        {activeSchedule && activeSchedule.length > 0 && (
          <ScheduleTable
            schedule={activeSchedule}
            progressMap={activeProgressMap}
            handleCheckboxChange={handleCheckboxChange}
          />
        )}
      </div>
    </div>
  );
}
