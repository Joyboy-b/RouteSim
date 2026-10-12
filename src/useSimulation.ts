import { useEffect, useMemo, useState } from "react";
import { createFallbackFrame } from "./simulationFallback";
import type { SimulationFrame } from "./types";

export function useSimulation() {
  const [frame, setFrame] = useState<SimulationFrame>(() => createFallbackFrame(0));
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<"websocket" | "browser-sim">("browser-sim");

  useEffect(() => {
    let tick = 0;
    let fallbackTimer = window.setInterval(() => {
      tick += 1;
      setFrame(createFallbackFrame(tick));
    }, 1000);

    const socket = new WebSocket("ws://127.0.0.1:8765");

    socket.addEventListener("open", () => {
      setConnected(true);
      setSource("websocket");
      window.clearInterval(fallbackTimer);
    });

    socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(event.data) as SimulationFrame;
      setFrame(parsed);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
      setSource("browser-sim");
      fallbackTimer = window.setInterval(() => {
        tick += 1;
        setFrame(createFallbackFrame(tick));
      }, 1000);
    });

    socket.addEventListener("error", () => {
      socket.close();
    });

    return () => {
      window.clearInterval(fallbackTimer);
      socket.close();
    };
  }, []);

  return useMemo(() => ({ frame, connected, source }), [frame, connected, source]);
}
