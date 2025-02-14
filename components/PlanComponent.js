// components/PlanComponent.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { useListenFireStore } from '../contexts/ListenFireStore';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import DefaultPlan from './DefaultPlan';
import CustomPlan from './CustomPlan';
import { exportScheduleToExcel } from '../utils/exportExcel';
import writeFireStore from '../hooks/writeFireStore';
import useLocalStorage from '../hooks/useLocalStorage';

export default function PlanComponent({ forcedMode }) {
  const { getItem, setItem } = useLocalStorage();
  const router = useRouter();

  // --- Mount flag ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- Auth/Firestore ---
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();




  // --- State for settings ---
  // Initialize version and chapters from localStorage.
  const [currentVersion, setCurrentVersion] = useState(() => getItem('version', 'nasb'));
  const [otChapters, setOtChapters] = useState(() => {
    // If userData is already available and contains otChapters, use it; otherwise, fall back to localStorage.
    return currentUser && userData && userData.otChapters
      ? userData.otChapters : getItem('otChapters', '2');
  });
  
  const [ntChapters, setNtChapters] = useState(() => {
    return currentUser && userData && userData.ntChapters
      ? userData.ntChapters : getItem('ntChapters', '1');
  });
  // Determine mode from forcedMode prop, localStorage, or default.
  const [isCustomSchedule, setIsCustomSchedule] = useState(() => {
    if (forcedMode === 'custom') return true;
    if (forcedMode === 'default') return false;
    return getItem('isCustomSchedule', false);
  });

  // --- New state for custom input and generation trigger ---
  const [customPlanText, setCustomPlanText] = useState('');
  const [generateTrigger, setGenerateTrigger] = useState(0);
  const handleGenerate = () => {
    setGenerateTrigger(prev => prev + 1);
  };

  // --- reset state ---
  const resetState = () => {
    // Clear all localStorage
    localStorage.clear();
  
    // Reset local state to defaults
    setCurrentVersion("nasb");
    setOtChapters("2");
    setNtChapters("1");
    setIsCustomSchedule(false);
  
    // Optionally, reinitialize localStorage with defaults if your app expects those keys to exist
    setItem("version", "nasb");
    setItem("otChapters", "2");
    setItem("ntChapters", "1");
    setItem("isCustomSchedule", false);
  };
  
 
  // --- Routing: update mode based on URL ---
  useEffect(() => {
    if (router.pathname === '/custom' && !isCustomSchedule) {
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
    } else if (router.pathname === '/' && isCustomSchedule) {
      setIsCustomSchedule(false);
      setItem('isCustomSchedule', false);
    }
  }, [router.pathname, isCustomSchedule, setItem]);

  // --- Version change handler ---
  const handleVersionChange = (newVersion) => {
    setCurrentVersion(newVersion);
    setItem('version', newVersion);
  };
  

  // --- Update localStorage when version changes ---
  useEffect(() => {
    setItem('version', currentVersion);
  }, [currentVersion, setItem]);

  // --- When a user signs in, override version with Firestore value if present ---
  useEffect(() => {
    if (currentUser && userData && userData.version) {
      if (userData.version !== currentVersion) {
        setCurrentVersion(userData.version);
        setItem('version', userData.version);
      }
    }
  }, []); //don't do it continuously


  // -- keep chapters/day updated from firestore
  useEffect(() => {
    if (currentUser && userData) {
      if (userData.otChapters && userData.otChapters !== otChapters) {
        setOtChapters(userData.otChapters);
        setItem('otChapters', userData.otChapters);
      }
      if (userData.ntChapters && userData.ntChapters !== ntChapters) {
        setNtChapters(userData.ntChapters);
        setItem('ntChapters', userData.ntChapters);
      }
    }
  }, [currentUser, userData, setItem]);

  // -- update localstorage with them

  useEffect(() => {
    setItem('otChapters', otChapters);
  }, [otChapters, setItem]);
  
  useEffect(() => {
    setItem('ntChapters', ntChapters);
  }, [ntChapters, setItem]);
  

  // --- Export handler (passed to ControlsPanel if needed) ---
  const handleExportExcel = (schedule, progressMap) => {
    exportScheduleToExcel(schedule, progressMap);
  };

  if (!mounted) return null;

  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <Header
        currentUser={currentUser}
        version={currentVersion}
        handleVersionChange={handleVersionChange}
        resetState={resetState}
        isCustomSchedule={isCustomSchedule} 
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
          isCustomSchedule={isCustomSchedule}
          updateUserData={updateUserData}
          customPlanText={customPlanText}
          setCustomPlanText={setCustomPlanText}
          onGenerate={handleGenerate}
          exportToExcel={handleExportExcel}
        
        />
        {isCustomSchedule ? (
          <CustomPlan
            currentUser={currentUser}
            userData={userData}
            currentVersion={currentVersion}
            updateUserData={updateUserData}
            customPlanText={customPlanText}
            generateTrigger={generateTrigger}
          />
        ) : (
          <DefaultPlan
            currentUser={currentUser}
            userData={userData}
            currentVersion={currentVersion}
            otChapters={otChapters}
            ntChapters={ntChapters}
            updateUserData={updateUserData}
            generateTrigger={generateTrigger}
          />
        )}
      </div>
    </div>
  );
}
