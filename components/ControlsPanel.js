// components/ControlsPanel.js
import React, { useRef, useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import useLocalStorage from '../hooks/useLocalStorage';

const ControlsPanel = ({
  version,               // version is passed from the parent (e.g. 'nasb', 'lsb', or 'esv')
  handleVersionChange,   // function to handle changes – navigates to the new URL
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
  const { getItem, setItem } = useLocalStorage();
  // Local state for the custom plan text remains managed here.
  const [customPlanText, setCustomPlanText] = useState('');
  const textareaRef = useRef(null);

  // On mount, restore the custom text (if any) from local storage.
  useEffect(() => {
    const storedText = getItem('customPlanText', '');
    setCustomPlanText(storedText);
  }, [getItem]);

  const handleTextareaInput = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    const newText = e.target.value;
    setCustomPlanText(newText);
    setItem('customPlanText', newText);
  };

  const toggleCustomizeMode = () => {
    if (isCustomSchedule) {
      // Exiting custom mode: regenerate default schedule without clearing its progress.
      updateSchedule(otChapters, ntChapters, false, true, false, true);
      setIsCustomSchedule(false);
    } else {
      // Entering custom mode:
      // If a custom schedule exists, restore it; otherwise, update with an empty schedule so no table is shown.
      if (customSchedule && customSchedule.length > 0) {
        updateSchedule(customSchedule, undefined, false, false, false);
      } else {
        updateSchedule([], undefined, false, false, false);
      }
      setIsCustomSchedule(true);
    }
  };

  // Helper function to format a Bible reference:
  // - Inserts a space after commas/semicolons if missing.
  // - Inserts a space between a sequence of letters and the following digits (and vice-versa).
  // - Converts each word to title case.
  const formatBibleReference = (str) => {
    if (!str) return "";
    let formatted = str.trim();
    // Insert a space after commas or semicolons if missing.
    formatted = formatted.replace(/([,;])(?!\s)/g, "$1 ");
    // Insert a space between letters and following digits.
    formatted = formatted.replace(/([A-Za-z]+)(\d+)/g, "$1 $2");
    // Insert a space between digits and following letters.
    formatted = formatted.replace(/(\d+)([A-Za-z]+)/g, "$1 $2");
    // Split into words and convert each to title case.
    formatted = formatted.split(/\s+/).map(word => {
      if (word.length > 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word;
    }).join(" ");
    return formatted;
  };

  const handleCreateSchedule = () => {
    if (isCustomSchedule) {
      // Build a custom schedule from the textarea input using the current version.
      const lines = customPlanText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '');
      
      // Check if the number of lines is between 1 and 2000 (inclusive).
      if (lines.length < 1 || lines.length > 2000) {
        alert('Please enter between 1 and 2000 lines for your custom plan.');
        return;
      }
      
      const customScheduleArr = lines.map((line, index) => {
        // Format the line as a Bible reference.
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
        {/* The select dropdown uses the version prop directly */}
        <select value={version} onChange={handleVersionChange}>
          <option value="nasb">NASB</option>
          <option value="lsb">LSB</option>
          <option value="esv">ESV</option>
        </select>
      </div>
      <h1>Bible Reading Planner</h1>
      <div className={styles.controls}>
        {isCustomSchedule ? (
          <div>
            <label className={styles.customLabel}>Enter your custom plan:</label>
            <textarea
              ref={textareaRef}
              value={customPlanText}
              onInput={handleTextareaInput}
              placeholder="Enter your custom passages here and press the generate button. Each line is a different day."
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
            {isCustomSchedule ? 'Generate Custom Schedule' : 'Generate Schedule'}
          </button>
          <button onClick={toggleCustomizeMode}>
            {isCustomSchedule ? 'Default Planner' : 'Custom Planner'}
          </button>
          {/* Render Export to Excel button only in custom mode */}
          {isCustomSchedule && (
            <button onClick={exportToExcel}>
              Export to Excel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlsPanel;
