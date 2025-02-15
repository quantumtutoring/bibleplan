// ControlsPanel.js
import React, { useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

const ControlsPanel = ({
  currentUser,
  version,
  handleVersionChange,
  otChapters,
  setOtChapters,
  ntChapters,
  setNtChapters,
  isCustomSchedule,
  updateUserData,
  customPlanText,
  setCustomPlanText,
  onGenerate,
  exportToExcel,
}) => {
  const router = useRouter();
  const textareaRef = useRef(null);

  // Adjust the textarea height based on its content.
  const handleTextareaInput = useCallback(
    (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
      setCustomPlanText(e.target.value);
    },
    [setCustomPlanText]
  );

  // Toggle between default and custom modes.
  const toggleCustomizeMode = useCallback(() => {
    if (isCustomSchedule) {
      console.log('Switching from CUSTOM -> DEFAULT');
      if (router.pathname !== '/') {
        router.push('/');
      }
    } else {
      console.log('Switching from DEFAULT -> CUSTOM');
      if (router.pathname !== '/custom') {
        router.push('/custom');
      }
    }
  }, [isCustomSchedule, router]);

  // Handle version dropdown changes with immediate Firestore update.
  const handleVersionChangeInternal = useCallback(
    (e) => {
      const newVersion = e.target.value;
      // Update local state via the provided handler.
      handleVersionChange(newVersion);
      // Immediately update Firestore so that Firestore stays in sync.
      if (currentUser) {
        updateUserData(currentUser.uid, { version: newVersion })
          .then(() => console.log("Version updated in Firestore"))
          .catch((err) => console.error("Error updating version:", err));
      }
    },
    [handleVersionChange, currentUser, updateUserData]
  );

  // When "Generate Schedule" is pressed.
  const handleCreateSchedule = useCallback(() => {
    onGenerate();
  }, [onGenerate]);

  return (
    <div>
      {/* Version dropdown */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select value={version} onChange={handleVersionChangeInternal}>
          <option value="nasb">NASB</option>
          <option value="lsb">LSB</option>
          <option value="esv">ESV</option>
        </select>
      </div>
      <h1>Bible Reading Planner</h1>
      <div className={styles.controls}>
        {/* Planner mode selector */}
        <span>
          <select
            className={styles.plannerSelector}
            onChange={toggleCustomizeMode}
            value={isCustomSchedule ? 'custom' : 'default'}
          >
            <option value="default">Default Planner</option>
            <option value="custom">Custom Planner</option>
          </select>
        </span>
        {isCustomSchedule ? (
          <div>
            <textarea
              ref={textareaRef}
              value={customPlanText}
              onInput={handleTextareaInput}
              placeholder="Input Bible passages. Each line is a day's reading."
              className={styles.customTextArea}
            />
          </div>
        ) : (
          <div className={styles.setChapters}>
            <label>
              OT chapters/day (e.g., 2):
              <input
                type="number"
                step="1"
                value={otChapters}
                onChange={(e) => setOtChapters(e.target.value)}
              />
            </label>
            <br />
            <label>
              NT chapters/day (e.g., 1):
              <input
                type="number"
                step="1"
                value={ntChapters}
                onChange={(e) => setNtChapters(e.target.value)}
              />
            </label>
          </div>
        )}
        <div>
          <button onClick={handleCreateSchedule}>Generate Schedule</button>
          <button onClick={exportToExcel}>Export to Excel</button>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
