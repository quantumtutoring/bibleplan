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

  // Mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Auth / Firestore data
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // For signed-out users, use localStorage defaults.
  // For signed-in users, we read Firestore values only once upon sign in.
  const initialVersion =
    currentUser && userData && userData.version
      ? userData.version
      : getItem('version', 'nasb');
  const [currentVersion, setCurrentVersion] = useState(initialVersion);

  const initialOT =
    currentUser && userData && userData.otChapters
      ? userData.otChapters
      : getItem('otChapters', '2');
  const [otChapters, setOtChapters] = useState(initialOT);

  const initialNT =
    currentUser && userData && userData.ntChapters
      ? userData.ntChapters
      : getItem('ntChapters', '1');
  const [ntChapters, setNtChapters] = useState(initialNT);

  const initialIsCustom =
    currentUser && userData ? userData.isCustomSchedule : getItem('isCustomSchedule', false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(initialIsCustom);

  // customPlanText is local UI state.
  const [customPlanText, setCustomPlanText] = useState('');

  // Create refs for DefaultPlan and CustomPlan.
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

  const resetState = () => {
    setCurrentVersion("nasb");
    setOtChapters("2");
    setNtChapters("1");
    setIsCustomSchedule(false);
    setCustomPlanText('');
    // (Child components manage their own state.)
  };

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

  // For signed-out users, write chapter numbers to localStorage.
  useEffect(() => {
    if (!currentUser) {
      setItem('version', currentVersion);
      setItem('otChapters', otChapters);
      setItem('ntChapters', ntChapters);
    }
  }, [currentVersion, otChapters, ntChapters, currentUser, setItem]);

  // Note: We intentionally do NOT add an effect here to update `currentVersion` when userData changes.
  // The version is read only once upon sign-in (via initialVersion) and then remains unchanged.

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
        resetState={resetState}
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
