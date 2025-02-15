import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useListenFireStore } from '../contexts/ListenFireStore';
import Header from './Header';
import ControlsPanel from './ControlsPanel';
import DefaultPlan from './DefaultPlan';
import CustomPlan from './CustomPlan';
import { exportScheduleToExcel } from '../utils/exportExcel';
import writeFireStore from '../hooks/writeFireStore';
import useLocalStorage from '../hooks/useLocalStorage';
import styles from '../styles/Home.module.css';

export default function PlanComponent({ forcedMode }) {
  const { getItem, setItem } = useLocalStorage();
  const router = useRouter();

  // Mount flag
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Auth / Firestore data
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // When signed in, use Firestore values only (never read from localStorage).
  // For signed-out users, fall back to localStorage.
  const initialVersion = currentUser
    ? (userData?.version || 'nasb')
    : getItem('version', 'nasb');
  const [currentVersion, setCurrentVersion] = useState(initialVersion);

  const initialOT = currentUser
    ? (userData?.otChapters || '2')
    : getItem('otChapters', '2');
  const [otChapters, setOtChapters] = useState(initialOT);

  const initialNT = currentUser
    ? (userData?.ntChapters || '1')
    : getItem('ntChapters', '1');
  const [ntChapters, setNtChapters] = useState(initialNT);

  const initialIsCustom = currentUser
    ? (userData?.isCustomSchedule ?? false)
    : getItem('isCustomSchedule', false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(initialIsCustom);

  // Track if user has manually changed the chapter inputs.
  const [otChanged, setOtChanged] = useState(false);
  const [ntChanged, setNtChanged] = useState(false);

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
    } else {
      // When signed in, update localStorage with Firestore values even though we never read from it.
      setItem('version', currentVersion);
      setItem('otChapters', otChapters);
      setItem('ntChapters', ntChapters);
    }
  }, [currentVersion, otChapters, ntChapters, currentUser, setItem]);

  // Update OT/NT chapter numbers and version when Firestore userData changes,
  // but only if the user hasn't already edited them.
  useEffect(() => {
    if (currentUser && userData) {
      if (!otChanged && userData.otChapters && userData.otChapters !== otChapters) {
        setOtChapters(userData.otChapters);
      }
      if (!ntChanged && userData.ntChapters && userData.ntChapters !== ntChapters) {
        setNtChapters(userData.ntChapters);
      }
      if (userData.version && userData.version !== currentVersion) {
        setCurrentVersion(userData.version);
      }
    }
  }, [currentUser, userData, otChanged, ntChanged, otChapters, ntChapters, currentVersion]);

  if (!mounted) return null;

  return (
    <div className={styles.pageBackground}>
      <Head>
        <title>Bible Reading Planner</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <div className={styles.container} id="main-content">
        <Header
          currentUser={currentUser}
          version={currentVersion}
          handleVersionChange={setCurrentVersion}
          resetState={resetState}
          isCustomSchedule={isCustomSchedule}
          onSignOut={() => {}}
          fadeDuration={500}
        />
        <ControlsPanel
          currentUser={currentUser}
          version={currentVersion}
          handleVersionChange={setCurrentVersion}
          otChapters={otChapters}
          setOtChapters={(value) => {
            setOtChapters(value);
            setOtChanged(true);
          }}
          ntChapters={ntChapters}
          setNtChapters={(value) => {
            setNtChapters(value);
            setNtChanged(true);
          }}
          isCustomSchedule={isCustomSchedule}
          updateUserData={updateUserData}
          customPlanText={customPlanText}
          setCustomPlanText={setCustomPlanText}
          onGenerate={handleGenerate}
          exportToExcel={exportScheduleToExcel}
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
