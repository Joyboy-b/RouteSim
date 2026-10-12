# RouteSim

RouteSim is a GPS-style vehicle simulation dashboard with a React and Leaflet dispatch map, WebSocket location updates, a Python streaming server, and a C++ routing/simulation engine.

## Run the dashboard

Install dependencies:

```bash
npm install
python -m pip install websockets
```

Start the WebSocket server:

```bash
npm run server
```

Start the frontend in a second terminal:

```bash
npm run dev
```

Open the Vite URL shown in the terminal. The frontend includes a browser simulation fallback, so the map still animates if the WebSocket server is not running.

## Build the C++ simulation engine

```bash
cmake -S engine -B build
cmake --build build --config Release
```

When `build/routesim_engine` or `build/routesim_engine.exe` exists, the Python server streams frames from the native engine. Otherwise it uses the same simulation model in Python.
