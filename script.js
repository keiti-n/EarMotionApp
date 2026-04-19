const DEVICE_NAME = "EEG_EMG_Monitor";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

// ================= STATE =================
let connected = false;
let demoMode = false;
let darkMode = false;

let sampleRate = 10;
let windowSeconds = 10;
let maxPoints = sampleRate * windowSeconds;

let bleDevice = null;

// ================= CHANGING BUTTONS =================
async function toggleConnection() {
  const btn = document.getElementById("connectBtn");

  if (!connected) {
    const success = await connect();
    if (success) {
      connected = true;
      btn.innerText = "Disconnect";
    } else {
      connected = false;
      btn.innerText = "Connect";
    }
  } else {
    disconnect();
    connected = false;
    btn.innerText = "Connect";
  }
}

function toggleRecording() {
  const btn = document.getElementById("recordBtn");

  if (!connected && !demoMode) {
    alert("Please connect device or enable demo mode");
    return;
  }

  if (!recording) {
    startRecording();
    btn.innerText = "Stop Recording";
  } else {
    stopRecording();
    btn.innerText = "Start Recording";
  }
}

// ================= TABS =================
function showEEGRealtime() {
  document.getElementById("eegRealtime").style.display = "block";
  document.getElementById("eegTrends").style.display = "none";

  const buttons = document.querySelectorAll(".toggle button");
  buttons[0].classList.add("active");
  buttons[1].classList.remove("active");
}

function showEEGTrends() {
  document.getElementById("eegRealtime").style.display = "none";
  document.getElementById("eegTrends").style.display = "block";

  const eegButtons = document.querySelectorAll("#eegToggle button");
  eegButtons[1].classList.add("active");
  eegButtons[0].classList.remove("active");

  if (demoMode) {
    dailyEEGData = demoEEGData;
    updateEEGTrends(dailyEEGData);
  } else if (dataFolderHandle) {
    loadTrendData();
  } else {
    setNoDataState();
  }
}

function setEMGActive(index) {
  const buttons = document.querySelectorAll("#emgToggle button");
  buttons.forEach((b, i) => b.classList.toggle("active", i === index));
}

function showEMGRealtime() {
  document.getElementById("emgRealtime").style.display = "block";
  document.getElementById("emgTrends").style.display = "none";
  setEMGActive(0);
}

function showEMGTrends() {
  document.getElementById("emgRealtime").style.display = "none";
  document.getElementById("emgTrends").style.display = "block";
  setEMGActive(1);

  if (demoMode) {
    updateEMGTrends(demoEMGData);
  } else if (dataFolderHandle) {
    loadTrendData();
  } else {
    setNoDataState();
  }
}

// ================= DATA =================
let eegData = [];
let alphaData = [];
let betaData = [];
let emgData = [];
let labels = [];

let currentEmotion = "Calm";

// ================= RECORDING =================
let recording = false;
let recordedData = [];
let startTime = 0;

// ================= CHARTS =================
const eegChart = new Chart(document.getElementById("eegChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Raw EEG", data: [], borderColor:"#CDB4DB", borderWidth: 2, pointRadius: 0 },
      { label: "Alpha", data: [], borderColor:"#A2D2FF", borderWidth: 2, pointRadius: 0 },
      { label: "Beta", data: [], borderColor:"#FFAFCC", borderWidth: 2, pointRadius: 0 }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: { beginAtZero: false }
    }
  }
});

const emgChart = new Chart(document.getElementById("emgChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "EMG", data: [], borderColor:"#BDE0FE", borderWidth: 2, pointRadius: 0 }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: { beginAtZero: false }
    }
  }
});

// ================= REALTIME DEMO =================
function randn() {
  return (Math.random() - 0.5) * 2;
}

function toggleDemo() {
  demoMode = !demoMode;

  if (demoMode) {
    connected = false;
    document.getElementById("status").innerText = "Demo Mode";
    dailyEEGData = demoEEGData;
    updateEEGTrends(dailyEEGData);
    runDemo();
  }
}

