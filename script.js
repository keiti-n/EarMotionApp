const DEVICE_NAME = "XIAO-C3-BLE";
const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

let eegData = [];
let alphaData = [];
let betaData = [];
let emgData = [];

const eegChart = new Chart(document.getElementById("eegChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Raw EEG", data: [] },
      { label: "Alpha", data: [] },
      { label: "Beta", data: [] },
    ]
  }
});

const emgChart = new Chart(document.getElementById("emgChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "EMG", data: [] },
    ]
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

  characteristic.addEventListener("characteristicvaluechanged", (event) => {
    const value = new TextDecoder().decode(event.target.value);
    const [rawEEG, alpha, beta, emg] = value.split(",");

    updateCharts(
      Number(rawEEG),
      Number(alpha),
      Number(beta),
      Number(emg)
    );
  });
}

function updateCharts(raw, alpha, beta, emg) {
  eegData.push(raw);
  alphaData.push(alpha);
  betaData.push(beta);
  emgData.push(emg);

  if (eegData.length > 100) {
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
}
