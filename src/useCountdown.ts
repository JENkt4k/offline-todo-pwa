// src/hooks/useCountdown.ts
import { useEffect, useRef } from 'react';
export function useCountdown(onTick: ()=>void) {
  const r = useRef<number>();
  useEffect(() => {
    const tick = () => { onTick(); r.current = window.setTimeout(tick, 1000); };
    r.current = window.setTimeout(tick, 1000);
    return () => r.current && window.clearTimeout(r.current);
  }, [onTick]);
}
