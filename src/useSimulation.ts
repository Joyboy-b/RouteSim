import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFallbackFrame } from "./simulationFallback";
import type { SimulationFrame } from "./types";

export function useSimulation() {
  const [frame, setFrame] = useState<SimulationFrame>(() => createFallbackFrame(0));
  const [connected, setConnected] = useState(false);
  const [source, setSource] = useState<"websocket" | "browser-sim">("browser-sim");
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  const togglePaused = useCallback(() => {
    setPaused((current) => {
      pausedRef.current = !current;
      return !current;
    });
  }, []);

  useEffect(() => {
    let tick = 0;
    let fallbackTimer = window.setInterval(() => {
      tick += 1;
      if (!pausedRef.current) {
        setFrame(createFallbackFrame(tick));
      }
    }, 1000);

    const socket = new WebSocket("ws://127.0.0.1:8765");

    socket.addEventListener("open", () => {
      setConnected(true);
      setSource("websocket");
      window.clearInterval(fallbackTimer);
    });

    socket.addEventListener("message", (event) => {
      const parsed = JSON.parse(event.data) as SimulationFrame;
      if (!pausedRef.current) {
        setFrame(parsed);
      }
    });

    socket.addEventListener("close", () => {
      setConnected(false);
      setSource("browser-sim");
      fallbackTimer = window.setInterval(() => {
        tick += 1;
        if (!pausedRef.current) {
          setFrame(createFallbackFrame(tick));
        }
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

  return useMemo(
    () => ({ frame, connected, source, paused, togglePaused }),
    [frame, connected, source, paused, togglePaused],
  );
}
