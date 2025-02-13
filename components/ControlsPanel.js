// components/ControlsPanel.js
import React, { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';

const ControlsPanel = ({
  version,               // The current version in local storage
  setCurrentVersion,     // A setter for updating the version
  otChapters,
  setOtChapters,
  ntChapters,
  setNtChapters,
  updateSchedule,
  exportToExcel,
  customSchedule,
  isCustomSchedule,
  setIsCustomSchedule
}) => {
  const router = useRouter();
  // Local state for the custom plan text.
  const [customPlanText, setCustomPlanText] = useState('');
  const textareaRef = useRef(null);

  // Adjust the textarea height based on content.
  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    setCustomPlanText(e.target.value);
  };

  const toggleCustomizeMode = () => {
    console.log('Current isCustomSchedule:', isCustomSchedule);
  
    if (isCustomSchedule) {
      console.log('Switching from CUSTOM -> DEFAULT');
      // Exiting custom mode: regenerate default schedule
      updateSchedule(otChapters, ntChapters, false, true, false);
      setIsCustomSchedule(false);
  
      if (router.pathname !== '/') {
        console.log('Routing to /');
        router.push('/');
      }
    } else {
      console.log('Switching from DEFAULT -> CUSTOM');
      // Entering custom mode
      if (customSchedule && customSchedule.length > 0) {
        updateSchedule(customSchedule, undefined, false, false, false);
      } else {
        updateSchedule([], undefined, false, false, false);
      }
      setIsCustomSchedule(true);
  
      // Make sure we actually route to /custom
      if (router.pathname !== '/custom') {
        console.log('Routing to /custom');
        router.push('/custom');
      }
    }
  };
  
  
  // Helper function to format a Bible reference string.
  const formatBibleReference = (str) => {
    if (!str) return "";
    let formatted = str.trim();
    formatted = formatted.replace(/([,;])(?!\s)/g, "$1 ");
    formatted = formatted.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
    formatted = formatted.replace(/(\d+)([A-Za-z]+)/g, "$1 $2");
    formatted = formatted
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    return formatted;
  };

  const handleCreateSchedule = () => {
    if (isCustomSchedule) {
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
      updateSchedule(customScheduleArr, undefined, false, false, true);
    } else {
      // The updateSchedule function will validate the OT/NT numbers.
      updateSchedule(otChapters, ntChapters, false, false, true);
    }
  };

  return (
    <div>
      {/* A dropdown for selecting the version, no routing needed here. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select
          value={version}
          onChange={(e) => {
            setCurrentVersion(e.target.value);
          }}
        >
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
