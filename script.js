const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

let connected = false;
let demoMode = false;
let darkMode = false;

let eegData = [], alphaData = [], betaData = [], emgData = [];

let t = 0;
let currentEmotion = "Calm";
let demoCounter = 0;

// =======================
// CHART SETUP
// =======================
const eegChart = new Chart(document.getElementById("eegChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Raw EEG", data: [] },
      { label: "Alpha", data: [] },
      { label: "Beta", data: [] }
    ]
  }
});

const emgChart = new Chart(document.getElementById("emgChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [{ label: "EMG", data: [] }]
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

    updateData(Number(rawEEG), Number(alpha), Number(beta), Number(emg));
  });
}

// =======================
// DISCONNECT
// =======================
function disconnect() {
  connected = false;
  demoMode = false;
  document.getElementById("status").innerText = "Disconnected";

  const btn = document.querySelectorAll("button")[2];
  btn.innerText = "Demo Mode";
}

// =======================
// DEMO MODE
// =======================
function toggleDemo() {
  demoMode = !demoMode;

  const btn = document.querySelectorAll("button")[2];

  if (demoMode) {
    connected = false;
    btn.innerText = "Stop Demo";
    document.getElementById("status").innerText = "Demo Mode Running";
    runDemo();
  } else {
    btn.innerText = "Demo Mode";
    document.getElementById("status").innerText = "Demo Stopped";
  }
}

// =======================
// THEME
// =======================
function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");
}

// =======================
// DATA UPDATE
// =======================
function updateData(raw, alpha, beta, emg) {
  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);

  if (eegData.length > 200) {
    eegData.shift();
    alphaData.shift();
    betaData.shift();
    emgData.shift();
  }

  eegChart.data.labels = eegData.map((_, i) => i);
  eegChart.data.datasets[0].data = eegData;
  eegChart.data.datasets[1].data = alphaData;
  eegChart.data.datasets[2].data = betaData;
  eegChart.update();

  emgChart.data.labels = emgData.map((_, i) => i);
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  updateEmotion(alpha, beta, emg);
}

// =======================
// EMOTION LOGIC
// =======================
function updateEmotion(alpha, beta, emg) {
  let state = "Calm";

  if (beta > alpha * 1.5) state = "Stressed";
  else if (alpha > beta) state = "Relaxed";

  document.getElementById("status").innerText = "Overall: " + state;
  document.getElementById("eegEmotion").innerText = "EEG: " + state;
  document.getElementById("emgEmotion").innerText =
    emg > 40 ? "EMG: Active" : "EMG: Relaxed";
}

// =======================
// DEMO SIGNAL GENERATOR
// =======================
function runDemo() {
  if (!demoMode) return;

  t += 0.1;
  demoCounter++;

  // Change emotion every ~5 seconds
  if (demoCounter % 50 === 0) {
    const emotions = ["Calm", "Focused", "Stressed"];
    currentEmotion = emotions[Math.floor(Math.random() * emotions.length)];
  }

  let raw, alpha, beta, emg;

  if (currentEmotion === "Calm") {
    alpha = 40 + 10 * Math.sin(t);
    beta = 15 + 5 * Math.sin(t * 1.5);
    emg = 10 + Math.random() * 5;
  } 
  else if (currentEmotion === "Focused") {
    alpha = 25 + 5 * Math.sin(t);
    beta = 35 + 10 * Math.sin(t * 1.2);
    emg = 20 + Math.random() * 10;
  } 
  else {
    alpha = 15 + 5 * Math.sin(t);
    beta = 50 + 15 * Math.sin(t * 2);
    emg = 50 + Math.random() * 20;
  }

  raw = alpha + beta + Math.random() * 10;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 100);
}
