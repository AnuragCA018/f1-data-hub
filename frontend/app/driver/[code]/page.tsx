import DriverClient from "./DriverClient";

export function generateStaticParams() {
  return [
    "VER","NOR","LEC","HAM","RUS","PIA","SAI","ALO","STR","ANT",
    "TSU","LAW","GAS","OCO","HUL","MAG","BEA","BOR","DOO","HAD",
  ].map((code) => ({ code }));
}

export default function DriverPage() {
  return <DriverClient />;
}