function runDemo() {
  if (!demoMode) return;

  const states = ["Calm","Excited","Stressed","Sad"];

  if (Math.random() < 0.02) {
    currentEmotion = states[Math.floor(Math.random() * states.length)];
  }

  let alpha, beta, emg;

  switch(currentEmotion) {
    case "Calm":
      alpha = 45 + randn()*6;
      beta  = 15 + randn()*4;
      emg   = 10 + Math.abs(randn()*5);
      break;

    case "Excited":
      alpha = 35 + randn()*6;
      beta  = 35 + randn()*8;
      emg   = 25 + Math.abs(randn()*8);
      break;

    case "Stressed":
      alpha = 15 + randn()*5;
      beta  = 60 + randn()*10;
      emg   = 55 + Math.abs(randn()*12);
      break;

    case "Sad":
      alpha = 25 + randn()*5;
      beta  = 25 + randn()*5;
      emg   = 20 + Math.abs(randn()*6);
      break;
  }

  const raw = alpha + beta + randn()*10;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 1000 / sampleRate);
}

let dailyEEGData = [];
const demoEEGData = [
  {date:"4/18", eeg:42, emotion:"Calm", fluct:12, duration:7},
  {date:"4/19", eeg:35, emotion:"Stressed", fluct:18, duration:20},
  {date:"4/20", eeg:50, emotion:"Excited", fluct:9, duration:15},
  {date:"4/21", eeg:47, emotion:"Calm", fluct:11, duration:27},
  {date:"4/22", eeg:39, emotion:"Stressed", fluct:8, duration:19},
  {date:"4/23", eeg:44, emotion:"Excited", fluct:5, duration:4},
  {date:"4/24", eeg:48, emotion:"Calm", fluct:6, duration:8},
];

let dailyEMGData = [];
const demoEMGData = [
  {date:"4/18", emg:12, emotion:"Calm", fluct:12, duration:7},
  {date:"4/19", emg:32, emotion:"Stressed", fluct:18, duration:20},
  {date:"4/20", emg:21, emotion:"Excited", fluct:9, duration:15},
  {date:"4/21", emg:14, emotion:"Calm", fluct:11, duration:27},
  {date:"4/22", emg:36, emotion:"Stressed", fluct:8, duration:19},
  {date:"4/23", emg:24, emotion:"Excited", fluct:5, duration:4},
  {date:"4/24", emg:13, emotion:"Calm", fluct:6, duration:8},
];

// ================= REALTIME =================
function updateData(raw, alpha, beta, emg) {

  const time = Date.now() / 1000;

  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);
  labels.push(time);

  while (labels.length > maxPoints) {
    eegData.shift();
    alphaData.shift();
    betaData.shift();
    emgData.shift();
    labels.shift();
  }

  eegChart.data.labels = labels;
  eegChart.data.datasets[0].data = eegData;
  eegChart.data.datasets[1].data = alphaData;
  eegChart.data.datasets[2].data = betaData;
  eegChart.update();

  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  updateEmotion(alpha, beta, emg);

  if (recording) {
    recordedData.push({
      time: (Date.now() - startTime) / 1000,
      rawEEG: raw,
      alpha,
      beta,
      emg,
      emotion: currentEmotion
    });
  }
}

// ================= EMOTION LOGIC =================
function updateEmotion(alpha, beta, emg) {

  let state = currentEmotion;

  if (beta > alpha * 1.5) state = "Stressed";
  else if (beta > alpha * 1.1) state = "Excited";
  else if (alpha > beta) state = "Calm";
  else state = "Sad";

  document.getElementById("status").innerText = "State: " + state;
  document.getElementById("eegEmotion").innerText = "EEG: " + currentEmotion;
  document.getElementById("emgEmotion").innerText =
    "EMG: " + (state === "Stressed" ? "Active"
      : state === "Excited" ? "Active"
      : "Relaxed");
}

// ================= CONNECT =================
async function connect() {
  try {

    if (!navigator.bluetooth) {
      alert("Bluetooth not supported in this browser");
      return;
    }
    //const device = await navigator.bluetooth.requestDevice({
      //filters: [{ name: DEVICE_NAME }],
      //optionalServices: [SERVICE_UUID]
   // });

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });
    
    bleDevice = device;

    if (!device) return false;
    //alert("Device selected: " + device.name);
    
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    await characteristic.startNotifications();
    characteristic.addEventListener("characteristicvaluechanged", handleBLE);
    document.getElementById("status").innerText = "Connected";
    return true;

  } catch (err) {
    console.log("Connection cancelled or failed:", err.message);
    //alert("ERROR: " + err.message);
    document.getElementById("status").innerText = "Not Connected";
    return false;
  }
}

