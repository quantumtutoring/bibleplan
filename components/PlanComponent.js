// components/PlanComponent.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import { useListenFireStore } from '../contexts/ListenFireStore';
import debounce from 'lodash.debounce';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
import { exportScheduleToExcel } from '../utils/exportExcel';
import writeFireStore from '../hooks/writeFireStore';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateSchedule from '../hooks/useUpdateSchedule';

/**
 * PlanComponent
 *
 * "Option A": If forcedMode is provided ("default" or "custom"), we apply that first,
 * then restore local data conditionally, ensuring forced default doesn't get overwritten.
 */
export default function PlanComponent({ forcedMode }) {
  const { getItem, setItem, removeItem, clear } = useLocalStorage();
  const router = useRouter();

  // Track if we've done client-side mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth/Firestore
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // Version from localStorage (fallback = "nasb")
  const [currentVersion, setCurrentVersion] = useState(() => {
    return getItem('version', 'nasb') || 'nasb';
  });

  // OT/NT from localStorage
  const [otChapters, setOtChapters] = useState(() => Number(getItem('otChapters', '2')));
  const [ntChapters, setNtChapters] = useState(() => Number(getItem('ntChapters', '1')));

  // isCustomSchedule also from localStorage, but can be overridden by forcedMode
  const [isCustomSchedule, setIsCustomSchedule] = useState(() => getItem('isCustomSchedule', false));

  // Schedules & progress
  const [schedule, setSchedule] = useState([]);
  const [defaultProgressMap, setDefaultProgressMap] = useState({});
  const [customProgressMap, setCustomProgressMap] = useState({});
  const [customSchedule, setCustomSchedule] = useState(null);
  const lastCheckedRef = useRef(null);

  // Our schedule update hook
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

  /**
   * On mount, we:
   * 1) Force the mode (if forcedMode is given).
   * 2) Restore localStorage data conditionally (avoid overwriting forced default with custom).
   * 3) Generate schedule according to final isCustomSchedule (or forcedMode).
   */
  useEffect(() => {
    // 1) If forcedMode is "default" or "custom," override isCustomSchedule
    if (forcedMode === 'default') {
      console.log('[PlanComponent] Forcing Default Mode');
      setIsCustomSchedule(false);
      setItem('isCustomSchedule', false);
      if (currentUser) {
        updateUserData(currentUser.uid, { isCustomSchedule: false })
          .catch(err => console.error('[PlanComponent] Forced default error:', err));
      }
    } else if (forcedMode === 'custom') {
      console.log('[PlanComponent] Forcing Custom Mode');
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
      if (currentUser) {
        updateUserData(currentUser.uid, { isCustomSchedule: true })
          .catch(err => console.error('[PlanComponent] Forced custom error:', err));
      }
    }

    // 2) Restore from localStorage, *unless* forcedMode == 'default' (where we skip custom)
    const storedCustomSchedule = getItem('customSchedule', null);
    if (forcedMode !== 'default' && storedCustomSchedule) {
      console.log('[PlanComponent] Restoring custom schedule from localStorage.');
      setCustomSchedule(storedCustomSchedule);
    }
    const storedDefaultProgress = getItem('progressMap', null);
    if (storedDefaultProgress) {
      setDefaultProgressMap(storedDefaultProgress);
    }
    const storedCustomProgress = getItem('customProgressMap', null);
    if (storedCustomProgress) {
      setCustomProgressMap(storedCustomProgress);
    }

    // 3) Use updateSchedule based on the final mode
    // If forcedMode is 'custom', definitely call custom.
    // If forcedMode is 'default', call default schedule.
    // Otherwise, fallback to whichever isCustomSchedule is in localStorage
    if (forcedMode === 'custom') {
      updateSchedule(storedCustomSchedule || [], undefined, true);
    } else if (forcedMode === 'default') {
      updateSchedule(otChapters, ntChapters, true);
    } else {
      // No forced mode, or forcedMode is undefined
      if (isCustomSchedule) {
        updateSchedule(storedCustomSchedule || [], undefined, true);
      } else {
        updateSchedule(otChapters, ntChapters, true);
      }
    }
  }, []); // single run on mount

  /**
   * Keep track of local changes to version, otChapters, ntChapters, isCustomSchedule
   * and store them in localStorage (and Firestore if needed).
   */
  useEffect(() => {
    setItem('version', currentVersion);
    if (currentUser) {
      updateUserData(currentUser.uid, {
        settings: { version: currentVersion },
      }).catch(error => console.error('[PlanComponent] Error updating version in Firestore:', error));
    }
  }, [currentVersion, currentUser, setItem, updateUserData]);

  useEffect(() => {
    setItem('otChapters', String(otChapters));
  }, [otChapters, setItem]);

  useEffect(() => {
    setItem('ntChapters', String(ntChapters));
  }, [ntChapters, setItem]);

  // If forcedMode changes dynamically after mount, you might want to handle that too.
  // Omitted here for simplicity.

  // Also keep isCustomSchedule in localStorage
  useEffect(() => {
    setItem('isCustomSchedule', isCustomSchedule);
  }, [isCustomSchedule, setItem]);

  // If userData from Firestore changes, possibly merge it in
  useEffect(() => {
    if (!userData) return;
    if (userData.settings) {
      if (userData.settings.version && userData.settings.version !== currentVersion) {
        setCurrentVersion(userData.settings.version);
      }
      if (userData.settings.otChapters) {
        const newOT = Number(userData.settings.otChapters);
        setOtChapters(newOT);
        setItem('otChapters', String(newOT));
      }
      if (userData.settings.ntChapters) {
        const newNT = Number(userData.settings.ntChapters);
        setNtChapters(newNT);
        setItem('ntChapters', String(newNT));
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
    if (userData.customSchedule) {
      console.log('[PlanComponent] Restoring custom schedule from Firestore.');
      setCustomSchedule(userData.customSchedule);
    }
    if (typeof userData.isCustomSchedule === 'boolean') {
      setIsCustomSchedule(userData.isCustomSchedule);
    }
  }, [userData, currentVersion, setItem]);

  // Identify which schedule & progress to show
  const activeProgressMap = isCustomSchedule ? customProgressMap : defaultProgressMap;
  const activeSchedule = isCustomSchedule ? customSchedule : schedule;

  // Recalculate schedule links whenever version/schedule/mode changes
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
      if (isCustomSchedule) {
        setCustomSchedule(updatedSchedule);
      } else {
        setSchedule(updatedSchedule);
      }
    }
  }, [currentVersion, activeSchedule, isCustomSchedule]);

  // Checkbox changes for progress
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

  // Keep the currentUser in a ref for debounced writes
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [syncPending, setSyncPending] = useState(false);
  const debouncedSaveRef = useRef(null);

  // Debounce for progress
  useEffect(() => {
    debouncedSaveRef.current = debounce(newProg => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Debounced progress sync:', newProg);
        const updateField = isCustomSchedule
          ? { customProgress: newProg }
          : { defaultProgress: newProg };
        updateUserData(currentUserRef.current.uid, updateField)
          .then(() => {
            setSyncPending(false);
          })
          .catch(error => console.error('[PlanComponent] Error saving progress:', error));
      }
    }, 1000);

    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, [isCustomSchedule, updateUserData]);

  // Export to Excel
  const handleExportExcel = () => {
    exportScheduleToExcel(activeSchedule, activeProgressMap);
  };


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
