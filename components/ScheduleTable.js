// components/ScheduleTable.js

import React from 'react';
import styles from '../styles/Home.module.css';

/**
 * ScheduleTable Component
 *
 * Renders the reading schedule in a table format.
 * Each row shows the day, the passages (with a hyperlink), and a checkbox indicating progress.
 *
 * Props:
 * - schedule: Array of schedule items, where each item is an object containing:
 *      { day, passages, url }
 * - progressMap: An object mapping day numbers to a boolean indicating whether the day is completed.
 * - handleCheckboxChange: Callback function to handle checkbox changes.
 */
const ScheduleTable = ({ schedule, progressMap, handleCheckboxChange }) => {
  return (
    <div className={styles.homeTableWrapper}>
      <table id="scheduleTable" className={styles.scheduleTable}>
        <thead>
          <tr>
            <th>Day</th>
            <th>Passages</th>
            <th className={styles.checkboxCell}>Done</th>
          </tr>
        </thead>
        <tbody id="scheduleBody">
          {schedule.map((item) => (
            <tr key={item.day} id={`day-${item.day}`}>
              <td>{item.day}</td>
              <td>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hyperlink"
                >
                  {item.passages}
                </a>
              </td>
              <td className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  id={`check-day-${item.day}`}
                  checked={!!progressMap[item.day]}
                  onClick={(e) =>
                    handleCheckboxChange(item.day, e.target.checked, e)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
