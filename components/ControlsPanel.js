// components/ControlsPanel.js

import React from 'react';
import styles from '../styles/Home.module.css';

/**
 * ControlsPanel Component
 *
 * Renders the Bible version selector and the chapter-per-day input controls.
 * Also provides buttons to generate a new schedule and export it to Excel.
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

      {/* Chapter-per-day input controls */}
      <div className={styles.controls}>
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
        <br />
        <br />
        <button onClick={() => updateSchedule()}>Create Schedule</button>
        <button onClick={exportToExcel}>Export to Excel</button>
      </div>
    </div>
  );
};

export default ControlsPanel;
