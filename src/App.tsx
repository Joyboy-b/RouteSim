import L from "leaflet";
import { Activity, Clock3, Gauge, RadioTower, Route, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSimulation } from "./useSimulation";
import type { VehicleUpdate } from "./types";

const mapCenter: L.LatLngExpression = [40.758, -73.9855];

const statusLabels = {
  assigned: "Assigned",
  pickup: "At pickup",
  en_route: "En route",
  dropoff: "Dropoff",
  complete: "Complete",
};

function vehicleIcon(vehicle: VehicleUpdate, selected: boolean) {
  const color = selected ? "#f97316" : vehicle.delayMinutes > 3 ? "#ef4444" : "#14b8a6";
  return L.divIcon({
    className: "vehicle-marker",
    html: `<div style="background:${color}"><span>${vehicle.id.slice(-1)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function App() {
  const { frame, connected, source } = useSimulation();
  const [selectedId, setSelectedId] = useState("RS-101");
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const selected = frame.vehicles.find((vehicle) => vehicle.id === selectedId) ?? frame.vehicles[0];

  const activeTrips = useMemo(
    () => frame.vehicles.filter((vehicle) => vehicle.state !== "complete").length,
    [frame.vehicles],
  );

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map("map", {
      center: mapCenter,
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    const layers = layersRef.current;
    if (!layers) return;
    layers.clearLayers();

    frame.vehicles.forEach((vehicle) => {
      const isSelected = vehicle.id === selected.id;
      L.polyline(
        vehicle.route.map((point) => [point.lat, point.lng]),
        {
          color: isSelected ? "#f97316" : "#64748b",
          weight: isSelected ? 5 : 2,
          opacity: isSelected ? 0.9 : 0.35,
        },
      ).addTo(layers);

      L.circleMarker([vehicle.pickup.lat, vehicle.pickup.lng], {
        radius: 5,
        color: "#0f766e",
        fillColor: "#ccfbf1",
        fillOpacity: 1,
        weight: 2,
      }).addTo(layers);

      L.circleMarker([vehicle.dropoff.lat, vehicle.dropoff.lng], {
        radius: 5,
        color: "#be123c",
        fillColor: "#ffe4e6",
        fillOpacity: 1,
        weight: 2,
      }).addTo(layers);

      L.marker([vehicle.position.lat, vehicle.position.lng], {
        icon: vehicleIcon(vehicle, isSelected),
      })
        .on("click", () => setSelectedId(vehicle.id))
        .addTo(layers);
    });
  }, [frame.vehicles, selected.id]);

  return (
    <main className="app-shell">
      <section className="map-panel">
        <div id="map" aria-label="Live RouteSim dispatch map" />
        <div className="topbar">
          <div>
            <p>RouteSim</p>
            <h1>Live vehicle simulation</h1>
          </div>
          <div className={`connection ${connected ? "online" : "local"}`}>
            <RadioTower size={18} />
            <span>{source === "websocket" ? "WebSocket stream" : "Browser simulation"}</span>
          </div>
        </div>
        <div className="metrics">
          <Metric icon={<Activity size={18} />} label="Active trips" value={activeTrips.toString()} />
          <Metric icon={<Gauge size={18} />} label="Avg speed" value={`${averageSpeed(frame.vehicles)} mph`} />
          <Metric icon={<Clock3 size={18} />} label="Avg ETA" value={`${averageEta(frame.vehicles)} min`} />
        </div>
      </section>

      <aside className="dispatch-panel">
        <div className="panel-heading">
          <div>
            <p>{frame.city} dispatch</p>
            <h2>Trips</h2>
          </div>
          <span>{formatTime(frame.generatedAt)}</span>
        </div>

        <div className="trip-list">
          {frame.vehicles.map((vehicle) => (
            <button
              className={`trip-row ${vehicle.id === selected.id ? "selected" : ""}`}
              key={vehicle.id}
              onClick={() => setSelectedId(vehicle.id)}
            >
              <span className="trip-code">{vehicle.id}</span>
              <span>
                <strong>{vehicle.driver}</strong>
                <small>{statusLabels[vehicle.state]}</small>
              </span>
              <em>{vehicle.etaMinutes}m</em>
            </button>
          ))}
        </div>

        <div className="detail-panel">
          <div className="driver-card">
            <div className="avatar">
              <UserRound size={22} />
            </div>
            <div>
              <h3>{selected.driver}</h3>
              <p>
                {selected.vehicle} · Passenger {selected.passenger}
              </p>
            </div>
          </div>

          <div className="progress-block">
            <div>
              <Route size={18} />
              <span>{statusLabels[selected.state]}</span>
            </div>
            <strong>{Math.round(selected.routeProgress * 100)}%</strong>
          </div>
          <div className="progress-bar">
            <span style={{ width: `${Math.round(selected.routeProgress * 100)}%` }} />
          </div>

          <div className="timeline">
            <TimelineStep label="Assigned" active={selected.routeProgress >= 0} />
            <TimelineStep label="Pickup" active={selected.routeProgress >= 0.38} />
            <TimelineStep label="En route" active={selected.routeProgress >= 0.48} />
            <TimelineStep label="Dropoff" active={selected.routeProgress >= 0.92} />
          </div>

          <div className="stats-grid">
            <Stat label="Speed" value={`${selected.speedMph} mph`} />
            <Stat label="ETA" value={`${selected.etaMinutes} min`} />
            <Stat label="Delay" value={`${selected.delayMinutes} min`} />
            <Stat label="Update" value={formatTime(selected.updatedAt)} />
          </div>
        </div>
      </aside>
    </main>
  );
}

function Metric(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {props.icon}
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function TimelineStep(props: { label: string; active: boolean }) {
  return (
    <div className={`timeline-step ${props.active ? "active" : ""}`}>
      <span />
      <p>{props.label}</p>
    </div>
  );
}

function averageSpeed(vehicles: VehicleUpdate[]) {
  return Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.speedMph, 0) / vehicles.length);
}

function averageEta(vehicles: VehicleUpdate[]) {
  return Math.round(vehicles.reduce((sum, vehicle) => sum + vehicle.etaMinutes, 0) / vehicles.length);
}
