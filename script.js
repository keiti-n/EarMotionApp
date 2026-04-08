// ================= STATE =================
let recording = false;
let demoMode = false;

let eegData = [];
let alphaData = [];
let betaData = [];
let emgData = [];
let labels = [];

let recordedData = [];

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

  // ===== EEG EMOTION =====
  let eegState =
    beta > alpha * 1.5 ? "Stressed" :
    beta > alpha ? "Excited" :
    "Calm";

  // ===== EMG STATE =====
  let emgState =
    emg > 60 ? "Tense" :
    emg > 30 ? "Active" :
    "Relaxed";

  document.getElementById("eegEmotion").innerText = eegState;
  document.getElementById("emgEmotion").innerText = emgState;

  // ===== UPDATE CHARTS (CRITICAL FIX) =====
  eegChart.data.labels = labels;

  eegChart.data.datasets[0].data = eegData;
  eegChart.data.datasets[1].data = alphaData;
  eegChart.data.datasets[2].data = betaData;

  eegChart.update();
  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  // ===== RECORDING =====
  if (recording) {
    recordedData.push({
      time,
      raw,
      alpha,
      beta,
      emg,
      eegEmotion: eegState,
      emgEmotion: emgState,
      label: groundTruth
    });
  }
}

// ================= DEMO MODE (FIXED) =================
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

// ================= RECORDING TOGGLE =================
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

// ================= CSV EXPORT (WITH LABELS) =================
function downloadCSV() {

  let csv = "time,raw,alpha,beta,emg,eegEmotion,emgEmotion,label\n";

  recordedData.forEach(r => {
    csv += `${r.time},${r.raw},${r.alpha},${r.beta},${r.emg},${r.eegEmotion},${r.emgEmotion},${r.label}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "neuro_data_labeled.csv";
  a.click();
}

// ================= LOCAL FILE LOAD =================
function loadLocalCSV(event) {

  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {

    const rows = e.target.result.split("\n").slice(1);

    rows.forEach(r => {
      const cols = r.split(",");

      const raw = Number(cols[1]);
      const alpha = Number(cols[2]);
      const beta = Number(cols[3]);
      const emg = Number(cols[4]);

      updateData(raw, alpha, beta, emg, cols[cols.length - 1]);
    });
  };

  reader.readAsText(file);
}

// ================= BLE (optional placeholder) =================
function connect() {
  document.getElementById("status").innerText = "BLE not reconnected in this build yet";
}

function disconnect() {
  document.getElementById("status").innerText = "Disconnected";
}

// ================= THEME =================
function toggleTheme() {
  document.body.classList.toggle("dark");
}
