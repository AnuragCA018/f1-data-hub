import RaceClient from "./RaceClient";

export function generateStaticParams() {
  const years = ["2020", "2021", "2022", "2023", "2024"];
  const rounds = Array.from({ length: 24 }, (_, i) => String(i + 1));
  return years.flatMap((year) => rounds.map((race) => ({ year, race })));
}

export default function RacePage() {
  return <RaceClient />;
}
