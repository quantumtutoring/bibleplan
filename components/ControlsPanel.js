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
  isCustomSchedule,
  handleModeChange
}) => {
  const router = useRouter();
  const [customPlanText, setCustomPlanText] = useState('');
  const textareaRef = useRef(null);

  // Adjust the textarea height based on content.
  const handleTextareaInput = useCallback((e) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    setCustomPlanText(e.target.value);
  }, []);

  // Toggle mode between default and custom.
  const toggleCustomizeMode = useCallback(() => {
    if (isCustomSchedule) {
      // Switching from CUSTOM -> DEFAULT
      console.log('Switching from CUSTOM -> DEFAULT');
      handleModeChange(false); // Only update local state.
      if (router.pathname !== '/') {
        router.push('/');
      }
    } else {
      // Switching from DEFAULT -> CUSTOM
      console.log('Switching from DEFAULT -> CUSTOM');
      handleModeChange(true); // Only update local state.
      if (router.pathname !== '/custom') {
        router.push('/custom');
      }
    }
  }, [isCustomSchedule, router, handleModeChange]);

  // Handle version dropdown changes.
  const handleVersionChangeInternal = useCallback((e) => {
    handleVersionChange(e.target.value);
  }, [handleVersionChange]);

  // Helper function to format Bible reference strings.
  const formatBibleReference = (str) => {
    if (!str) return "";
    let formatted = str.trim();
    formatted = formatted.replace(/([,;])(?!\s)/g, "$1 ");
    formatted = formatted.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
    formatted = formatted.replace(/(\d+)([A-Za-z]+)/g, "$1 $2");
    return formatted
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // When "Generate Schedule" is pressed, we generate the schedule.
  const handleCreateSchedule = useCallback(() => {
    if (isCustomSchedule) {
      // Process custom plan text.
      const lines = customPlanText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
      
      if (lines.length < 1 || lines.length > 2000) {
        alert('Please enter between 1 and 2000 lines for your custom plan.');
        return;
      }
      
      const customScheduleArr = lines.map((line, index) => {
        const formattedLine = formatBibleReference(line);
        let url;
        if (version === 'lsb') {
          url = `https://read.lsbible.org/?q=${encodeURIComponent(formattedLine)}`;
        } else if (version === 'esv') {
          url = `https://esv.literalword.com/?q=${encodeURIComponent(formattedLine)}`;
        } else {
          url = `https://www.literalword.com/?q=${encodeURIComponent(formattedLine)}`;
        }
        return { day: index + 1, passages: formattedLine, url };
      });
      // Call updateSchedule here to generate and write the custom schedule with progress cleared.
      updateSchedule(customScheduleArr, undefined, false, false, true);
    } else {
      // For default mode, validate OT/NT.
      const otNumber = parseInt(otChapters, 10);
      const ntNumber = parseInt(ntChapters, 10);
      if (isNaN(otNumber) || otNumber < 1 || otNumber > 2000) {
        alert("OT chapters must be a number between 1 and 2000");
        return;
      }
      if (isNaN(ntNumber) || ntNumber < 1 || ntNumber > 2000) {
        alert("NT chapters must be a number between 1 and 2000");
        return;
      }
      // Call updateSchedule to generate the default schedule with progress cleared.
      updateSchedule(otChapters, ntChapters, false, false, true);
    }
  }, [isCustomSchedule, customPlanText, version, otChapters, ntChapters, updateSchedule]);

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
        
        <div>
          <button onClick={handleCreateSchedule}>
            Generate Schedule
          </button>
          <button onClick={exportToExcel}>
            Export to Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
