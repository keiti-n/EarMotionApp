// ================= STATE =================
let recording = false;
let demoMode = false;

let eegData = [];
let alphaData = [];
let betaData = [];
let emgData = [];
let labels = [];

let recordedData = [];

// ================= BLE =================
let bleDevice;
let bleCharacteristic;
let decoder = new TextDecoder();

// ================= BUFFERS =================
let eegBuffer = [];
let bufferSize = 128;

// ================= CHARTS =================
let eegChart, emgChart;

window.onload = () => {
  initCharts();
};

// ================= INIT CHARTS =================
function initCharts() {

  eegChart = new Chart(document.getElementById("eegChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "EEG", data: [], borderWidth: 2, pointRadius: 0 },
        { label: "Alpha", data: [], borderWidth: 2, pointRadius: 0 },
        { label: "Beta", data: [], borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: { animation: false }
  });

  emgChart = new Chart(document.getElementById("emgChart"), {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "EMG", data: [], borderWidth: 2, pointRadius: 0 }
      ]
    },
    options: { animation: false }
  });
}

// ================= BLE CONNECT =================
async function connect() {
  try {
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: "EEG_EMG_Monitor" }],
      optionalServices: ["12345678-1234-1234-1234-123456789abc"]
    });

    const server = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService("12345678-1234-1234-1234-123456789abc");

    bleCharacteristic = await service.getCharacteristic("abcd1234-5678-1234-5678-abcdef123456");

    await bleCharacteristic.startNotifications();
    bleCharacteristic.addEventListener("characteristicvaluechanged", handleBLE);

    document.getElementById("status").innerText = "Connected ✔️";

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "Connection failed";
  }
}

// ================= HANDLE BLE =================
function handleBLE(event) {
  const value = decoder.decode(event.target.value);
  const parts = value.trim().split(",");

  const raw = Number(parts[1]);
  const emg = Number(parts[2]);

  eegBuffer.push(raw);

  if (eegBuffer.length >= bufferSize) {
    processEEG(eegBuffer, emg);
    eegBuffer = [];
  }
}

// ================= FFT =================
function fft(signal) {
  const N = signal.length;
  let real = signal.slice();
  let imag = new Array(N).fill(0);

  for (let k = 0; k < N; k++) {
    let sumReal = 0;
    let sumImag = 0;

    for (let n = 0; n < N; n++) {
      let angle = (2 * Math.PI * k * n) / N;
      sumReal += signal[n] * Math.cos(angle);
      sumImag -= signal[n] * Math.sin(angle);
    }

    real[k] = sumReal;
    imag[k] = sumImag;
  }

  return real.map((r, i) => Math.sqrt(r*r + imag[i]*imag[i]));
}

// ================= BAND POWER =================
function bandPower(fftData, fs, low, high) {
  const N = fftData.length;
  const freqRes = fs / N;

  let sum = 0;
  let count = 0;

  for (let i = 0; i < N; i++) {
    const freq = i * freqRes;
    if (freq >= low && freq <= high) {
      sum += fftData[i];
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

// ================= SMOOTHING =================
let alphaHist = [];
let betaHist = [];

function smooth(value, history, size = 5) {
  history.push(value);
  if (history.length > size) history.shift();

  return history.reduce((a, b) => a + b, 0) / history.length;
}

// ================= PROCESS EEG =================
function processEEG(buffer, emg) {
  const fs = 100;

  const spectrum = fft(buffer);

  let alpha = bandPower(spectrum, fs, 8, 13);
  let beta  = bandPower(spectrum, fs, 13, 30);

  alpha = smooth(alpha, alphaHist);
  beta  = smooth(beta, betaHist);

  const raw = buffer[buffer.length - 1];

  updateData(raw, alpha, beta, emg);
}

// ================= SVM CLASSIFIER =================
const weights = [0.02, 0.04, 0.01];
const bias = -1;

function predict(alpha, beta, emg) {
  const score =
    weights[0]*alpha +
    weights[1]*beta +
    weights[2]*emg +
    bias;

  if (score > 1) return "Stressed";
  if (score > 0) return "Excited";
  return "Calm";
}

// ================= UPDATE DATA =================
function updateData(raw, alpha, beta, emg, groundTruth = "") {

  const time = Date.now() / 1000;

  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);
  labels.push(time);

  if (labels.length > 120) {
    eegData.shift();
    alphaData.shift();
    betaData.shift();
    emgData.shift();
    labels.shift();
  }

  const eegState = predict(alpha, beta, emg);

  let emgState =
    emg > 60 ? "Tense" :
    emg > 30 ? "Active" :
    "Relaxed";

  document.getElementById("eegEmotion").innerText = eegState;
  document.getElementById("emgEmotion").innerText = emgState;

  eegChart.data.labels = labels;
  eegChart.data.datasets[0].data = eegData;
  eegChart.data.datasets[1].data = alphaData;
  eegChart.data.datasets[2].data = betaData;
  eegChart.update();

  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  if (recording) {
    recordedData.push({
      time, raw, alpha, beta, emg,
      eegEmotion: eegState,
      emgEmotion: emgState,
      label: groundTruth
    });
  }
}

// ================= DEMO MODE =================
function toggleDemo() {
  demoMode = !demoMode;
  if (demoMode) demoLoop();
}

function demoLoop() {
  if (!demoMode) return;

  const alpha = 30 + Math.random() * 10;
  const beta = 40 + Math.random() * 15;
  const emg = 20 + Math.random() * 60;
  const raw = alpha + beta + Math.random() * 5;

  updateData(raw, alpha, beta, emg);

  setTimeout(demoLoop, 100);
}

// ================= RECORDING =================
function toggleRecording() {

  const btn = document.getElementById("recordBtn");

  if (!recording) {
    recordedData = [];
    recording = true;
    btn.innerText = "Stop & Download CSV";
    return;
  }

  recording = false;
  btn.innerText = "Start Recording";
  downloadCSV();
}

// ================= CSV EXPORT =================
function downloadCSV() {

  let csv = "time,raw,alpha,beta,emg,eegEmotion,emgEmotion,label\n";

  recordedData.forEach(r => {
    csv += `${r.time},${r.raw},${r.alpha},${r.beta},${r.emg},${r.eegEmotion},${r.emgEmotion},${r.label}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "neuro_data.csv";
  a.click();
}

// ================= LOAD CSV =================
function loadLocalCSV(event) {

  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {

    const rows = e.target.result.split("\n").slice(1);

    rows.forEach(r => {
      const cols = r.split(",");

      updateData(
        Number(cols[1]),
        Number(cols[2]),
        Number(cols[3]),
        Number(cols[4]),
        cols[cols.length - 1]
      );
    });
  };

  reader.readAsText(file);
}
