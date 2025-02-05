// public/indexScript.js
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAyrnrL9jPCVrrJ8D2Uf5xbvWNnw6Dtx40",
    authDomain: "biblereadingplan-8cc51.firebaseapp.com",
    projectId: "biblereadingplan-8cc51",
    storageBucket: "biblereadingplan-8cc51.firebasestorage.app",
    messagingSenderId: "29621423913",
    appId: "1:29621423913:web:2f72642305073d8645b138",
    measurementId: "G-QML05S68KS"
  };
  window.firebaseConfig = firebaseConfig;
  
  let currentUser = null;
  let authStateDetermined = false;
  let progressMap = {};
  let oldOtChapters = null, oldNtChapters = null, oldTotalDays = null;
  let lastChecked = null, lastCheckedDay = null;
  let auth, db; // These will be assigned later.
  
  // For visitors (not signed in), load settings from localStorage.
  function loadLocalSettings() {
    const storedOT = localStorage.getItem("otChapters");
    const storedNT = localStorage.getItem("ntChapters");
    if (storedOT) {
      document.getElementById("otChapters").value = storedOT;
    }
    if (storedNT) {
      document.getElementById("ntChapters").value = storedNT;
    }
    updateSchedule();
  }
  
  // clearAllProgress must be defined before updateSchedule uses it.
  function clearAllProgress() {
    console.log("Clearing saved progress.");
    progressMap = {};
    // Clear checkboxes from localStorage.
    for (let i = 1; i < 1000; i++) {
      localStorage.removeItem("check-day-" + i);
    }
    if (currentUser && db) {
      const userDocRef = db.collection("users").doc(currentUser.uid);
      userDocRef.set({ progress: {} }, { merge: true })
        .catch((error) => {
          console.error("Error clearing progress in Firestore:", error);
        });
    }
  }
  
  // Updated clearCheckboxes to not only remove localStorage values
  // but also uncheck all checkbox inputs in the DOM.
  function clearCheckboxes() {
    console.log("Clearing saved checkbox values and resetting checkboxes.");
    // Clear localStorage values.
    for (let i = 1; i < 1000; i++) {
      localStorage.removeItem("check-day-" + i);
    }
    // Uncheck all checkbox inputs in the DOM.
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  }
  
