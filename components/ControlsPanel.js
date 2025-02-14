import React, { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

const ControlsPanel = ({
  currentUser,
  updateUserData,
  version,
  handleVersionChange,
  otChapters,
  setOtChapters,
  ntChapters,
  setNtChapters,
  updateSchedule,
  exportToExcel,
  customSchedule,
  defaultSchedule, // Provided from the parent component.
  isCustomSchedule,
  handleModeChange,
}) => {
  const router = useRouter();
  const [customPlanText, setCustomPlanText] = useState('');
  const textareaRef = useRef(null);

  // Adjust the textarea height based on its content.
  const handleTextareaInput = useCallback((e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    setCustomPlanText(e.target.value);
  }, []);

  // Toggle between default and custom planner modes.
  const toggleCustomizeMode = useCallback(() => {
    if (isCustomSchedule) {
      console.log('Switching from CUSTOM -> DEFAULT');
//      handleModeChange(false);
      if (router.pathname !== '/') {
        router.push('/');
      }
    } else {
      console.log('Switching from DEFAULT -> CUSTOM');
  //    handleModeChange(true);
      if (router.pathname !== '/custom') {
        router.push('/custom');
      }
    }
  }, [isCustomSchedule, router, handleModeChange]);

  // Handle version dropdown changes.
  const handleVersionChangeInternal = useCallback((e) => {
    handleVersionChange(e.target.value);
  }, [handleVersionChange]);

  // When "Generate Schedule" is pressed, simply delegate to updateSchedule.
  const handleCreateSchedule = useCallback(() => {
    if (isCustomSchedule) {
      // In custom mode, pass the full text along with a flag.
      updateSchedule(customPlanText, undefined, false, false, true, true);
    } else {
      // In default mode, pass OT and NT chapter inputs.
      updateSchedule(otChapters, ntChapters, false, false, true, false);
    }
  }, [isCustomSchedule, customPlanText, otChapters, ntChapters, updateSchedule]);

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
