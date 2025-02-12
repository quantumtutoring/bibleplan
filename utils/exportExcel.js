// utils/exportExcel.js

import { saveAs } from 'file-saver';

/**
 * Exports the reading schedule and progress to an Excel file using ExcelJS.
 *
 * @param {Array} schedule - Array of schedule items (each with { day, passages, url }).
 * @param {Object} progressMap - An object mapping day numbers to a boolean indicating completion.
 */
export async function exportScheduleToExcel(schedule, progressMap) {
  try {
    console.log('[exportExcel] Exporting schedule to Excel');

    // Dynamically import ExcelJS to reduce initial bundle size.
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Add header row.
    const header = ['Day', 'Passages', 'Done'];
    worksheet.addRow(header);

    // Add schedule rows.
    schedule.forEach((item) => {
      const done = progressMap[item.day] ? 'X' : '';
      // Create a cell value with a hyperlink.
      const passageCellValue = { text: item.passages, hyperlink: item.url };
      worksheet.addRow([item.day, passageCellValue, done]);
    });

    // Format the passage column to display as hyperlinks.
    worksheet.getColumn(2).eachCell((cell, rowNumber) => {
      if (rowNumber === 1) return; // Skip header.
      if (cell.value && cell.value.hyperlink) {
        cell.font = { color: { argb: 'FF0000FF' }, underline: true };
      }
    });

    // Collect all row data to compute optimal column widths.
    let data = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
      let rowData = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        let cellText = '';
        if (cell.value && typeof cell.value === 'object' && cell.value.text)
          cellText = cell.value.text;
        else cellText = cell.value ? cell.value.toString() : '';
        rowData.push(cellText);
      });
      data.push(rowData);
    });

    // Helper function to compute column widths.
    const computeColWidths = (data, maxWidth = 30) => {
      const colCount = data[0].length;
      const colWidths = new Array(colCount).fill(0);
      data.forEach((row) => {
        for (let j = 0; j < colCount; j++) {
          let cellText = row[j] || '';
          colWidths[j] = Math.max(colWidths[j], cellText.length);
        }
      });
      return colWidths.map((w) => ({ width: Math.min(w + 2, maxWidth) }));
    };

    const colWidths = computeColWidths(data, 30);
    colWidths.forEach((cw, i) => {
      worksheet.getColumn(i + 1).width = cw.width;
    });

    // Write workbook to a buffer and save as a Blob.
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    console.log('[exportExcel] Excel export complete. Saving file.');
    saveAs(blob, 'bible_reading_progress.xlsx');
  } catch (error) {
    console.error('[exportExcel] Error exporting to Excel:', error);
  }
}
