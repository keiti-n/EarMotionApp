// ================= STATE =================
let eegData = [];
let emgData = [];
let labels = [];
let recording = false;
let dark = false;
let recorded = [];

// ================= CHARTS =================
let eegChart, emgChart;

window.onload = () => {
  eegChart = makeChart("eegChart", "EEG");
  emgChart = makeChart("emgChart", "EMG");
};

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
    options: { animation: false }
  });
}

// ================= BLE =================
async function connect() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("12345678-1234-1234-1234-123456789abc");

    const ch = await service.getCharacteristic("abcd1234-5678-1234-5678-abcdef123456");

    await ch.startNotifications();
    ch.addEventListener("characteristicvaluechanged", handleBLE);

    document.getElementById("status").innerText = "Connected";

  } catch (e) {
    document.getElementById("status").innerText = "Failed";
  }
}

// ================= DATA =================
function handleBLE(e) {
  const v = new TextDecoder().decode(e.target.value);
  const p = v.split(",");

  if (p.length < 3) return;

  const eeg = Number(p[1]);
  const emg = Number(p[2]);

  update(eeg, emg);
}

// ================= UPDATE =================
function update(eeg, emg) {

  const t = Date.now() / 1000;

  eegData.push(eeg);
  emgData.push(emg);
  labels.push(t);

  if (labels.length > 200) {
    eegData.shift();
    emgData.shift();
    labels.shift();
  }

  eegChart.data.labels = labels;
  eegChart.data.datasets[0].data = eegData;
  eegChart.update();

  emgChart.data.labels = labels;
  emgChart.data.datasets[0].data = emgData;
  emgChart.update();

  const emotion =
    eeg > 70 ? "Stressed" :
    eeg > 40 ? "Excited" : "Calm";

  document.getElementById("eegEmotion").innerText = emotion;
  document.getElementById("emgEmotion").innerText = emg > 50 ? "Active" : "Relaxed";
  document.getElementById("overallEmotion").innerText = emotion;

  if (recording) {
    recorded.push({ t, eeg, emg, emotion });
  }
}

// ================= RECORD =================
function toggleRecording() {
  recording = !recording;
}

// ================= DOWNLOAD =================
function downloadCSV() {
  let csv = "t,eeg,emg,emotion\n";
  recorded.forEach(r => {
    csv += `${r.t},${r.eeg},${r.emg},${r.emotion}\n`;
  });

  const blob = new Blob([csv]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "data.csv";
  a.click();
}

// ================= FILE LOAD =================
function loadLocalCSV(e) {
  const r = new FileReader();

  r.onload = ev => {
    const rows = ev.target.result.split("\n").slice(1);

    rows.forEach(row => {
      const c = row.split(",");
      update(Number(c[1]), Number(c[2]));
    });
  };

  r.readAsText(e.target.files[0]);
}

// ================= THEME =================
function toggleTheme() {
  dark = !dark;
  document.body.classList.toggle("dark");
}

// placeholders
function toggleDemo() {}
function setEEGView() {}
function setEMGView() {}
