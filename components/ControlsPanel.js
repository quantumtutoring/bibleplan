// components/ControlsPanel.js

import React, { useState, useRef } from 'react';
import styles from '../styles/Home.module.css';

const ControlsPanel = ({
  version,
  handleVersionChange,
  otChapters,
  setOtChapters,
  ntChapters,
  setNtChapters,
  updateSchedule,
  exportToExcel,
  customSchedule,
}) => {
  const [customizeMode, setCustomizeMode] = useState(false);
  const [customPlanText, setCustomPlanText] = useState('');
  const textareaRef = useRef(null);

  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    setCustomPlanText(e.target.value);
  };

  const toggleCustomizeMode = () => {
    if (customizeMode) {
      // Exiting custom mode: regenerate default schedule without clearing progress.
      updateSchedule(otChapters, ntChapters, false, true, false);
    } else {
      // Entering custom mode: if a custom schedule exists, restore it.
      if (customSchedule && customSchedule.length > 0) {
        updateSchedule(customSchedule, undefined, false, false, false);
      }
    }
    setCustomizeMode((prevMode) => !prevMode);
  };

  const handleCreateSchedule = () => {
    if (customizeMode) {
      const lines = customPlanText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      const customScheduleArr = lines.map((line, index) => {
        const url = `https://www.literalword.com/?q=${encodeURIComponent(line)}`;
        return { day: index + 1, passages: line, url };
      });
      // Creating a new custom schedule clears its progress.
      updateSchedule(customScheduleArr, undefined, false, false, true);
    } else {
      // Creating a new default schedule clears its progress.
      updateSchedule(otChapters, ntChapters, false, false, true);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select value={version} onChange={handleVersionChange}>
          <option value="nasb">NASB</option>
          <option value="lsb">LSB</option>
          <option value="esv">ESV</option>
        </select>
      </div>
      <h1>Bible Reading Planner</h1>
      <div className={styles.controls}>
        {customizeMode ? (
          <div>
            <label className={styles.customLabel}>Enter your custom plan:</label>
            <textarea
              ref={textareaRef}
              value={customPlanText}
              onInput={handleTextareaInput}
              placeholder="Type your daily passages on each line..."
              className={styles.customTextArea}
            />
          </div>
        ) : (
          <div className={styles.setChapters}>
            <label>
              OT chapters/day (929 total):
              <input
                type="number"
                step="1"
                value={otChapters}
                onChange={(e) => setOtChapters(e.target.value)}
              />
            </label>
            <br />
            <label>
              NT chapters/day (260 total):
              <input
                type="number"
                step="1"
                value={ntChapters}
                onChange={(e) => setNtChapters(e.target.value)}
              />
            </label>
          </div>
        )}
        <br />
        <br />
        <div>
          <button onClick={handleCreateSchedule}>Create Schedule</button>
          <button onClick={exportToExcel}>Export to Excel</button>
          <button onClick={toggleCustomizeMode}>
            {customizeMode ? 'Cancel' : 'Custom Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
