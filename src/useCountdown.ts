// src/useCountdown.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCountdown() {
  const [msLeft, setMsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const endTs = useRef(0);
  const raf = useRef<number | null>(null);

  const tick = useCallback(() => {
    const now = performance.now();
    const left = Math.max(0, endTs.current - now);
    setMsLeft(left);
    if (left <= 0) {
      setRunning(false);
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    raf.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback((durationMs: number) => {
    endTs.current = performance.now() + durationMs;
    setMsLeft(durationMs);
    setRunning(true);
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    if (!running) return;
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    // capture remaining time from state
    endTs.current = performance.now() + msLeft;
    setRunning(false);
  }, [running, msLeft]);

  const resume = useCallback(() => {
    if (running || msLeft <= 0) return;
    start(msLeft);
  }, [running, msLeft, start]);

  const stop = useCallback(() => {
    setRunning(false);
    setMsLeft(0);
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      raf.current = null;
    };
  }, []);

  return { msLeft, running, start, pause, resume, stop };
}
