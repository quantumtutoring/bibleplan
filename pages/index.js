// pages/index.js
import Head from 'next/head';
import Script from 'next/script';
import styles from '../styles/Home.module.css';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Bible Reading Plan</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      {/* Load Firebase libraries */}
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-auth-compat.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"
        strategy="beforeInteractive"
      />
      {/* Load ExcelJS and FileSaver */}
      <Script src="/exceljs.min.js" strategy="beforeInteractive" />
      <Script src="/filesave.js" strategy="beforeInteractive" />
      {/* Load your legacy script */}
      <Script src="/indexScript.js" strategy="afterInteractive" />

      <div className={styles.header} id="auth-header">
        <Link href="/signin">
          Sign in
        </Link>
      </div>
      <div className={styles.container} id="main-content">
        <h1>Bible Reading Plan</h1>
        <div className={styles.controls}>
          <label>
            OT chapters/day (929 total):
            <input
              type="number"
              id="otChapters"
              min="1"
              max="100"
              defaultValue="3"
            />
          </label>
          <br />
          <label>
            NT chapters/day (260 total):
            <input
              type="number"
              id="ntChapters"
              min="1"
              max="100"
              defaultValue="2"
            />
          </label>
          <br /><br />
          <button id="updateScheduleBtn">Update Schedule</button>
          <button id="exportExcelBtn">Export to Excel</button>
        </div>
        <br />
        {/* Wrap the table in a div with the local class */}
        <div className={styles.homeTableWrapper}>
          <table id="scheduleTable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Passages</th>
                <th className={styles.checkboxCell}>Done</th>
              </tr>
            </thead>
            <tbody id="scheduleBody">
              {/* Your legacy script will dynamically generate table rows */}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
