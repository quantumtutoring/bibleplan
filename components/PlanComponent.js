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
  const { getItem, setItem } = useLocalStorage();
  const router = useRouter();

  // Track client-side mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Auth/Firestore.
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // When signed out, use localStorage; when signed in, Firestore is the source.
  const [currentVersion, setCurrentVersion] = useState(() => getItem('version', 'nasb') || 'nasb');
  const [otChapters, setOtChapters] = useState(() => Number(getItem('otChapters', '2')));
  const [ntChapters, setNtChapters] = useState(() => Number(getItem('ntChapters', '1')));
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);

  // NEW: Flag to load Firestore mode (isCustomSchedule) only on first sign in.
  const [initialModeLoaded, setInitialModeLoaded] = useState(false);
  
  // Schedules & progress.
  const [schedule, setSchedule] = useState([]);
  const [defaultProgressMap, setDefaultProgressMap] = useState({});
  const [customProgressMap, setCustomProgressMap] = useState({});
  const [customSchedule, setCustomSchedule] = useState(null);
  const lastCheckedRef = useRef(null);

  // Our schedule update hook.
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

  // On mount: apply forced mode (if any) and restore localStorage data.
  useEffect(() => {
    if (forcedMode === 'default') {
      console.log('[PlanComponent] Forcing Default Mode');
      setIsCustomSchedule(false);
      if (currentUser) {
        updateUserData(currentUser.uid, { isCustomSchedule: false })
          .catch(err => console.error('[PlanComponent] Forced default error:', err));
      }
    } else if (forcedMode === 'custom') {
      console.log('[PlanComponent] Forcing Custom Mode');
      setIsCustomSchedule(true);
      if (currentUser) {
        updateUserData(currentUser.uid, { isCustomSchedule: true })
          .catch(err => console.error('[PlanComponent] Forced custom error:', err));
      }
    }
    const storedCustomSchedule = getItem('customSchedule', null);
    if (forcedMode !== 'default' && storedCustomSchedule) {
      console.log('[PlanComponent] Restoring custom schedule from localStorage.');
      setCustomSchedule(storedCustomSchedule);
    }
    const storedDefaultProgress = getItem('progressMap', null);
    if (storedDefaultProgress) { setDefaultProgressMap(storedDefaultProgress); }
    const storedCustomProgress = getItem('customProgressMap', null);
    if (storedCustomProgress) { setCustomProgressMap(storedCustomProgress); }
    if (forcedMode === 'custom') {
      updateSchedule(storedCustomSchedule || [], undefined, true);
    } else if (forcedMode === 'default') {
      updateSchedule(otChapters, ntChapters, true);
    } else {
      if (isCustomSchedule) {
        updateSchedule(storedCustomSchedule || [], undefined, true);
      } else {
        updateSchedule(otChapters, ntChapters, true);
      }
    }
  }, []); // run once on mount

  // When signed out, write version to localStorage.
  useEffect(() => {
    if (!currentUser) { setItem('version', currentVersion); }
  }, [currentVersion, currentUser, setItem]);

  useEffect(() => { setItem('otChapters', String(otChapters)); }, [otChapters, setItem]);
  useEffect(() => { setItem('ntChapters', String(ntChapters)); }, [ntChapters, setItem]);

  // Merge Firestore settings (OT, NT) into state when signed in.
  useEffect(() => {
    if (currentUser && userData && userData.settings) {
      const { otChapters: fsOT, ntChapters: fsNT } = userData.settings;
      if (fsOT && Number(fsOT) !== otChapters) {
        const newOT = Number(fsOT);
        setOtChapters(newOT);
        setItem('otChapters', String(newOT));
      }
      if (fsNT && Number(fsNT) !== ntChapters) {
        const newNT = Number(fsNT);
        setNtChapters(newNT);
        setItem('ntChapters', String(newNT));
      }
    }
  }, [currentUser, userData?.settings, otChapters, ntChapters, setItem]);

  // Merge Firestore version only once (on first sign in).
  useEffect(() => {
    if (currentUser && userData && userData.settings && !initialModeLoaded) {
      const fsMode = userData.isCustomSchedule; // mode from firestore
      console.log('[PlanComponent] Loading mode from Firestore on first sign in:', fsMode);
      setIsCustomSchedule(fsMode);
      setInitialModeLoaded(true);
    }
  }, [currentUser, userData, initialModeLoaded]);

  // After the initial mode load, update Firestore when currentVersion changes.
  useEffect(() => {
    if (currentUser && initialModeLoaded) {
      updateUserData(currentUser.uid, { settings: { version: currentVersion } })
        .catch(error => console.error('[PlanComponent] Error updating version in Firestore:', error));
    }
  }, [currentVersion, currentUser, updateUserData, initialModeLoaded]);

  // Merge Firestore progress, custom schedule, and isCustomSchedule (except for mode, which we load only initially).
  useEffect(() => {
    if (!userData) return;
    if (userData.defaultProgress && !isEqual(userData.defaultProgress, defaultProgressMap)) {
      setDefaultProgressMap(userData.defaultProgress);
      setItem('progressMap', userData.defaultProgress);
    }
    if (userData.customProgress && !isEqual(userData.customProgress, customProgressMap)) {
      setCustomProgressMap(userData.customProgress);
      setItem('customProgressMap', userData.customProgress);
    }
    if (userData.customSchedule && !isEqual(userData.customSchedule, customSchedule)) {
      console.log('[PlanComponent] Restoring custom schedule from Firestore.');
      setCustomSchedule(userData.customSchedule);
    }
    // Note: We no longer merge isCustomSchedule after initial load.
  }, [userData, setItem, defaultProgressMap, customProgressMap, customSchedule]);

  const activeProgressMap = isCustomSchedule ? customProgressMap : defaultProgressMap;
  const activeSchedule = isCustomSchedule ? customSchedule : schedule;

  // Recalculate schedule links whenever version, schedule, or mode changes.
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

  const handleCheckboxChange = (day, checked, event) => {
    const currentProgress = isCustomSchedule ? customProgressMap : defaultProgressMap;
    let newProg;
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
          .catch(error => console.error('[PlanComponent] Error saving progress:', error));
      }
    }, 1000);
    return () => { debouncedSaveRef.current.cancel(); };
  }, [isCustomSchedule, updateUserData]);

  const handleExportExcel = () => { exportScheduleToExcel(activeSchedule, activeProgressMap); };

  if (!mounted) return null; // SSR guard

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
      />
      <div className={styles.container} id="main-content">
        <ControlsPanel
          version={currentVersion}
          setCurrentVersion={setCurrentVersion}
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
