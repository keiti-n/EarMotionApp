const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

// ================= STATE =================
let connected = false;
let demoMode = false;
let darkMode = false;

let sampleRate = 10;
let windowSeconds = 10;
let maxPoints = sampleRate * windowSeconds;


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

  const buttons = document.querySelectorAll(".toggle button");
  buttons[1].classList.add("active");
  buttons[0].classList.remove("active");
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
    runDemo();
  }
}

function runDemo() {
  if (!demoMode) return;

  const dailyEEG = [ //Daily Trends Table
  {date:"4/18", power:42, emotion:"Calm", fluct:32},
  {date:"4/19", power:35, emotion:"Stressed", fluct:38},
  {date:"4/20", power:50, emotion:"Excited", fluct:29},
  {date:"4/21", power:47, emotion:"Calm", fluct:31},
  {date:"4/22", power:39, emotion:"Stressed", fluct:35},
  {date:"4/23", power:44, emotion:"Excited", fluct:30},
  {date:"4/24", power:48, emotion:"Calm", fluct:28},
  ];

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

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["12345678-1234-1234-1234-123456789abc"]
    });

    if (!device) return false;
    //alert("Device selected: " + device.name);
  
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("12345678-1234-1234-1234-123456789abc");
    const characteristic = await service.getCharacteristic("abcd1234-5678-1234-5678-abcdef123456");
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
  a.download = "EarMotion_data.csv";
  a.click();
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

      const date = new Date().toLocaleDateString(); // temp

      if (!dailyMap[date]) {
        dailyMap[date] = { power: 0, emg: 0, count: 0 };
      }

      dailyMap[date].power += parseFloat(alpha) + parseFloat(beta);
      dailyMap[date].emg += parseFloat(emg);
      dailyMap[date].count += 1;
    });
  }

  const processed = Object.keys(dailyMap).map(date => {
    const d = dailyMap[date];
    return {
      date,
      power: d.count ? d.power / d.count : 0,
      emg: d.count ? d.emg / d.count : 0
    };
  });

  updateEEGTrends(processed);
}

function setNoDataState() { //If no data for past 7 days
  updateEEGTrends([
    {date:"--", power:0, emotion:"--", fluct:"--"}
  ]);
}

function updateEEGTrends(data) {
  eegTrendChart.data.labels = data.map(d => d.date);
  eegTrendChart.data.datasets[0].data = data.map(d => d.power);
  eegTrendChart.update();

  const tbody = document.querySelector("#eegTable tbody");
  tbody.innerHTML = "";

  data.forEach(d => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${d.date}</td>
      <td>${d.power.toFixed ? d.power.toFixed(1) : d.power}</td>
      <td>${d.emotion || "--"}</td>
      <td>${d.fluct || "--"}</td>
    `;

    tbody.appendChild(row);
  });
}

const eegTrendChart = new Chart(document.getElementById("eegTrendChart"), {
  type: "bar",
  data: {
    labels: dailyEEG.map(d => d.date),
    datasets: [{
      label: "Avg EEG Power",
      data: dailyEEG.map(d => d.power),
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


function populateEEGTable() {
  const tbody = document.querySelector("#eegTable tbody");
  tbody.innerHTML = "";

  dailyEEG.forEach(d => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${d.date}</td>
      <td>${d.power}</td>
      <td>${d.emotion}</td>
      <td>${d.fluct}</td>
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
  [eegChart, emgChart, eegTrendChart].forEach(chart => {
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
  populateEEGTable();
});