function disconnect() {
  if (bleDevice && bleDevice.gatt.connected) {
    bleDevice.gatt.disconnect();
  }
  connected = false;
  demoMode = false;
  document.getElementById("status").innerText = "Disconnected";
}

// ================= RECORDING =================
function startRecording() {
  recordedData = [];
  recording = true;
  startTime = Date.now();
  document.getElementById("status").innerText = "Recording...";
}

function stopRecording() {
  recording = false;
  document.getElementById("status").innerText = "Stopped Recording";
}

function downloadCSV() {
  let csv = "time,rawEEG,alpha,beta,emg,emotion\n";

  recordedData.forEach(r => {
    csv += `${r.time},${r.rawEEG},${r.alpha},${r.beta},${r.emg},${r.emotion}\n`;
  });
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  
  const now = new Date();
  const mm = String(now.getMonth()+1).padStart(2,'0');
  const dd = String(now.getDate()).padStart(2,'0');
  const yyyy = now.getFullYear();
  a.download = `EarData${mm}${dd}${yyyy}.csv`;
  
  a.click();
}

// ================= BLE & Data Processing =================
function parseBLE(value) {
  const decoded = new TextDecoder().decode(value).trim();
  console.log("RAW STRING:", decoded);
  const parts = decoded.split(",");

  if (parts.length < 3) return null;
  const nums = parts.map(Number);
  if (nums.some(isNaN)) return null;

  return {
    time: nums[0] / 1000,
    rawEEG: nums[1],
    rawEMG: nums[2]
  };
}

function handleBLE(event) {
  const parsed = parseBLE(event.target.value);
  console.log("BLE EVENT");
  if (!parsed) return;
  processSignal(parsed);
}

function processSignal({ time, rawEEG, rawEMG }) {
  const filteredEEG = bandpassFilter(rawEEG);
  const smoothEEG = smoothSignal(filteredEEG);
  const { alpha, beta } = extractBands(smoothEEG);

  const smoothEMG = smoothSignal(rawEMG, emgBuffer);

  updateData(filteredEEG, alpha, beta, smoothEMG);
}

let eegBuffer = []; //Buffer for bandpass
let emgBuffer = [];
const BUFFER_SIZE = 64; // ~1–2 seconds depending on sample rate


let prevEEG = 0;
function bandpassFilter(x) {
  const alpha = 0.1; // tuning parameter
  const filtered = alpha * x + (1 - alpha) * prevEEG;
  prevEEG = filtered;
  return filtered;
}

function smoothSignal(value, buffer = eegBuffer) {
  buffer.push(value);
  if (buffer.length > BUFFER_SIZE) buffer.shift();
  const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  return avg;
}

function extractBands(signal) { //temp simplification w/o FFT
  const alpha = signal * 0.6;  // low-frequency component
  const beta  = signal * 0.4;  // higher-frequency proxy
  return { alpha, beta };
}


// ================= Daily Trends =================
let dataFolderHandle = null;  //Select folder for browser to read data from

async function selectDataFolder() {
  try {
    dataFolderHandle = await window.showDirectoryPicker();
    alert("Folder selected!");
    loadTrendData();
  } catch (err) {
    console.log("Folder selection cancelled");
  }
}

