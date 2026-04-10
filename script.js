// ================= STATE =================
let recording = false;
let demoMode = false;
let dark = false;

let eegData = [];
let emgData = [];
let alphaData = [];
let betaData = [];
let labels = [];

let recorded = [];

// ================= BLE =================
let bleCharacteristic;
let decoder = new TextDecoder();

// ================= BUFFERS =================
let buffer = [];
const bufferSize = 128;

// ================= CHARTS =================
let eegChart, emgChart, eegTrend, emgTrend;

window.onload = () => init();

// ================= INIT =================
function init() {
  eegChart = makeChart("eegChart", "EEG");
  emgChart = makeChart("emgChart", "EMG");

  eegTrend = makeChart("eegTrend", "EEG Trend");
  emgTrend = makeChart("emgTrend", "EMG Trend");
}

// ================= CHART =================
function makeChart(id, label) {
  return new Chart(document.getElementById(id), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      animation: false
    }
  });
}

// ================= BLE CONNECT =================
async function connect() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["12345678-1234-1234-1234-123456789abc"]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("12345678-1234-1234-1234-123456789abc");

    bleCharacteristic = await service.getCharacteristic("abcd1234-5678-1234-5678-abcdef123456");

    await bleCharacteristic.startNotifications();
    bleCharacteristic.addEventListener("characteristicvaluechanged", handleBLE);

    document.getElementById("status").innerText = "Connected";

  } catch (e) {
    document.getElementById("status").innerText = "Connection Failed";
    console.error(e);
  }
}

// ================= BLE DATA =================
function handleBLE(e) {
  const v = decoder.decode(e.target.value);
  const p = v.split(",");

  if (p.length < 3) return;

  const raw = Number(p[1]);
  const emg = Number(p[2]);

  buffer.push(raw);

  if (buffer.length >= bufferSize) {
    process(buffer, emg);
    buffer = [];
  }
}

// ================= SIGNAL PROCESS =================
function process(buf, emg) {

  const raw = buf[buf.length - 1];

  const alpha = raw * 0.4;
  const beta = raw * 0.6;

  const emotion = predict(alpha, beta, emg);

  update(raw, alpha, beta, emg, emotion);
}

// ================= SIMPLE MODEL =================
function predict(alpha, beta, emg) {
  const score = 0.02*alpha + 0.04*beta + 0.01*emg - 1;

  if (score > 1) return "Stressed";
  if (score > 0) return "Excited";
  return "Calm";
}

// ================= UPDATE UI =================
function update(raw, alpha, beta, emg, emotion) {

  const t = Date.now()/1000;

  eegData.push(raw);
  emgData.push(emg);
  alphaData.push(alpha);
  betaData.push(beta);
  labels.push(t);

  trim();

  eegChart.data.labels = labels;
  eegChart.data.datasets[0].data = eegData;
  eegChart.update();

  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  document.getElementById("eegEmotion").innerText = emotion;
  document.getElementById("emgEmotion").innerText =
    emg > 50 ? "Active" : "Relaxed";

  document.getElementById("overallEmotion").innerText = emotion;

  if (recording) recorded.push({t, raw, alpha, beta, emg, emotion});
}

// ================= TRIM =================
function trim() {
  if (labels.length > 150) {
    labels.shift();
    eegData.shift();
    emgData.shift();
    alphaData.shift();
    betaData.shift();
  }
}

// ================= RECORD =================
function toggleRecording() {
  recording = !recording;
}

// ================= DOWNLOAD =================
function downloadCSV() {
  let csv = "t,raw,alpha,beta,emg,emotion\n";

  recorded.forEach(r => {
    csv += `${r.t},${r.raw},${r.alpha},${r.beta},${r.emg},${r.emotion}\n`;
  });

  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  a.click();
}

// ================= FILE LOAD =================
function loadLocalCSV(e) {
  const f = e.target.files[0];
  const r = new FileReader();

  r.onload = ev => {
    const rows = ev.target.result.split("\n").slice(1);

    rows.forEach(row => {
      const c = row.split(",");
      update(
        Number(c[1]),
        Number(c[2]),
        Number(c[3]),
        Number(c[4]),
        c[5]
      );
    });
  };

  r.readAsText(f);
}

// ================= THEME =================
function toggleTheme() {
  dark = !dark;
  document.body.classList.toggle("dark");
}

// placeholder
function toggleDemo() {}
function setView() {}
