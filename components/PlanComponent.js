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
  const router = useRouter();

  // Determine the Bible version solely from the URL (using pathname)
  const pathname = router.pathname;
  let version = 'nasb';
  if (pathname === '/lsb') version = 'lsb';
  else if (pathname === '/esv') version = 'esv';

  // Store the current version in state.
  const [currentVersion, setCurrentVersion] = useState(version);
  useEffect(() => {
    setCurrentVersion(version);
  }, [version]);

  // Save the current version to localStorage so that index.js can read it.
  useEffect(() => {
    setItem("version", currentVersion);
  }, [currentVersion, setItem]);

  // When the user selects a new version from the dropdown, navigate to that route.
  const handleVersionChange = (e) => {
    const newVal = e.target.value;
    console.log('[PlanComponent] Changing version to:', newVal);
    router.push(`/${newVal}`);
  };

  const [firestoreReads, setFirestoreReads] = useState(0);
  const [firestoreWrites, setFirestoreWrites] = useState(0);
  const incrementFirestoreReads = () => setFirestoreReads(prev => prev + 1);
  const incrementFirestoreWrites = () => {
    setFirestoreWrites(prev => {
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

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // State for chapters, schedule, and progress maps.
  const [otChapters, setOtChapters] = useState(2);
  const [ntChapters, setNtChapters] = useState(1);
  const [schedule, setSchedule] = useState([]);
  const [defaultProgressMap, setDefaultProgressMap] = useState(null);
  const [customProgressMap, setCustomProgressMap] = useState(null);
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [syncPending, setSyncPending] = useState(false);
  const lastCheckedRef = useRef(null);
  const oldSettingsRef = useRef({ ot: null, nt: null, total: null });
  const [customSchedule, setCustomSchedule] = useState(null);
  const initialScheduleLoaded = useRef(false);

  const { updateUserData } = useUserDataSync();

  // Restore stored values (except version) from localStorage.
  // Run only once on mount.
  useEffect(() => {
    const storedOT = getItem('otChapters', null);
    if (storedOT !== null) { setOtChapters(Number(storedOT)); }
    const storedNT = getItem('ntChapters', null);
    if (storedNT !== null) { setNtChapters(Number(storedNT)); }
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
    const storedDefaultProgress = getItem('progressMap', null);
    if (storedDefaultProgress) { setDefaultProgressMap(storedDefaultProgress); }
    const storedCustomProgress = getItem('customProgressMap', null);
    if (storedCustomProgress) { setCustomProgressMap(storedCustomProgress); }
    const savedMode = getItem('isCustomSchedule', false);
    setIsCustomSchedule(savedMode);
    if (!storedDefaultSchedule && !userData) {
      updateSchedule(storedOT || otChapters, storedNT || ntChapters, true);
    }
    initialScheduleLoaded.current = true;
  }, []); // Run only once on mount

  // Also update state from Firestore whenever userData changes.
  useEffect(() => {
    if (userData) {
      if (userData.settings) {
        if (userData.settings.otChapters) {
          const newOT = Number(userData.settings.otChapters);
          console.log('[PlanComponent] Updating OT chapters from Firestore:', newOT);
          setOtChapters(newOT);
          setItem('otChapters', newOT);
        }
        if (userData.settings.ntChapters) {
          const newNT = Number(userData.settings.ntChapters);
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
      if (userData.schedule) {
        console.log('[PlanComponent] Restoring default schedule from Firestore.');
        setSchedule(userData.schedule);
      }
      if (userData.customSchedule) {
        console.log('[PlanComponent] Restoring custom schedule from Firestore.');
        setCustomSchedule(userData.customSchedule);
      }
      if (typeof userData.isCustomSchedule === "boolean") {
        setIsCustomSchedule(userData.isCustomSchedule);
      }
    }
  }, [userData]);

  /**
   * updateSchedule:
   *
   * For custom schedules, we generate two versions:
   * - A full custom schedule with URLs for local use.
   * - A stripped custom schedule (without URL fields) for Firestore.
   *
   * For default schedules, the link text now uses a comma instead of a pipe.
   */
  const updateSchedule = (
    scheduleOrOt,
    nt,
    fromInit = false,
    forceUpdate = false,
    clearProgress = false
  ) => {
    // Custom schedule branch.
    if (Array.isArray(scheduleOrOt)) {
      console.log('[PlanComponent] Custom schedule provided.');
      // Generate the full custom schedule (with URLs) for local use.
      const fullCustomSchedule = scheduleOrOt.map(item => {
        let newUrl;
        if (currentVersion === 'lsb') {
          newUrl = `https://read.lsbible.org/?q=${encodeURIComponent(item.passages)}`;
        } else if (currentVersion === 'esv') {
          newUrl = `https://esv.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        } else {
          newUrl = `https://www.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        }
        return { ...item, url: newUrl };
      });
      // Create a stripped version (without URL fields) for Firestore.
      const strippedCustomSchedule = fullCustomSchedule.map(({ day, passages }) => ({
        day,
        passages,
      }));
      setCustomSchedule(fullCustomSchedule);
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
      if (clearProgress) {
        setCustomProgressMap({});
        setItem('customProgressMap', {});
      }
      // Store the full custom schedule locally.
      setItem('customSchedule', fullCustomSchedule);
      // Combine custom schedule update and clearing progress (if needed) into one write.
      if (currentUser) {
        const updateData = { customSchedule: strippedCustomSchedule };
        if (clearProgress) {
          updateData.customProgress = {};
        }
        incrementFirestoreWrites();
        updateUserData(currentUser.uid, updateData)
          .then(() =>
            console.log('[PlanComponent] Custom schedule saved to Firestore without URLs')
          )
          .catch(error =>
            console.error('[PlanComponent] Error saving custom schedule:', error)
          );
      }
      setSchedule(fullCustomSchedule);
      return;
    }
    // Default schedule branch.
    const otNum = parseInt(scheduleOrOt, 10);
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
        'Please enter a valid number between 1 and 100 for both OT and NT chapters per day.'
      );
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

    // Generate the schedule.
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
      let url;
      if (currentVersion === 'lsb') {
        url = `https://read.lsbible.org/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      } else if (currentVersion === 'esv') {
        url = `https://esv.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      } else {
        url = `https://www.literalword.com/?q=${encodeURIComponent(otText)}, ${encodeURIComponent(ntText)}`;
      }
      // Use a comma separator for default schedule display.
      const linkText = `${otText}, ${ntText}`;
      newSchedule.push({ day, passages: linkText, url });
    }
    setIsCustomSchedule(false);
    setItem('isCustomSchedule', false);
    if (clearProgress) {
      setDefaultProgressMap({});
      setItem('progressMap', {});
    }
    setSchedule(newSchedule);
    setItem('defaultSchedule', newSchedule);

    // Combine the settings and schedule updates into a single Firestore write.
    if (currentUser) {
      const updateData = {
        settings: { otChapters: otNum, ntChapters: ntNum },
        schedule: newSchedule,
      };
      if (clearProgress) {
        updateData.defaultProgress = {};
      }
      incrementFirestoreWrites();
      updateUserData(currentUser.uid, updateData)
        .then(() => console.log('[PlanComponent] Default schedule and settings saved to Firestore'))
        .catch(error => console.error('[PlanComponent] Error saving default schedule:', error));
    }
  };

  const activeProgressMap = isCustomSchedule ? customProgressMap : defaultProgressMap;
  const activeSchedule = isCustomSchedule ? customSchedule : schedule;

  // Recalculate schedule links whenever currentVersion, activeSchedule, or isCustomSchedule changes.
  useEffect(() => {
    if (activeSchedule && activeSchedule.length > 0) {
      const updatedSchedule = activeSchedule.map(item => {
        let newUrl;
        if (currentVersion === 'lsb') {
          newUrl = `https://read.lsbible.org/?q=${encodeURIComponent(item.passages)}`;
        } else if (currentVersion === 'esv') {
          newUrl = `https://esv.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        } else {
          newUrl = `https://www.literalword.com/?q=${encodeURIComponent(item.passages)}`;
        }
        return { ...item, url: newUrl };
      });
      let hasChanged = false;
      for (let i = 0; i < activeSchedule.length; i++) {
        if (activeSchedule[i].url !== updatedSchedule[i].url) {
          hasChanged = true;
          break;
        }
      }
      if (hasChanged) {
        if (isCustomSchedule) {
          setCustomSchedule(updatedSchedule);
        } else {
          setSchedule(updatedSchedule);
        }
      }
    }
  }, [currentVersion, activeSchedule, isCustomSchedule]);

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
    debouncedSaveRef.current = debounce(newProg => {
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
          .catch(error =>
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
          version={currentVersion}
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
