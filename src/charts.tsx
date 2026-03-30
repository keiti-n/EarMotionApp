import { Line } from "react-chartjs-2";

export default function Charts({ data }: any) {
  const labels = data.rawEEG.map((_: any, i: number) => i);

  const eegData = {
    labels,
    datasets: [
      { label: "Raw EEG", data: data.rawEEG },
      { label: "Alpha", data: data.alpha },
      { label: "Beta", data: data.beta },
    ],
  };

  const emgData = {
    labels,
    datasets: [
      { label: "EMG", data: data.emg },
    ],
  };

  return (
    <div>
      <h2>EEG</h2>
      <Line data={eegData} />
      <h2>EMG</h2>
      <Line data={emgData} />
    </div>
  );
}