async function loadTrendData() {
  if (!dataFolderHandle) return;

  let files = [];

  for await (const entry of dataFolderHandle.values()) {
    if (entry.kind === "file" && entry.name.endsWith(".csv")) {
      files.push(entry);
    }
  }

  if (files.length === 0) {
    setNoDataState();
    return;
  }

  const dailyMap = {};

  for (const fileHandle of files) {
    const file = await fileHandle.getFile();
    const text = await file.text();

    const lines = text.split("\n").slice(1); // skip header

    lines.forEach(line => {
      if (!line.trim()) return;

      const [time, raw, alpha, beta, emg, emotion] = line.split(",");

      const date = parseDateFromFilename(fileHandle.name);
      if (!date) return; // skip bad filenames

      if (!dailyMap[date]) {
        dailyMap[date] = {
          eeg: 0,
          emg: 0,
          count: 0,
          lastEmotion: null,
          transitions: 0,
          startTime: null,
          endTime: null
        };
      }

      dailyMap[date].eeg += parseFloat(alpha) + parseFloat(beta);
      dailyMap[date].emg += parseFloat(emg);
      dailyMap[date].count += 1;
      
      const t = parseFloat(time);
      if (dailyMap[date].startTime === null) {
        dailyMap[date].startTime = t;
      }
      dailyMap[date].endTime = t;
      
      const currentEmotion = emotion?.trim();
      if (dailyMap[date].lastEmotion !== null &&
          currentEmotion !== dailyMap[date].lastEmotion) {
        dailyMap[date].transitions += 1;
      }
      dailyMap[date].lastEmotion = currentEmotion;

    });
  }


  const processed = Object.keys(dailyMap).map(date => {
    const d = dailyMap[date]; //date

    const duration = (d.endTime !== null && d.startTime !== null)
      ? (d.endTime - d.startTime)
      : 0;

    return {
      date,
      eeg: d.count ? d.eeg / d.count : 0,
      emg: d.count ? d.emg / d.count : 0,
      fluct: d.transitions,
      duration: (duration / 60).toFixed(1) //convert to minutes
    };
  });

  processed.sort((a, b) => {   // sort by date (MM/DD)
    const [am, ad] = a.date.split("/").map(Number);
    const [bm, bd] = b.date.split("/").map(Number);

    return new Date(2026, am-1, ad) - new Date(2026, bm-1, bd);
  });
    
  const last7 = processed.slice(-7);  // last 7 days

  dailyEEGData = last7;
  updateEEGTrends(dailyEEGData);
  updateEMGTrends(dailyEEGData);
}

function parseDateFromFilename(filename) {
  // Example: EarData04242026.csv
  const match = filename.match(/EarData(\d{2})(\d{2})(\d{4})/);

  if (!match) return null;

  const mm = match[1];
  const dd = match[2];

  return `${mm}/${dd}`; // format like "04/24"
}


function setNoDataState() {
  updateEEGTrends([
    {date:"--", eeg:0, emotion:"--", fluct:"--", duration:"--"}
  ]);
  
  updateEMGTrends([
    {date:"--", emg:0, emotion:"--", fluct:"--", duration:"--"}
  ]);
}

function updateEEGTrends(data) {
  const labels = data.map(d => d.date);

  eegTrendChart.data.labels = labels;
  eegTrendChart.data.datasets[0].data = data.map(d => d.eeg);
  eegTrendChart.update();

  const tbody = document.querySelector("#eegTable tbody");
  tbody.innerHTML = "";

  data.forEach(d => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${d.date}</td>
      <td>${typeof d.eeg === "number" ? d.eeg.toFixed(1) : "--"}</td>
      <td>${d.emotion || "--"}</td>
      <td>${d.fluct || 0}</td>
      <td>${d.duration ? d.duration : "--"}</td>
    `;

    tbody.appendChild(row);
  });
}

const eegTrendChart = new Chart(document.getElementById("eegTrendChart"), {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Avg EEG Power",
      data: [],
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
});

const emgTrendChart = new Chart(document.getElementById("emgTrendChart"), {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Avg EMG Activity",
      data: [],
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: true }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
});


function updateEMGTrends(data) {
  const labels = data.map(d => d.date);

  emgTrendChart.data.labels = labels;
  emgTrendChart.data.datasets[0].data = data.map(d => d.emg);
  emgTrendChart.update();

  const tbody = document.querySelector("#emgTable tbody");
  tbody.innerHTML = "";

  data.forEach(d => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${d.date}</td>
      <td>${typeof d.emg === "number" ? d.emg.toFixed(1) : "--"}</td>
      <td>${d.emotion || "--"}</td>
      <td>${d.fluct || 0}</td>
      <td>${d.duration ? d.duration : "--"}</td>
    `;

    tbody.appendChild(row);
  });
}



// ================= THEME =================
function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");

  const logo = document.getElementById("logo");

  if (darkMode) {
    logo.src = "assets/images/logo_dark.png";
  } else {
    logo.src = "assets/images/logo_light.png";
  }
  updateChartTheme();
}

function updateChartTheme() {
  const textColor = darkMode ? "#E8E3DC" : "#3E3A34";
  const gridColor = darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  [eegChart, emgChart, eegTrendChart, emgTrendChart].forEach(chart => {
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
  });
}

window.addEventListener("load", () => {
  showEEGRealtime();
  showEMGRealtime();
});
