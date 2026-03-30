const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

let connected = false;
let demoMode = false;
let darkMode = false;

// ===== TIME WINDOW SETTINGS =====
let sampleRate = 10; // samples per second (demo)
let windowSeconds = 10;
let maxPoints = sampleRate * windowSeconds;

// ===== DATA =====
let eegData = [], alphaData = [], betaData = [], emgData = [];
let labels = [];

// ===== DEMO STATE =====
let currentEmotion = "Calm";

// =======================
// CHART SETUP (CLEAN STYLE)
// =======================
const eegChart = new Chart(document.getElementById("eegChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Raw EEG", data: [], borderWidth: 2, pointRadius: 0 },
      { label: "Alpha", data: [], borderWidth: 2, pointRadius: 0 },
      { label: "Beta", data: [], borderWidth: 2, pointRadius: 0 }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: { beginAtZero: true }
    }
  }
});

const emgChart = new Chart(document.getElementById("emgChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "EMG", data: [], borderWidth: 2, pointRadius: 0 }
    ]
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { display: false },
      y: { beginAtZero: true }
    }
  }
});

// =======================
// BLE CONNECT
// =======================
async function connect() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ name: DEVICE_NAME }],
    optionalServices: [SERVICE_UUID]
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

  await characteristic.startNotifications();

  connected = true;
  demoMode = false;

  document.getElementById("status").innerText = "Connected";

  characteristic.addEventListener("characteristicvaluechanged", (event) => {
    const value = new TextDecoder().decode(event.target.value);
    const [rawEEG, alpha, beta, emg] = value.split(",");

    updateData(
      Number(rawEEG),
      Number(alpha),
      Number(beta),
      Number(emg)
    );
  });
}

// =======================
// DISCONNECT
// =======================
function disconnect() {
  connected = false;
  demoMode = false;
  document.getElementById("status").innerText = "Disconnected";
}

// =======================
// DEMO MODE (REALISTIC NOISE)
// =======================
function toggleDemo() {
  demoMode = !demoMode;

  if (demoMode) {
    connected = false;
    document.getElementById("status").innerText = "Demo Mode";
    runDemo();
  }
}

// Generate noisy, irregular signals
function runDemo() {
  if (!demoMode) return;

  // occasional emotion change
  if (Math.random() < 0.02) {
    const states = ["Calm", "Focused", "Stressed"];
    currentEmotion = states[Math.floor(Math.random() * states.length)];
  }

  let alpha, beta, emg;

  if (currentEmotion === "Calm") {
    alpha = 40 + randn() * 5;
    beta = 15 + randn() * 4;
    emg = 10 + Math.abs(randn() * 5);
  }
  else if (currentEmotion === "Focused") {
    alpha = 25 + randn() * 5;
    beta = 35 + randn() * 6;
    emg = 20 + Math.abs(randn() * 6);
  }
  else {
    alpha = 15 + randn() * 4;
    beta = 50 + randn() * 8;
    emg = 50 + Math.abs(randn() * 10);
  }

  const raw = alpha + beta + randn() * 10;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 1000 / sampleRate);
}

// Gaussian noise (makes it look real)
function randn() {
  return (Math.random() - 0.5) * 2;
}

// =======================
// DATA UPDATE (TIME WINDOW)
// =======================
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
}

// =======================
// EMOTION DISPLAY
// =======================
function updateEmotion(alpha, beta, emg) {
  let state = "Calm";

  if (beta > alpha * 1.4) state = "Stressed";
  else if (beta > alpha) state = "Focused";

  document.getElementById("status").innerText = "Overall: " + state;
  document.getElementById("eegEmotion").innerText = "EEG: " + state;
  document.getElementById("emgEmotion").innerText =
    emg > 40 ? "EMG: Active" : "EMG: Relaxed";
}

// =======================
// THEME
// =======================
function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");
}
