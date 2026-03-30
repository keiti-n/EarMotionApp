export const DEVICE_NAME = "XIAO-C3-BLE";
export const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
export const CHARACTERISTIC_UUID = "12345678-1234-5678-1234-56789abcdef1";

export type EEGData = {
  rawEEG: number;
  alpha: number;
  beta: number;
  emg: number;
};

export async function connectBLE(onData: (data: EEGData) => void) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ name: DEVICE_NAME }],
    optionalServices: [SERVICE_UUID],
  });

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

  await characteristic.startNotifications();

  characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
    const value = new TextDecoder().decode(event.target.value);
    const [rawEEG, alpha, beta, emg] = value.split(",");

    onData({
      rawEEG: Number(rawEEG),
      alpha: Number(alpha),
      beta: Number(beta),
      emg: Number(emg),
    });
  });
}
