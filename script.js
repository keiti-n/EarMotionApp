const DEVICE_NAME = "XIAO-C3-BLE";

// ================= STATE =================
let demoMode = false;
let darkMode = false;

let sampleRate = 10;
let windowSeconds = 10;
let maxPoints = sampleRate * windowSeconds;

// ================= DATA =================
let eegData = [];
let alphaData = [];
let betaData = [];
let emgData = [];
let labels = [];

let currentEmotion = "Calm";

// ================= ML =================
let svmModel = null;

// ================= CHARTS =================
const eegChart = new Chart(document.getElementById("eegChart"), {
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

const emgChart = new Chart(document.getElementById("emgChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "EMG", data: [], borderWidth: 2, pointRadius: 0 }
    ]
  },
  options: { animation: false }
});

// ================= DATA UPDATE =================
function updateData(raw, alpha, beta, emg) {

  const time = Date.now() / 1000;

  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);
  labels.push(time);

  if (labels.length > maxPoints) {
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

  runMLPipeline();

  document.getElementById("emgEmotion").innerText = "EMG updated";
}

// ================= FEATURE EXTRACTION =================
function extractFeatures() {
  function mean(arr) {
    return arr.reduce((a,b)=>a+b,0)/arr.length;
  }

  return {
    eegMean: mean(eegData),
    alphaMean: mean(alphaData),
    betaMean: mean(betaData),
    emgMean: mean(emgData),
    betaAlphaRatio: mean(betaData) / (mean(alphaData) + 1e-6)
  };
}

// ================= SVM (simple placeholder model) =================
function svmPredict(f) {
  if (f.betaAlphaRatio > 1.8) return "Stressed";
  if (f.betaAlphaRatio > 1.2) return "Excited";
  if (f.alphaMean > f.betaMean) return "Calm";
  return "Sad";
}

// ================= AZURE ML =================
async function azurePredict(features) {
  try {
    const res = await fetch("https://YOUR-AZURE-ENDPOINT/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features)
    });

    const data = await res.json();
    return data.prediction || "Unknown";

  } catch (e) {
    return "Azure error";
  }
}

// ================= PIPELINE =================
async function runMLPipeline() {

  const f = extractFeatures();

  const svmResult = svmPredict(f);
  document.getElementById("svmOut").innerText = svmResult;

  const azureResult = await azurePredict(f);
  document.getElementById("azureOut").innerText = azureResult;

  document.getElementById("eegEmotion").innerText =
    `SVM: ${svmResult} | Azure: ${azureResult}`;
}

// ================= AZURE CSV LOADER =================
async function loadAzureCSV() {

  const url = document.getElementById("azureUrl").value;

  const res = await fetch(url);
  const text = await res.text();

  const rows = text.split("\n").slice(1);

  rows.forEach(r => {
    const cols = r.split(",");

    const time = parseFloat(cols[0]);
    const raw = parseFloat(cols[1]);
    const alpha = parseFloat(cols[2]);
    const beta = parseFloat(cols[3]);
    const emg = parseFloat(cols[4]);

    updateData(raw, alpha, beta, emg);
  });

  alert("Azure CSV loaded");
}

// ================= DEMO =================
function randn() {
  return (Math.random() - 0.5) * 2;
}

function toggleDemo() {
  demoMode = !demoMode;
  if (demoMode) runDemo();
}

function runDemo() {

  if (!demoMode) return;

  const alpha = 30 + randn()*5;
  const beta  = 40 + randn()*10;
  const emg   = 20 + Math.abs(randn()*8);

  const raw = alpha + beta + randn()*5;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 1000 / sampleRate);
}

// ================= BASIC CONTROLS =================
function connect() {
  document.getElementById("status").innerText = "Connected";
}

function disconnect() {
  document.getElementById("status").innerText = "Disconnected";
}

function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");
}
