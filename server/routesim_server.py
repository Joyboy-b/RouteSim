import asyncio
import json
import math
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

try:
    import websockets
except ImportError as exc:
    raise SystemExit("Install the Python dependency with: python -m pip install websockets") from exc


ROOT = Path(__file__).resolve().parents[1]
ENGINE_CANDIDATES = [
    ROOT / "build" / "routesim_engine.exe",
    ROOT / "build" / "routesim_engine",
    ROOT / "build" / "Release" / "routesim_engine.exe",
    ROOT / "build" / "Debug" / "routesim_engine.exe",
]


ROUTES = [
    [(40.7484, -73.9857), (40.7527, -73.9772), (40.758, -73.973), (40.7648, -73.9808)],
    [(40.7359, -74.0036), (40.742, -73.9969), (40.7492, -73.9875), (40.7557, -73.9787)],
    [(40.7708, -73.9822), (40.7667, -73.9734), (40.759, -73.969), (40.7505, -73.9934)],
    [(40.7295, -73.9965), (40.7364, -73.9904), (40.744, -73.982), (40.7519, -73.9771)],
    [(40.7829, -73.9654), (40.7751, -73.9706), (40.7673, -73.9819), (40.7591, -73.9845)],
    [(40.7061, -74.0086), (40.715, -74.003), (40.724, -73.994), (40.7339, -73.9908)],
]
DRIVERS = ["Ava Chen", "Marco Reed", "Samira Holt", "Diego Cruz", "Nina Patel", "Theo Banks"]
PASSENGERS = ["L. Morgan", "J. Avery", "M. Stone", "R. Hayes", "K. Brooks", "T. Fisher"]
VEHICLES = ["Tesla Model 3", "Toyota Camry", "Hyundai Ioniq", "Ford Escape", "Kia Niro", "Honda Accord"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def interpolate(route, progress):
    scaled = progress * (len(route) - 1)
    start_index = min(math.floor(scaled), len(route) - 2)
    local = scaled - start_index
    start = route[start_index]
    end = route[start_index + 1]
    return {
        "lat": start[0] + (end[0] - start[0]) * local,
        "lng": start[1] + (end[1] - start[1]) * local,
    }


def trip_phase(tick: int, index: int):
    trip_duration = 180 + index * 28
    elapsed = max(0, tick + index * 22)
    progress = min(elapsed / trip_duration, 1)
    if progress >= 1:
        state = "complete"
    elif progress >= 0.92:
        state = "dropoff"
    elif progress >= 0.48:
        state = "en_route"
    elif progress >= 0.38:
        state = "pickup"
    else:
        state = "assigned"
    return progress, state


def python_frame(tick: int):
    vehicles = []
    for index, route in enumerate(ROUTES):
        progress, state = trip_phase(tick, index)
        delay = max(0, round(math.sin(tick / 16 + index) * 3 + index * 0.35))
        points = [{"lat": lat, "lng": lng} for lat, lng in route]
        vehicles.append(
            {
                "id": f"RS-{101 + index}",
                "driver": DRIVERS[index],
                "passenger": PASSENGERS[index],
                "vehicle": VEHICLES[index],
                "state": state,
                "position": interpolate(route, progress),
                "pickup": points[0],
                "dropoff": points[-1],
                "route": points,
                "routeProgress": progress,
                "speedMph": round(18 + math.sin(tick / 8 + index) * 7 + index * 2),
                "etaMinutes": 0 if state == "complete" else max(1, round((1 - progress) * 28 + delay)),
                "delayMinutes": delay,
                "updatedAt": now_iso(),
            }
        )
    return {"city": "Manhattan", "generatedAt": now_iso(), "vehicles": vehicles}


def engine_path():
    for candidate in ENGINE_CANDIDATES:
        if candidate.exists():
            return candidate
    return None


async def stream_from_cpp(websocket, executable: Path):
    process = await asyncio.create_subprocess_exec(
        str(executable),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    try:
        assert process.stdout is not None
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            try:
                await websocket.send(line.decode("utf-8").strip())
            except websockets.ConnectionClosed:
                break
    finally:
        process.terminate()
        await process.wait()


async def stream_from_python(websocket):
    tick = 0
    while True:
        await websocket.send(json.dumps(python_frame(tick), separators=(",", ":")))
        tick += 1
        await asyncio.sleep(1)


async def handler(websocket):
    executable = engine_path()
    if executable and (executable.is_file() or shutil.which(str(executable))):
        await stream_from_cpp(websocket, executable)
    else:
        await stream_from_python(websocket)


async def main():
    print("RouteSim WebSocket server running at ws://127.0.0.1:8765")
    async with websockets.serve(handler, "127.0.0.1", 8765):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
