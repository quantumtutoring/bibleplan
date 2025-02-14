import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import { useListenFireStore } from '../contexts/ListenFireStore';
import debounce from 'lodash.debounce';
import isEqual from 'lodash.isequal';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
import { exportScheduleToExcel } from '../utils/exportExcel';
import writeFireStore from '../hooks/writeFireStore';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateSchedule from '../hooks/useUpdateSchedule';

export default function PlanComponent({ forcedMode }) {
  const { getItem, setItem, clear } = useLocalStorage();
  const router = useRouter();

  // --- Mount flag ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // --- Auth/Firestore ---
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // --- State for settings ---
  const [currentVersion, setCurrentVersion] = useState(() =>
    currentUser ? "nasb" : (getItem('version', 'nasb') || 'nasb')
  );
  const [otChapters, setOtChapters] = useState(() =>
    currentUser ? "2" : (getItem('otChapters', '2') || "2")
  );
  const [ntChapters, setNtChapters] = useState(() =>
    currentUser ? "1" : (getItem('ntChapters', '1') || "1")
  );
  // Use local state for mode (custom vs. default)
  const [isCustomSchedule, setIsCustomSchedule] = useState(() =>
    currentUser ? false : getItem('isCustomSchedule', false)
  );

  // Only version and mode use initial flags.
  const [initialVersionLoaded, setInitialVersionLoaded] = useState(false);
  const [initialModeLoaded, setInitialModeLoaded] = useState(false);
  // For OT/NT, load them from Firestore only once.
  const [initialChaptersLoaded, setInitialChaptersLoaded] = useState(false);

  // --- State for schedule and progress ---
  const [schedule, setSchedule] = useState([]);
  const [defaultProgressMap, setDefaultProgressMap] = useState(() =>
    currentUser ? {} : getItem('progressMap', {})
  );
  const [customProgressMap, setCustomProgressMap] = useState(() =>
    currentUser ? {} : getItem('customProgressMap', {})
  );
  const [customSchedule, setCustomSchedule] = useState(() =>
    currentUser ? null : getItem('customSchedule', null)
  );
  const lastCheckedRef = useRef(null);

  // --- Schedule update hook ---
  const updateSchedule = useUpdateSchedule({
    currentVersion,
    setSchedule,
    setCustomSchedule,
    setIsCustomSchedule,
    setDefaultProgressMap,
    setCustomProgressMap,
    setItem,
    updateUserData,
    currentUser,
  });

  // --- Reset function for sign-out ---
  const resetState = () => {
    setCurrentVersion("nasb");
    setOtChapters("2");
    setNtChapters("1");
    setIsCustomSchedule(false);
    setSchedule([]);
    setDefaultProgressMap({});
    setCustomProgressMap({});
    setCustomSchedule(null);
  };

  // --- On mount: update local mode based on forcedMode only ---
  useEffect(() => {
    if (forcedMode === 'custom') {
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
    } else if (forcedMode === 'default') {
      setIsCustomSchedule(false);
      setItem('isCustomSchedule', false);
    }
    // Removed calls to updateSchedule that would trigger Firestore writes.
  }, []); // Run once on mount.

  // --- Write settings to localStorage if signed out ---
  useEffect(() => { if (!currentUser) setItem('version', currentVersion); }, [currentVersion, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('otChapters', otChapters); }, [otChapters, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('ntChapters', ntChapters); }, [ntChapters, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('isCustomSchedule', isCustomSchedule); }, [isCustomSchedule, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('progressMap', defaultProgressMap); }, [defaultProgressMap, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('customProgressMap', customProgressMap); }, [customProgressMap, currentUser, setItem]);
  useEffect(() => { if (!currentUser) setItem('customSchedule', customSchedule); }, [customSchedule, currentUser, setItem]);

  // --- Merge Firestore settings (OT, NT) when signed in, but only once ---
  useEffect(() => {
    if (currentUser && userData && userData.settings && !initialChaptersLoaded) {
      const { otChapters: fsOT, ntChapters: fsNT } = userData.settings;
      if (fsOT != null && String(fsOT) !== otChapters) { setOtChapters(String(fsOT)); }
      if (fsNT != null && String(fsNT) !== ntChapters) { setNtChapters(String(fsNT)); }
      setInitialChaptersLoaded(true);
    }
  }, [currentUser, userData?.settings, initialChaptersLoaded, otChapters, ntChapters]);

  // --- Merge Firestore version only once on first sign in ---
  useEffect(() => {
    if (currentUser && userData && userData.settings && !initialVersionLoaded) {
      const fsVersion = userData.settings.version;
      if (fsVersion && fsVersion !== currentVersion) { setCurrentVersion(fsVersion); }
      setInitialVersionLoaded(true);
    }
  }, [currentUser, userData?.settings, initialVersionLoaded, currentVersion]);

  // --- Merge Firestore mode only once on first sign in ---
  useEffect(() => {
    if (currentUser && userData && typeof userData.isCustomSchedule === 'boolean' && !initialModeLoaded) {
      setIsCustomSchedule(userData.isCustomSchedule);
      setInitialModeLoaded(true);
    }
  }, [currentUser, userData, initialModeLoaded]);

  // --- Merge Firestore progress, custom progress, and custom schedule continuously ---
  useEffect(() => {
    if (currentUser && userData) {
      if (userData.defaultProgress && !isEqual(userData.defaultProgress, defaultProgressMap)) {
        setDefaultProgressMap(userData.defaultProgress);
      }
      if (userData.customProgress && !isEqual(userData.customProgress, customProgressMap)) {
        setCustomProgressMap(userData.customProgress);
      }
      if (userData.customSchedule && !isEqual(userData.customSchedule, customSchedule)) {
        setCustomSchedule(userData.customSchedule);
      }
    }
  }, [currentUser, userData]);

  // --- Determine which progress map and schedule to display ---
  const activeProgressMap = isCustomSchedule ? customProgressMap : defaultProgressMap;
  const activeSchedule = isCustomSchedule ? customSchedule : schedule;

  // --- Recalculate schedule links when version, schedule, or mode changes ---
  useEffect(() => {
    if (!activeSchedule || activeSchedule.length === 0) return;
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
      isCustomSchedule ? setCustomSchedule(updatedSchedule) : setSchedule(updatedSchedule);
    }
  }, [currentVersion, activeSchedule, isCustomSchedule]);

  // --- Handler for checkbox changes (unchanged) ---
  const handleCheckboxChange = (day, checked, event) => {
    const currentProgress = isCustomSchedule ? customProgressMap : defaultProgressMap;
    let newProg;
    if (event.shiftKey && lastCheckedRef.current !== null) {
      const start = Math.min(lastCheckedRef.current, day);
      const end = Math.max(lastCheckedRef.current, day);
      newProg = { ...currentProgress };
      for (let i = start; i <= end; i++) {
        newProg[i] = checked;
      }
    } else {
      newProg = { ...currentProgress, [day]: checked };
    }
    
    if (isEqual(newProg, currentProgress)) return;
    
    if (isCustomSchedule) {
      setCustomProgressMap(newProg);
    } else {
      setDefaultProgressMap(newProg);
    }
    if (!currentUser) {
      if (isCustomSchedule) {
        setItem('customProgressMap', newProg);
      } else {
        setItem('progressMap', newProg);
      }
    }
    // (Debounced saving for progress updates remains unchanged.)
    setSyncPending(true);
    if (currentUserRef.current && debouncedSaveRef.current) {
      debouncedSaveRef.current(newProg);
    }
    lastCheckedRef.current = day;
  };

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const [syncPending, setSyncPending] = useState(false);
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce(newProg => {
      if (currentUserRef.current) {
        const updateField = isCustomSchedule
          ? { customProgress: newProg }
          : { defaultProgress: newProg };
        updateUserData(currentUserRef.current.uid, updateField)
          .then(() => setSyncPending(false))
          .catch(console.error);
      }
    }, 1000);
    return () => { debouncedSaveRef.current.cancel(); };
  }, [isCustomSchedule, updateUserData]);

  const handleExportExcel = () => { exportScheduleToExcel(activeSchedule, activeProgressMap); };

  // --- Handlers for version change (remains unchanged) ---
  const handleVersionChange = (newVersion) => {
    setCurrentVersion(newVersion);
    if (currentUser) {
      updateUserData(currentUser.uid, { settings: { version: newVersion } })
        .catch(console.error);
    }
  };

  // Handler for mode changes now only updates local state.
  const handleModeChange = (newMode) => {
    setIsCustomSchedule(newMode);
    setItem('isCustomSchedule', newMode);
  };

  // --- Routing useEffect remains as needed ---
  useEffect(() => {
    if (!mounted) return;
    // Optionally, you can use URL as the source of truth for UI mode.
    if (router.pathname === '/custom' && !isCustomSchedule) {
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
    } else if (router.pathname === '/' && isCustomSchedule) {
      setIsCustomSchedule(false);
      setItem('isCustomSchedule', false);
    }
  }, [router.pathname, mounted, isCustomSchedule, setItem]);

  if (!mounted) return null;

  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <Header
        currentUser={currentUser}
        syncPending={syncPending}
        exportToExcel={handleExportExcel}
        version={currentVersion}
        isCustomSchedule={isCustomSchedule}
        resetState={resetState}
      />
      <div className={styles.container} id="main-content">
        <ControlsPanel
          currentUser={currentUser}
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
          handleModeChange={handleModeChange}
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
