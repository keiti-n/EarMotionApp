const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

let connected = false;
let demoMode = false;
let darkMode = false;

let eegData = [], alphaData = [], betaData = [], emgData = [];

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
  document.getElementById("status").innerText = "Connected";

  characteristic.addEventListener("characteristicvaluechanged", (event) => {
    const value = new TextDecoder().decode(event.target.value);
    const [rawEEG, alpha, beta, emg] = value.split(",");

    updateData(Number(rawEEG), Number(alpha), Number(beta), Number(emg));
  });
}

function disconnect() {
  connected = false;
  demoMode = false;
  document.getElementById("status").innerText = "Disconnected";
}

function toggleDemo() {
  if (!connected) {
    document.getElementById("status").innerText = "Connect First";
    return;
  }

  demoMode = !demoMode;

  if (demoMode) runDemo();
}

function toggleTheme() {
  darkMode = !darkMode;
  document.body.classList.toggle("dark");
}

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

function updateEmotion(alpha, beta, emg) {
  let state = "Calm";

  if (beta > alpha * 1.5) state = "Stressed";
  else if (alpha > beta) state = "Relaxed";

  document.getElementById("status").innerText = "Overall: " + state;
  document.getElementById("eegEmotion").innerText = "EEG: " + state;
  document.getElementById("emgEmotion").innerText =
    emg > 50 ? "EMG: Active" : "EMG: Relaxed";
}

function runDemo() {
  if (!demoMode) return;

  const raw = Math.random() * 100;
  const alpha = Math.random() * 50;
  const beta = Math.random() * 50;
  const emg = Math.random() * 80;

  updateData(raw, alpha, beta, emg);

  setTimeout(runDemo, 100);
}
