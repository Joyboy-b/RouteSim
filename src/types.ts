export type TripState = "assigned" | "en_route" | "pickup" | "dropoff" | "complete";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface VehicleUpdate {
  id: string;
  driver: string;
  vehicle: string;
  state: TripState;
  position: LatLng;
  pickup: LatLng;
  dropoff: LatLng;
  route: LatLng[];
  routeProgress: number;
  speedMph: number;
  etaMinutes: number;
  delayMinutes: number;
  passenger: string;
  updatedAt: string;
}

export interface SimulationFrame {
  city: string;
  generatedAt: string;
  vehicles: VehicleUpdate[];
}
