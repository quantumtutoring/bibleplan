// components/PlanComponent.js
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

  // Mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Auth / Firestore data
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // For signed-out users, use localStorage defaults;
  // for signed-in users, we use the Firestore values as the source of truth.
  const initialVersion = currentUser && userData && userData.version ? userData.version : getItem('version', 'nasb');
  const [currentVersion, setCurrentVersion] = useState(initialVersion);

  const initialOT = currentUser && userData && userData.otChapters ? userData.otChapters : getItem('otChapters', '2');
  const [otChapters, setOtChapters] = useState(initialOT);

  const initialNT = currentUser && userData && userData.ntChapters ? userData.ntChapters : getItem('ntChapters', '1');
  const [ntChapters, setNtChapters] = useState(initialNT);

  const initialIsCustom = currentUser && userData ? userData.isCustomSchedule : getItem('isCustomSchedule', false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(initialIsCustom);

  // customPlanText is local UI state.
  const [customPlanText, setCustomPlanText] = useState('');

  // Create refs for DefaultPlan and CustomPlan (both expose generateSchedule methods).
  const defaultPlanRef = useRef();
  const customPlanRef = useRef();

  // Combined generate handler for the single generate button.
  const handleGenerate = () => {
    if (isCustomSchedule) {
      if (customPlanRef.current) {
        customPlanRef.current.generateSchedule();
      }
    } else {
      if (defaultPlanRef.current) {
        // In default mode, we clear progress on generate.
        defaultPlanRef.current.generateSchedule(true);
      }
    }
  };


// nt/ot Chapter sync
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
}, [currentUser, userData]);


  // Routing: update mode based on URL.
  useEffect(() => {
    if (router.pathname === '/custom' && !isCustomSchedule) {
      setIsCustomSchedule(true);
      setItem('isCustomSchedule', true);
    } else if (router.pathname === '/' && isCustomSchedule) {
      setIsCustomSchedule(false);
      setItem('isCustomSchedule', false);
    }
  }, [router.pathname, isCustomSchedule, setItem]);

  // For signed-out users, keep writing to localStorage.
  useEffect(() => {
    if (!currentUser) {
      setItem('version', currentVersion);
      setItem('otChapters', otChapters);
      setItem('ntChapters', ntChapters);
    }
  }, [currentVersion, otChapters, ntChapters, currentUser, setItem]);

  // Export handler.
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
          onGenerate={handleGenerate}
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
