import { TIRES } from "./data.js";

// Derive choices from the current circuit scope and clear incompatible old selections.
export function leaderboardSetup(tracks, previous) {
  const filters = { ...previous };
  if (filters.creator && !tracks.some((t) => t.creator === filters.creator))
    filters.creator = "";
  const availableTracks = tracks.filter(
    (t) => !filters.creator || t.creator === filters.creator,
  );
  const selected = availableTracks.find((t) => t.id === filters.track);
  if (!selected) filters.track = "";
  const scope = selected ? [selected] : availableTracks;
  const weather = ["Dry", "Light Rain", "Heavy Rain"].filter((w) =>
    scope.some((t) => t.weather.includes(w)),
  );
  const cars = ["Prevalents", "Whiplashes", "Customs"].filter((c) =>
    scope.some((t) => t.cars.includes(c)),
  );
  const tires = [
    ...(scope.some((t) => !t.hasTires) ? ["none"] : []),
    ...TIRES.filter((tire) =>
      scope.some((t) => t.hasTires && t.tires.includes(tire)),
    ),
  ];
  const validChoice = (value, choices) =>
    choices.length === 1 ? choices[0] : choices.includes(value) ? value : "";
  filters.weather = validChoice(filters.weather, weather);
  filters.car = validChoice(filters.car, cars);
  filters.tire = validChoice(filters.tire, tires);
  if (filters.car !== "Customs") filters.custom = "";
  return {
    filters,
    tracks: availableTracks,
    selected,
    weather,
    cars,
    tires,
    showWeather: weather.length > 1,
    showCars: cars.length > 1,
    showTires: scope.some((t) => t.hasTires) && tires.length > 1,
  };
}
