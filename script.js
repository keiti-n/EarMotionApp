// ================= BLE =================
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

let device, characteristic;

// ================= STATE =================
let recording = false;
let demoMode = false;

let eegData = [], alphaData = [], betaData = [], emgData = [], labels = [];
let recordedData = [];

// ================= CONNECT BLE =================
async function connect() {
  try {
    device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [SERVICE_UUID]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', handleBLE);

    document.getElementById("status").innerText = "Connected";

  } catch (err) {
    console.error(err);
    alert("Bluetooth connection failed");
  }
}

function disconnect() {
  if (device?.gatt.connected) device.gatt.disconnect();
  document.getElementById("status").innerText = "Disconnected";
}

// ================= BLE DATA =================
function handleBLE(event) {
  const value = new TextDecoder().decode(event.target.value);
  const [raw, alpha, beta, emg] = value.split(",").map(Number);

  updateData(raw, alpha, beta, emg);
}

// ================= UPDATE DATA =================
function updateData(raw, alpha, beta, emg) {

  const time = Date.now() / 1000;

  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);
  labels.push(time);

  if (labels.length > 100) {
    eegData.shift(); alphaData.shift();
    betaData.shift(); emgData.shift();
    labels.shift();
  }

  updateEmotion(alpha, beta, emg);
  updateEMGEmotion(emg);

  if (recording) {
    recordedData.push({ time, raw, alpha, beta, emg });
  }
}

// ================= EMOTION LOGIC =================
function updateEmotion(alpha, beta, emg) {

  let eegState =
    beta > alpha * 1.5 ? "Stressed" :
    beta > alpha ? "Excited" :
    "Calm";

  document.getElementById("eegEmotion").innerText = eegState;
}

// ================= EMG EMOTION (FIXED) =================
function updateEMGEmotion(emg) {

  let state =
    emg > 60 ? "Tense" :
    emg > 30 ? "Active" :
    "Relaxed";

  document.getElementById("emgEmotion").innerText = state;
}

// ================= RECORDING TOGGLE (FIXED) =================
function toggleRecording() {

  const btn = document.getElementById("recordBtn");

  if (!recording) {
    recordedData = [];
    recording = true;
    btn.innerText = "Stop & Download CSV";
    document.getElementById("status").innerText = "Recording...";
    return;
  }

  recording = false;
  btn.innerText = "Start Recording";
  downloadCSV();
}

// ================= CSV =================
function downloadCSV() {
  let csv = "time,raw,alpha,beta,emg\n";

  recordedData.forEach(r => {
    csv += `${r.time},${r.raw},${r.alpha},${r.beta},${r.emg}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  a.click();
}

// ================= AZURE PANEL TOGGLE =================
function toggleAzureUI() {
  document.getElementById("azurePanel").classList.toggle("hidden");
}

async function loadAzureCSV() {
  const url = document.getElementById("azureUrl").value;

  const res = await fetch(url);
  const text = await res.text();

  const rows = text.split("\n").slice(1);

  rows.forEach(r => {
    const [time, raw, alpha, beta, emg] = r.split(",").map(Number);
    updateData(raw, alpha, beta, emg);
  });
}

// ================= DEMO =================
function toggleDemo() {
  demoMode = !demoMode;
  if (demoMode) demoLoop();
}

function demoLoop() {
  if (!demoMode) return;

  const alpha = 40 + Math.random()*10;
  const beta = 30 + Math.random()*15;
  const emg = 20 + Math.random()*40;
  const raw = alpha + beta;

  updateData(raw, alpha, beta, emg);

  setTimeout(demoLoop, 100);
}

// ================= THEME =================
function toggleTheme() {
  document.body.classList.toggle("dark");
}