function init() {
  console.log("init called")
    if (!window.firebaseConfig) {
      console.error("firebaseConfig is not defined!");
      return;
    }
    firebase.initializeApp(window.firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
  
    const otBooks = [
      { name: "Gen", chapters: 50 }, { name: "Exod", chapters: 40 }, { name: "Lev", chapters: 27 },
      { name: "Num", chapters: 36 }, { name: "Deut", chapters: 34 }, { name: "Josh", chapters: 24 },
      { name: "Judg", chapters: 21 }, { name: "Ruth", chapters: 4 }, { name: "1 Sam", chapters: 31 },
      { name: "2 Sam", chapters: 24 }, { name: "1 Kgs", chapters: 22 }, { name: "2 Kgs", chapters: 25 },
      { name: "1 Chr", chapters: 29 }, { name: "2 Chr", chapters: 36 }, { name: "Ezra", chapters: 10 },
      { name: "Neh", chapters: 13 }, { name: "Est", chapters: 10 }, { name: "Job", chapters: 42 },
      { name: "Ps", chapters: 150 }, { name: "Prov", chapters: 31 }, { name: "Eccl", chapters: 12 },
      { name: "Song", chapters: 8 }, { name: "Isa", chapters: 66 }, { name: "Jer", chapters: 52 },
      { name: "Lam", chapters: 5 }, { name: "Ezek", chapters: 48 }, { name: "Dan", chapters: 12 },
      { name: "Hos", chapters: 14 }, { name: "Joel", chapters: 3 }, { name: "Amos", chapters: 9 },
      { name: "Obad", chapters: 1 }, { name: "Jonah", chapters: 4 }, { name: "Mic", chapters: 7 },
      { name: "Nah", chapters: 3 }, { name: "Hab", chapters: 3 }, { name: "Zeph", chapters: 3 },
      { name: "Hag", chapters: 2 }, { name: "Zech", chapters: 14 }, { name: "Mal", chapters: 4 }
    ];
    const ntBooks = [
      { name: "Matt", chapters: 28 }, { name: "Mark", chapters: 16 }, { name: "Luke", chapters: 24 },
      { name: "John", chapters: 21 }, { name: "Acts", chapters: 28 }, { name: "Rom", chapters: 16 },
      { name: "1 Cor", chapters: 16 }, { name: "2 Cor", chapters: 13 }, { name: "Gal", chapters: 6 },
      { name: "Eph", chapters: 6 }, { name: "Phil", chapters: 4 }, { name: "Col", chapters: 4 },
      { name: "1 Thess", chapters: 5 }, { name: "2 Thess", chapters: 3 }, { name: "1 Tim", chapters: 6 },
      { name: "2 Tim", chapters: 4 }, { name: "Titus", chapters: 3 }, { name: "Philem", chapters: 1 },
      { name: "Heb", chapters: 13 }, { name: "Jas", chapters: 5 }, { name: "1 Pet", chapters: 5 },
      { name: "2 Pet", chapters: 3 }, { name: "1 John", chapters: 5 }, { name: "2 John", chapters: 1 },
      { name: "3 John", chapters: 1 }, { name: "Jude", chapters: 1 }, { name: "Rev", chapters: 22 }
    ];
  
    // Auth state observer.
    auth.onAuthStateChanged((user) => {
      authStateDetermined = true;
      if (user) {
        currentUser = user;
        console.log("User signed in:", currentUser.email);
        document.getElementById("auth-header").innerHTML =
          '<span class="user-info">Welcome, ' + currentUser.email +
          ' <button onclick="signOut()">Sign Out</button></span>';
        loadUserData();
      } else {
        currentUser = null;
        console.log("No user signed in.");
        document.getElementById("auth-header").innerHTML =
          '<a href="signin">Sign in</a>';
        loadLocalSettings();
      }
    });
  
    // In case auth state isn't determined within 1 second, load local settings.
    setTimeout(() => {
      if (!authStateDetermined) {
        console.log("Auth state not determined; using local settings.");
        loadLocalSettings();
      }
    }, 1000);
  
    // Sign out function.
    function signOut() {
      auth.signOut().then(() => {
        currentUser = null;
        clearCheckboxes();
        document.getElementById("auth-header").innerHTML =
          '<a href="signin">Sign in</a>';
      }).catch((error) => {
        console.error("Sign out error:", error);
      });
    }
  
    // Save user settings (OT and NT chapters per day) to Firestore and localStorage.
    function saveUserSettings(otChapters, ntChapters) {
      localStorage.setItem("otChapters", otChapters);
      localStorage.setItem("ntChapters", ntChapters);
      if (currentUser) {
        const userDocRef = db.collection("users").doc(currentUser.uid);
        userDocRef.set({
          settings: { otChapters, ntChapters }
        }, { merge: true })
        .catch((error) => {
          console.error("Error saving settings:", error);
        });
      }
    }
  
    // Modified loadUserData to merge local progress if the user signs in for the first time.
    function loadUserData() {
      if (!currentUser) return;
      const userDocRef = db.collection("users").doc(currentUser.uid);
      userDocRef.get().then((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log("Loaded user data:", JSON.stringify(data, null, 2));
          if (data.settings) {
            const savedOT = data.settings.otChapters;
            const savedNT = data.settings.ntChapters;
            if (savedOT) {
              document.getElementById("otChapters").value = savedOT;
            }
            if (savedNT) {
              document.getElementById("ntChapters").value = savedNT;
            }
            localStorage.setItem("otChapters", savedOT);
            localStorage.setItem("ntChapters", savedNT);
          }
          // Merge local progress (if any) with Firestore progress.
          const localProgressStr = localStorage.getItem("progressMap");
          const localProgress = localProgressStr ? JSON.parse(localProgressStr) : {};
          progressMap = Object.assign({}, localProgress, data.progress || {});
          // Save the merged progress to Firestore.
          userDocRef.set({ progress: progressMap }, { merge: true });
          updateSchedule(() => {
            applyProgress();
          }, true);
        } else {
          console.log("No settings found in Firestore. Generating a new schedule.");
          // Use local progress if available.
          const localProgressStr = localStorage.getItem("progressMap");
          progressMap = localProgressStr ? JSON.parse(localProgressStr) : {};
          // Save local progress to Firestore.
          userDocRef.set({ progress: progressMap }, { merge: true });
          updateSchedule(() => {
            applyProgress();
          }, true);
        }
      }).catch((error) => {
        console.error("Error loading user data:", error);
      });
    }
  
    // Apply progress from progressMap.
    function applyProgress() {
      setTimeout(() => {
        console.log("Applying progress:", progressMap);
        for (const day in progressMap) {
          const checkbox = document.getElementById("check-day-" + day);
          if (checkbox) {
            checkbox.checked = progressMap[day];
          } else {
            console.warn("No checkbox found for day", day);
          }
        }
        console.log("Finished applying progress.");
      }, 200);
    }
  
    // Build the schedule table. Do not update if settings are unchanged.
    function updateSchedule(callback, useFirestoreProgress = false) {
      let otChapters = parseInt(document.getElementById("otChapters").value);
      let ntChapters = parseInt(document.getElementById("ntChapters").value);
      if (isNaN(otChapters) || otChapters < 1 || otChapters > 100 ||
          isNaN(ntChapters) || ntChapters < 1 || ntChapters > 100) {
        alert("Please enter a valid number between 1 and 100 for both OT and NT chapters per day.");
        return;
      }
      // Save the current settings.
      saveUserSettings(otChapters, ntChapters);
      
      const totalOT = 929, totalNT = 260;
      let otDays = Math.ceil(totalOT / otChapters);
      let ntDays = Math.ceil(totalNT / ntChapters);
      let totalDays = Math.max(otDays, ntDays);
      
      // If settings haven't changed, do not update.
      if (oldOtChapters !== null && oldNtChapters !== null && oldTotalDays !== null &&
          oldOtChapters === otChapters && oldNtChapters === ntChapters && oldTotalDays === totalDays) {
        console.log("Settings unchanged; schedule remains the same.");
        return;
      }
      
      // If settings have changed, clear progress.
      if (oldOtChapters !== null && oldNtChapters !== null && oldTotalDays !== null &&
          (oldOtChapters !== otChapters || oldNtChapters !== ntChapters || oldTotalDays !== totalDays)) {
        clearAllProgress();
      }
      
      // Update old settings.
      oldOtChapters = otChapters;
      oldNtChapters = ntChapters;
      oldTotalDays = totalDays;
  
      let otCycle = (otDays < totalDays);
      let ntCycle = (ntDays < totalDays);
      let otSchedule = generateSchedule(otBooks, otChapters, totalDays, otCycle);
      let ntSchedule = generateSchedule(ntBooks, ntChapters, totalDays, ntCycle);
      let tbody = document.getElementById("scheduleBody");
      tbody.innerHTML = "";
      lastChecked = null;
      lastCheckedDay = null;
      for (let day = 1; day <= totalDays; day++) {
        let otText = otSchedule[day - 1];
        let ntText = ntSchedule[day - 1];
        let otQuery = otText.replace(/\s/g, "");
        let ntQuery = ntText.replace(/\s/g, "");
        let url = "https://www.literalword.com/?q=" + otQuery + "," + ntQuery;
        let linkText = otText + " | " + ntText;
        let row = document.createElement("tr");
        row.id = "day-" + day;
        let cellDay = document.createElement("td");
        cellDay.textContent = day;
        row.appendChild(cellDay);
        let cellPassages = document.createElement("td");
        let a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.textContent = linkText;
        a.className = "hyperlink";
        cellPassages.appendChild(a);
        row.appendChild(cellPassages);
        let cellCheck = document.createElement("td");
        cellCheck.className = "checkbox-cell";
        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = "check-day-" + day;
        checkbox.addEventListener("click", function (event) { handleCheckboxClick(event, day); });
        if (!useFirestoreProgress && localStorage.getItem("check-day-" + day) === "true") {
          checkbox.checked = true;
        }
        cellCheck.appendChild(checkbox);
        row.appendChild(cellCheck);
        tbody.appendChild(row);
      }
      console.log("Schedule generated with", totalDays, "days.");
      if (typeof callback === "function") {
        callback();
      }
    }
  
    // Generate schedule text.
    function generateSchedule(books, chaptersPerDay, totalDays, cycle) {
      let schedule = [];
      let bookIdx = 0, chapter = 1;
      for (let day = 1; day <= totalDays; day++) {
        let daily = [];
        let remaining = chaptersPerDay;
        while (remaining > 0) {
          if (bookIdx >= books.length) {
            if (cycle) {
              bookIdx = 0;
              chapter = 1;
            } else break;
          }
          let book = books[bookIdx].name;
          let total = books[bookIdx].chapters;
          let available = total - chapter + 1;
          if (available <= remaining) {
            daily.push(available === 1 ? (book + " " + chapter) : (book + " " + chapter + "-" + total));
            remaining -= available;
            bookIdx++;
            chapter = 1;
          } else {
            let end = chapter + remaining - 1;
            daily.push(remaining === 1 ? (book + " " + chapter) : (book + " " + chapter + "-" + end));
            chapter = end + 1;
            remaining = 0;
          }
        }
        schedule.push(daily.join(", "));
      }
      return schedule;
    }
  
    // Checkbox click handler.
    function handleCheckboxClick(event, day) {
      let checkbox = event.target;
      if (event.shiftKey && lastChecked !== null) {
        let start = Math.min(lastCheckedDay, day);
        let end = Math.max(lastCheckedDay, day);
        for (let i = start; i <= end; i++) {
          let cb = document.getElementById("check-day-" + i);
          if (cb) {
            cb.checked = checkbox.checked;
            localStorage.setItem("check-day-" + i, cb.checked ? "true" : "false");
            saveProgress(i, cb.checked);
          }
        }
      } else {
        localStorage.setItem("check-day-" + day, checkbox.checked ? "true" : "false");
        saveProgress(day, checkbox.checked);
      }
      lastChecked = checkbox;
      lastCheckedDay = day;
    }
    
    // Save progress to Firestore and update localStorage.
    function saveProgress(day, isChecked) {
      progressMap[day] = isChecked;
      localStorage.setItem("progressMap", JSON.stringify(progressMap));
      if (!currentUser) {
        console.warn("No user signed in; progress saved locally only.");
        return;
      }
      const userDocRef = db.collection("users").doc(currentUser.uid);
      userDocRef.set({ progress: progressMap }, { merge: true })
        .then(() => {
          console.log("Progress saved for day", day);
        })
        .catch((error) => {
          console.error("Error saving progress:", error);
        });
    }
    
    // Export schedule to Excel using ExcelJS and FileSaver.
    function exportToExcel() {
      let workbook = new ExcelJS.Workbook();
      let worksheet = workbook.addWorksheet("Sheet1");
      let header = ["Day", "Passages", "Done"];
      worksheet.addRow(header);
      let tbody = document.getElementById("scheduleBody");
      for (let i = 0; i < tbody.rows.length; i++) {
        let row = tbody.rows[i];
        let day = row.cells[0].textContent.trim();
        let linkElem = row.cells[1].querySelector("a");
        let url = linkElem ? linkElem.href : "";
        let displayText = linkElem ? linkElem.textContent : "";
        let passageCellValue = { text: displayText, hyperlink: url };
        let checkbox = row.cells[2].querySelector("input[type='checkbox']");
        let done = (checkbox && checkbox.checked) ? "X" : "";
        worksheet.addRow([parseInt(day), passageCellValue, done]);
      }
      worksheet.getColumn(2).eachCell((cell, rowNumber) => {
        if (rowNumber === 1) return;
        if (cell.value && cell.value.hyperlink) {
          cell.font = { color: { argb: 'FF0000FF' }, underline: true };
        }
      });
      let data = [];
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        let rowData = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          let cellText = "";
          if (cell.value && typeof cell.value === "object" && cell.value.text)
            cellText = cell.value.text;
          else
            cellText = cell.value ? cell.value.toString() : "";
          rowData.push(cellText);
        });
        data.push(rowData);
      });
      function computeColWidths(data, maxWidth = 30) {
        let colCount = data[0].length;
        let colWidths = new Array(colCount).fill(0);
        data.forEach(row => {
          for (let j = 0; j < colCount; j++) {
            let cell = row[j];
            let cellText = "";
            if (typeof cell === "object" && cell !== null) {
              if (cell.text) cellText = cell.text.toString();
              else if (cell.f) cellText = cell.f.toString();
              else if (cell.v) cellText = cell.v.toString();
            } else {
              cellText = cell ? cell.toString() : "";
            }
            colWidths[j] = Math.max(colWidths[j], cellText.length);
          }
        });
        return colWidths.map(w => ({ width: Math.min(w + 2, maxWidth) }));
      }
      let colWidths = computeColWidths(data, 30);
      colWidths.forEach((cw, i) => {
        worksheet.getColumn(i + 1).width = cw.width;
      });
      workbook.xlsx.writeBuffer().then(function (buffer) {
        let blob = new Blob([buffer], { type: "application/octet-stream" });
        saveAs(blob, "bible_reading_progress.xlsx");
      }).catch(function (error) {
        console.error("Error writing Excel file:", error);
      });
    }
    
    // Attach event listeners to the buttons.
    document.getElementById("updateScheduleBtn").addEventListener("click", function() {
      updateSchedule();
    }); 
    
    document.getElementById("exportExcelBtn").addEventListener("click", exportToExcel);
    
    // Expose functions globally.
    window.signOut = signOut;
    window.exportToExcel = exportToExcel;
    window.updateSchedule = updateSchedule;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

// Example placeholder:
console.log("Index script loaded");
// Initialize Firebase auth, build schedule, attach event listeners, etc.
