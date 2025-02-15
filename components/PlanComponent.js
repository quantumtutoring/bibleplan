// PlanComponent.js
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

  // Mount flag.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Auth / Firestore data.
  const { currentUser, userData } = useListenFireStore();
  const { updateUserData } = writeFireStore();

  // VERSION: For signed-in users, initialize from Firestore; for signed-out, fallback to localStorage.
  const initialVersion = currentUser
    ? (userData?.version || 'nasb')
    : getItem('version', 'nasb');
  const [currentVersion, setCurrentVersion] = useState(initialVersion);

  // Flag to indicate the user has manually changed the version.
  const [versionChanged, setVersionChanged] = useState(false);

  // Always write currentVersion to localStorage.
  useEffect(() => {
    setItem('version', currentVersion);
  }, [currentVersion, setItem]);

  // Sync Firestore version if it differs and the user hasn’t just changed it.
  useEffect(() => {
    if (currentUser && userData && userData.version && !versionChanged && userData.version !== currentVersion) {
      setCurrentVersion(userData.version);
    }
  }, [currentUser, userData, currentVersion, versionChanged]);

  // OT/NT CHAPTERS.
  const initialOT = currentUser
    ? (userData?.otChapters || '2')
    : getItem('otChapters', '2');
  const [otChapters, setOtChapters] = useState(initialOT);

  const initialNT = currentUser
    ? (userData?.ntChapters || '1')
    : getItem('ntChapters', '1');
  const [ntChapters, setNtChapters] = useState(initialNT);

  // isCustomSchedule flag.
  const initialIsCustom = currentUser
    ? (userData?.isCustomSchedule ?? false)
    : getItem('isCustomSchedule', false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(initialIsCustom);

  // Track if user has manually changed the chapter inputs.
  const [otChanged, setOtChanged] = useState(false);
  const [ntChanged, setNtChanged] = useState(false);

  // customPlanText state.
  const [customPlanText, setCustomPlanText] = useState('');

  // Create refs for DefaultPlan and CustomPlan.
  const defaultPlanRef = useRef();
  const customPlanRef = useRef();

  // Combined generate handler.
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

  // Wrapper for version change that sets a flag.
  const handleVersionChangeWrapper = (newVersion) => {
    setCurrentVersion(newVersion);
    setVersionChanged(true);
    // Clear the flag after 1 second.
    setTimeout(() => setVersionChanged(false), 1000);
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

  // Write OT/NT chapters to localStorage.
  useEffect(() => {
    setItem('otChapters', otChapters);
    setItem('ntChapters', ntChapters);
  }, [otChapters, ntChapters, setItem]);

  // Sync OT/NT chapters from Firestore if not manually changed.
  useEffect(() => {
    if (currentUser && userData) {
      if (!otChanged && userData.otChapters && userData.otChapters !== otChapters) {
        setOtChapters(userData.otChapters);
      }
      if (!ntChanged && userData.ntChapters && userData.ntChapters !== ntChapters) {
        setNtChapters(userData.ntChapters);
      }
    }
  }, [currentUser, userData, otChanged, ntChanged, otChapters, ntChapters]);

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
          handleVersionChange={handleVersionChangeWrapper}
          resetState={resetState}
          isCustomSchedule={isCustomSchedule}
          onSignOut={() => {}}
          fadeDuration={500}
        />
        <ControlsPanel
          currentUser={currentUser}
          version={currentVersion}
          handleVersionChange={handleVersionChangeWrapper}
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
