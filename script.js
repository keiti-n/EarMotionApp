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
    await connect();
    connected = true;
    btn.innerText = "Disconnect";
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
window.onload = () => {
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
  
};
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

// ================= DEMO =================
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

// ================= DATA =================
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
    disconnect();
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
}

