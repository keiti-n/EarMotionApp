import { useState } from "react";
import { connectBLE, EEGData } from "./bluetooth";
import Charts from "./charts";

export default function App() {
  const [connected, setConnected] = useState(false);

  const [data, setData] = useState({
    rawEEG: [] as number[],
    alpha: [] as number[],
    beta: [] as number[],
    emg: [] as number[],
  });

  function handleData(newData: EEGData) {
    setData(prev => ({
      rawEEG: [...prev.rawEEG.slice(-300), newData.rawEEG],
      alpha: [...prev.alpha.slice(-300), newData.alpha],
      beta: [...prev.beta.slice(-300), newData.beta],
      emg: [...prev.emg.slice(-300), newData.emg],
    }));
  }

  async function connect() {
    await connectBLE(handleData);
    setConnected(true);
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Brain & Muscle Monitor</h1>

      <button onClick={connect}>
        {connected ? "Connected" : "Connect"}
      </button>

      <Charts data={data} />
    </div>
  );
}
