// components/ControlsPanel.js

import React, { useState, useRef } from 'react';
import styles from '../styles/Home.module.css';

/**
 * ControlsPanel Component
 *
 * Renders the Bible version selector and the chapter-per-day input controls.
 * Also provides buttons to generate a new schedule and to toggle customization mode.
 *
 * When the "Customize Plan" button is clicked, the OT and NT options disappear and
 * are replaced by an auto‐resizing textarea for freeform customization.
 *
 * Props:
 * - version: The current Bible version ("nasb", "lsb", or "esv").
 * - handleVersionChange: Function to call when the Bible version is changed.
 * - otChapters: Number of Old Testament chapters per day.
 * - setOtChapters: Setter function for the OT chapters.
 * - ntChapters: Number of New Testament chapters per day.
 * - setNtChapters: Setter function for the NT chapters.
 * - updateSchedule: Function to generate/update the reading schedule.
 * - exportToExcel: Function to export the schedule to Excel.
 */
const ControlsPanel = ({
  version,
  handleVersionChange,
  otChapters,
  setOtChapters,
  ntChapters,
  setNtChapters,
  updateSchedule,
  exportToExcel,
}) => {
  // State to toggle customization mode.
  const [customizeMode, setCustomizeMode] = useState(false);
  // State for the custom plan text.
  const [customPlanText, setCustomPlanText] = useState('');

  // Ref for the textarea so we can auto-resize it.
  const textareaRef = useRef(null);

  // Handler to auto-resize the textarea as the user types.
  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    setCustomPlanText(e.target.value);
  };

  // Toggle customization mode.
  const toggleCustomizeMode = () => {
    setCustomizeMode((prevMode) => !prevMode);
  };

  return (
    <div>
      {/* Version selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select value={version} onChange={handleVersionChange}>
          <option value="nasb">NASB</option>
          <option value="lsb">LSB</option>
          <option value="esv">ESV</option>
        </select>
      </div>

      <h1>Bible Reading Planner</h1>

      {/* Chapter-per-day input controls or custom plan textarea */}
      <div className={styles.controls}>
        {customizeMode ? (
          // When in customization mode, hide the chapter inputs and show a textarea.
          <div>
            <label className={styles.customLabel}>
              Enter your custom plan:
            </label>
            <textarea
              ref={textareaRef}
              value={customPlanText}
              onInput={handleTextareaInput}
              placeholder="Type your daily passages on each line..."
              className={styles.customTextArea}
            />
          </div>
        ) : (
          // When not customizing, show the OT/NT chapter input fields.
          <>
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
          </>
        )}
        {/* The Create Schedule button remains unchanged */}
     
        <div><button onClick={() => updateSchedule()}>Create Schedule</button>
        
        {/* Export button */}
        <button onClick={exportToExcel}>Export to Excel</button>
        
        {/* The Customize Plan button toggles customization mode */}
        <button onClick={toggleCustomizeMode}>
          {customizeMode ? 'Cancel' : 'Custom Plan'}
        </button></div>

      </div>
    </div>
  );
};

export default ControlsPanel;
