// PlanComponent.js
import { useState, useEffect, useRef } from 'react';
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
  const [currentVersion, setCurrentVersion] = useState(() => getItem('version', 'nasb'));
  const [otChapters, setOtChapters] = useState(() =>
    currentUser && userData && userData.otChapters
      ? userData.otChapters
      : getItem('otChapters', '2')
  );
  const [ntChapters, setNtChapters] = useState(() =>
    currentUser && userData && userData.ntChapters
      ? userData.ntChapters
      : getItem('ntChapters', '1')
  );
  const [isCustomSchedule, setIsCustomSchedule] = useState(() => {
    if (forcedMode === 'custom') return true;
    if (forcedMode === 'default') return false;
    return getItem('isCustomSchedule', false);
  });
  const [customPlanText, setCustomPlanText] = useState('');

  // Create refs for DefaultPlan and CustomPlan.
  const defaultPlanRef = useRef();
  const customPlanRef = useRef();

  // Combined generate handler.
  const handleGenerate = () => {
    if (isCustomSchedule) {
      // Call custom plan's generate method via its ref.
      if (customPlanRef.current) {
        customPlanRef.current.generateSchedule();
      }
    } else {
      // For default mode, clear progress on generate.
      if (defaultPlanRef.current) {
        defaultPlanRef.current.generateSchedule(true);
      }
    }
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

  // --- Update localStorage when settings change ---
  useEffect(() => {
    setItem('version', currentVersion);
  }, [currentVersion, setItem]);

  useEffect(() => {
    if (currentUser && userData && userData.version && userData.version !== currentVersion) {
      setCurrentVersion(userData.version);
      setItem('version', userData.version);
    }
  }, []); // run once on mount

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

  useEffect(() => {
    setItem('otChapters', otChapters);
  }, [otChapters, setItem]);

  useEffect(() => {
    setItem('ntChapters', ntChapters);
  }, [ntChapters, setItem]);

  // --- Export handler ---
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
        handleVersionChange={setCurrentVersion}
        resetState={() => {}}
        isCustomSchedule={isCustomSchedule}
      />
      <div className={styles.container} id="main-content">
        <ControlsPanel
          currentUser={currentUser}
          version={currentVersion}
          handleVersionChange={setCurrentVersion}
          otChapters={otChapters}
          setOtChapters={setOtChapters}
          ntChapters={ntChapters}
          setNtChapters={setNtChapters}
          isCustomSchedule={isCustomSchedule}
          updateUserData={updateUserData}
          customPlanText={customPlanText}
          setCustomPlanText={setCustomPlanText}
          onGenerate={handleGenerate} // single generate callback for both modes
          exportToExcel={handleExportExcel}
        />
        {isCustomSchedule ? (
          <CustomPlan
            ref={customPlanRef}
            currentUser={currentUser}
            userData={userData}
            currentVersion={currentVersion}
            updateUserData={updateUserData}
            customPlanText={customPlanText}
          />
        ) : (
          <DefaultPlan
            ref={defaultPlanRef}
            currentUser={currentUser}
            userData={userData}
            currentVersion={currentVersion}
            otChapters={otChapters}
            ntChapters={ntChapters}
            updateUserData={updateUserData}
          />
        )}
      </div>
    </div>
  );
}
