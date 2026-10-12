import type { SimulationFrame, TripState, VehicleUpdate } from "./types";

const names = ["Ava Chen", "Marco Reed", "Samira Holt", "Diego Cruz", "Nina Patel", "Theo Banks"];
const passengers = ["L. Morgan", "J. Avery", "M. Stone", "R. Hayes", "K. Brooks", "T. Fisher"];
const center = { lat: 40.758, lng: -73.9855 };

const routes = [
  [
    { lat: 40.7484, lng: -73.9857 },
    { lat: 40.7527, lng: -73.9772 },
    { lat: 40.758, lng: -73.973 },
    { lat: 40.7648, lng: -73.9808 },
  ],
  [
    { lat: 40.7359, lng: -74.0036 },
    { lat: 40.742, lng: -73.9969 },
    { lat: 40.7492, lng: -73.9875 },
    { lat: 40.7557, lng: -73.9787 },
  ],
  [
    { lat: 40.7708, lng: -73.9822 },
    { lat: 40.7667, lng: -73.9734 },
    { lat: 40.759, lng: -73.969 },
    { lat: 40.7505, lng: -73.9934 },
  ],
  [
    { lat: 40.7295, lng: -73.9965 },
    { lat: 40.7364, lng: -73.9904 },
    { lat: 40.744, lng: -73.982 },
    { lat: 40.7519, lng: -73.9771 },
  ],
  [
    { lat: 40.7829, lng: -73.9654 },
    { lat: 40.7751, lng: -73.9706 },
    { lat: 40.7673, lng: -73.9819 },
    { lat: 40.7591, lng: -73.9845 },
  ],
  [
    { lat: 40.7061, lng: -74.0086 },
    { lat: 40.715, lng: -74.003 },
    { lat: 40.724, lng: -73.994 },
    { lat: 40.7339, lng: -73.9908 },
  ],
];

function interpolate(route: { lat: number; lng: number }[], progress: number) {
  const scaled = progress * (route.length - 1);
  const startIndex = Math.min(Math.floor(scaled), route.length - 2);
  const local = scaled - startIndex;
  const start = route[startIndex];
  const end = route[startIndex + 1];
  return {
    lat: start.lat + (end.lat - start.lat) * local,
    lng: start.lng + (end.lng - start.lng) * local,
  };
}

function tripPhase(tick: number, index: number) {
  const tripDuration = 180 + index * 28;
  const elapsed = Math.max(0, tick + index * 22);
  const progress = Math.min(elapsed / tripDuration, 1);
  const assignedEndsAt = Math.round(tripDuration * 0.38);
  const pickupEndsAt = Math.round(tripDuration * 0.48);
  const enRouteEndsAt = Math.round(tripDuration * 0.92);
  const state: TripState =
    elapsed >= tripDuration
      ? "complete"
      : elapsed >= enRouteEndsAt
        ? "dropoff"
        : elapsed >= pickupEndsAt
          ? "en_route"
          : elapsed >= assignedEndsAt
            ? "pickup"
            : "assigned";
  const etaSeconds =
    state === "complete"
      ? 0
      : state === "assigned"
        ? assignedEndsAt - elapsed
        : state === "pickup"
          ? pickupEndsAt - elapsed
          : state === "en_route"
            ? enRouteEndsAt - elapsed
            : tripDuration - elapsed;

  return { progress, state, etaSeconds: Math.max(0, etaSeconds) };
}

export function createFallbackFrame(tick: number): SimulationFrame {
  const vehicles: VehicleUpdate[] = routes.map((route, index) => {
    const { progress, state, etaSeconds } = tripPhase(tick, index);
    const delay = Math.max(0, Math.round(Math.sin(tick / 16 + index) * 3 + index * 0.35));
    return {
      id: `RS-${101 + index}`,
      driver: names[index],
      passenger: passengers[index],
      vehicle: ["Tesla Model 3", "Toyota Camry", "Hyundai Ioniq", "Ford Escape", "Kia Niro", "Honda Accord"][index],
      state,
      position: interpolate(route, progress),
      pickup: route[0],
      dropoff: route[route.length - 1],
      route,
      routeProgress: progress,
      speedMph: Math.round(18 + Math.sin(tick / 8 + index) * 7 + index * 2),
      etaMinutes: etaSeconds + (state === "complete" ? 0 : delay),
      delayMinutes: delay,
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    city: "Manhattan",
    generatedAt: new Date().toISOString(),
    vehicles,
  };
}

export const fallbackCenter = center;
