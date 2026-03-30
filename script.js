const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

// ================= STATE =================
let connected = false;
let demoMode = false;
let darkMode = false;

// ================= TIME WINDOW =================
let sampleRate = 10;       // Hz
let windowSeconds = 10;     // change this anytime
let maxPoints = sampleRate * windowSeconds;

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
      y: { beginAtZero: false }
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
      y: { beginAtZero: false }
    }
  }
});

// ================= BLE CONNECT =================
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
    const [raw, alpha, beta, emg] = value.split(",");

    updateData(+raw, +alpha, +beta, +emg);
  });
}

// ================= DISCONNECT =================
function disconnect() {
  connected = false;
  demoMode = false;
  document.getElementById("status").innerText = "Disconnected";
}

// ================= DEMO MODE =================
function toggleDemo() {
  demoMode = !demoMode;

  if (demoMode) {
    connected = false;
    document.getElementById("status").innerText = "Demo Mode";
    runDemo();
  }
}

// “realistic noise” generator
function randn() {
  return (Math.random() - 0.5) * 2;
}

function runDemo() {
  if (!demoMode) return;

  if (Math.random() < 0.02) {
    const states = ["Calm", "Focused", "Stressed"];
    currentEmotion = states[Math.floor(Math.random() * states.length)];
  }

  let alpha, beta, emg;

  if (currentEmotion === "Calm") {
    alpha = 40 + randn() * 6;
    beta = 15 + randn() * 5;
    emg = 10 + Math.abs(randn() * 6);
  } else if (currentEmotion === "Focused") {
    alpha = 25 + randn() * 6;
    beta = 35 + randn() * 7;
    emg = 20 + Math.abs(randn() * 8);
  } else {
    alpha = 15 + randn() * 5;
    beta = 55 + randn() * 10;
    emg = 50 + Math.abs(randn() * 12);
  }

  const raw = alpha + beta + randn() * 12;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 1000 / sampleRate);
}

// ================= UPDATE DATA =================
function updateData(raw, alpha, beta, emg) {

  const time = Date.now() / 1000;

  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);
  labels.push(time);

  // maintain fixed window
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

  // ================= RECORDING =================
  if (recording) {
    recordedData.push({
      time: (Date.now() - startTime) / 1000,
      rawEEG: raw,
      alpha: alpha,
      beta: beta,
      emg: emg,
      emotion: currentEmotion
    });
  }
}

// ================= EMOTION =================
function updateEmotion(alpha, beta, emg) {
  let state = "Calm";

  if (beta > alpha * 1.4) state = "Stressed";
  else if (beta > alpha) state = "Focused";

  document.getElementById("status").innerText = "State: " + state;
}

// ================= RECORDING CONTROLS =================
function startRecording() {
  recordedData = [];
  recording = true;
  startTime = Date.now();
  document.getElementById("status").innerText = "Recording...";
}

function stopRecording() {
  recording = false;
  downloadCSV();
  document.getElementById("status").innerText = "Saved CSV";
}

// ================= CSV EXPORT =================
function downloadCSV() {
  let csv = "time,rawEEG,alpha,beta,emg,emotion\n";

  recordedData.forEach(r => {
    csv += `${r.time},${r.rawEEG},${r.alpha},${r.beta},${r.emg},${r.emotion}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "neuro_data.csv";
  a.click();
}

// ================= THEME =================
function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");
}
