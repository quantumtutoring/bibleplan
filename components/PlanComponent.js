// components/PlanComponent.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { auth } from '../lib/firebase';
import { useUserDataContext } from '../contexts/UserDataContext';
import debounce from 'lodash.debounce';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import ScheduleTable from './ScheduleTable';
import { exportScheduleToExcel } from '../utils/exportExcel';
import useUserDataSync from '../hooks/useUserDataSync';
import useLocalStorage from '../hooks/useLocalStorage';
import useUpdateSchedule from '../hooks/useUpdateSchedule';

export default function PlanComponent() {
  const { getItem, setItem, removeItem, clear } = useLocalStorage();
  const router = useRouter();

  // --- Mounted flag for client-only rendering ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Determine Bible version from URL ---
  const pathname = router.pathname;
  let version = 'nasb';
  if (pathname === '/lsb') version = 'lsb';
  else if (pathname === '/esv') version = 'esv';

  // Store the current version in state.
  const [currentVersion, setCurrentVersion] = useState(version);
  useEffect(() => {
    setCurrentVersion(version);
  }, [version]);

  // Save the current version to localStorage.
  useEffect(() => {
    setItem('version', currentVersion);
  }, [currentVersion, setItem]);

  // --- Lazy Initialization of OT/NT settings and custom schedule mode ---
  const [otChapters, setOtChapters] = useState(() => Number(getItem('otChapters', '2')));
  const [ntChapters, setNtChapters] = useState(() => Number(getItem('ntChapters', '1')));
  const [isCustomSchedule, setIsCustomSchedule] = useState(() => getItem('isCustomSchedule', false));

  // Save settings whenever they change.
  useEffect(() => {
    setItem('otChapters', String(otChapters));
  }, [otChapters, setItem]);

  useEffect(() => {
    setItem('ntChapters', String(ntChapters));
  }, [ntChapters, setItem]);

  useEffect(() => {
    setItem('isCustomSchedule', isCustomSchedule);
  }, [isCustomSchedule, setItem]);

  // --- Other state variables ---
  const [schedule, setSchedule] = useState([]);
  const [defaultProgressMap, setDefaultProgressMap] = useState({});
  const [customProgressMap, setCustomProgressMap] = useState({});
  const [customSchedule, setCustomSchedule] = useState(null);
  const lastCheckedRef = useRef(null);

  const { currentUser, userData } = useUserDataContext();
  const { updateUserData } = useUserDataSync();

  // Extract the updateSchedule function from the custom hook.
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

  // --- Restore stored values from localStorage on mount ---
  useEffect(() => {
    // OT, NT, and isCustomSchedule are already lazily initialized.
    console.log('Restored OT:', otChapters, 'NT:', ntChapters, 'isCustomSchedule:', isCustomSchedule);

    // Restore custom schedule and progress maps (if any).
    const storedCustomSchedule = getItem('customSchedule', null);
    if (storedCustomSchedule) {
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
    // On mount, update the schedule based on the current mode.
    if (isCustomSchedule) {
      updateSchedule(storedCustomSchedule || [], undefined, true);
    } else {
      updateSchedule(otChapters, ntChapters, true);
    }
  }, []); // Run once on mount

  // Note: The auto-update useEffect on OT/NT changes has been removed.
  // The schedule now only updates when the "Generate" button (in ControlsPanel) is pressed.

  // --- Update state from Firestore whenever userData changes ---
  useEffect(() => {
    if (userData) {
      if (userData.settings) {
        if (userData.settings.otChapters) {
          const newOT = Number(userData.settings.otChapters);
          console.log('[PlanComponent] Updating OT chapters from Firestore:', newOT);
          setOtChapters(newOT);
          setItem('otChapters', String(newOT));
        }
        if (userData.settings.ntChapters) {
          const newNT = Number(userData.settings.ntChapters);
          console.log('[PlanComponent] Updating NT chapters from Firestore:', newNT);
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
    }
  }, [userData, setItem]);

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
    const currentProgress = isCustomSchedule ? customProgressMap : defaultProgressMap;
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
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [syncPending, setSyncPending] = useState(false);
  const debouncedSaveRef = useRef(null);
  useEffect(() => {
    debouncedSaveRef.current = debounce(newProg => {
      if (currentUserRef.current) {
        console.log('[PlanComponent] Debounced function triggered. Writing progress:', newProg);
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
  }, [isCustomSchedule, updateUserData]);

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
      removeItem('customSchedule');
      removeItem('isCustomSchedule');
      router.push('/');
    } catch (error) {
      console.error('[PlanComponent] Sign out error:', error);
    }
  };

  // Render only after mounted.
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
        signOut={signOut}
        exportToExcel={handleExportExcel}
      />
      <div className={styles.container} id="main-content">
        <ControlsPanel
          version={currentVersion}
          handleVersionChange={(e) => {
            const newVal = e.target.value;
            console.log('[PlanComponent] Changing version to:', newVal);
            router.push(`/${newVal}`);
          }}
          otChapters={otChapters}
          setOtChapters={setOtChapters}
          ntChapters={ntChapters}
          setNtChapters={setNtChapters}
          updateSchedule={updateSchedule} // Triggered when the Generate button is pressed.
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
