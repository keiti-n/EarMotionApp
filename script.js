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

// ================= CHART SETUP =================
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
    if (!navigator.bluetooth) {
      alert("Use Chrome for Bluetooth");
      return;
    }

    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    });

    const server = await device.gatt.connect();

    const service = await server.getPrimaryService(
      "12345678-1234-1234-1234-123456789abc"
    );

    bleCharacteristic = await service.getCharacteristic(
      "abcd1234-5678-1234-5678-abcdef123456"
    );

    await bleCharacteristic.startNotifications();

    bleCharacteristic.addEventListener(
      "characteristicvaluechanged",
      handleBLE
    );

    document.getElementById("status").innerText = "Connected ✔️";

  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "Connection failed ❌";
  }
}

// ================= BLE DATA =================
function handleBLE(event) {
  const value = decoder.decode(event.target.value);
  const parts = value.trim().split(",");

  if (parts.length < 3) return;

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
  let out = [];

  for (let k = 0; k < N; k++) {
    let re = 0, im = 0;

    for (let n = 0; n < N; n++) {
      let angle = (2 * Math.PI * k * n) / N;
      re += signal[n] * Math.cos(angle);
      im -= signal[n] * Math.sin(angle);
    }

    out.push(Math.sqrt(re * re + im * im));
  }

  return out;
}

// ================= BAND POWER =================
function bandPower(fftData, fs, low, high) {
  const N = fftData.length;
  const freqRes = fs / N;

  let sum = 0, count = 0;

  for (let i = 0; i < N; i++) {
    let f = i * freqRes;
    if (f >= low && f <= high) {
      sum += fftData[i];
      count++;
    }
  }

  return count ? sum / count : 0;
}

// ================= SMOOTH =================
let alphaHist = [];
let betaHist = [];

function smooth(val, hist, size = 5) {
  hist.push(val);
  if (hist.length > size) hist.shift();
  return hist.reduce((a, b) => a + b, 0) / hist.length;
}

// ================= PROCESS =================
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

// ================= SIMPLE ML =================
function predict(alpha, beta, emg) {
  const score = 0.02*alpha + 0.04*beta + 0.01*emg - 1;

  if (score > 1) return "Stressed";
  if (score > 0) return "Excited";
  return "Calm";
}

// ================= UPDATE =================
function updateData(raw, alpha, beta, emg) {

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

  document.getElementById("eegEmotion").innerText = predict(alpha, beta, emg);

  document.getElementById("emgEmotion").innerText =
    emg > 60 ? "Tense" :
    emg > 30 ? "Active" :
    "Relaxed";

  eegChart.data.labels = labels;
  eegChart.data.datasets[0].data = eegData;
  eegChart.data.datasets[1].data = alphaData;
  eegChart.data.datasets[2].data = betaData;
  eegChart.update();

  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();
}

// ================= DEMO =================
function toggleDemo() {
  demoMode = !demoMode;
  if (demoMode) demoLoop();
}

function demoLoop() {
  if (!demoMode) return;

  const alpha = 30 + Math.random()*10;
  const beta = 40 + Math.random()*15;
  const emg = 20 + Math.random()*60;
  const raw = alpha + beta;

  updateData(raw, alpha, beta, emg);

  setTimeout(demoLoop, 100);
}

// ================= RECORD =================
function toggleRecording() {
  recording = !recording;
  document.getElementById("recordBtn").innerText =
    recording ? "Stop" : "Record";
}
