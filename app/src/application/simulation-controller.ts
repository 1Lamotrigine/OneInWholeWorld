'use client';

import { useEffect, useRef } from 'react';
import { useGame } from '../stores/game-store';

export function useSimulationClock(running: boolean, duration: number, age: number, pendingToken: string | undefined) {
  const bar = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
    if (bar.current) {
      bar.current.style.transform = 'scaleX(0)';
      bar.current.parentElement?.setAttribute('aria-valuenow', '0');
    }
  }, [age, pendingToken]);

  useEffect(() => {
    const element = bar.current;
    if (!running || !element) return;
    let last = performance.now();
    let frame = 0;
    let step = -1;
    const render = (now: number) => {
      elapsed.current = Math.min(1, elapsed.current + (now - last) / duration);
      last = now;
      element.style.transform = `scaleX(${elapsed.current})`;
      const rounded = Math.floor(elapsed.current * 10);
      if (rounded !== step) {
        step = rounded;
        element.parentElement?.setAttribute('aria-valuenow', String(step * 10));
      }
      if (elapsed.current === 1) {
        const session = useGame.getState();
        if (!session.saving && !session.loading) {
          session.tick();
          if (useGame.getState().state !== session.state) elapsed.current = 0;
        }
      }
      frame = requestAnimationFrame(render);
    };
    const resume = () => { last = performance.now(); };
    document.addEventListener('visibilitychange', resume);
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [running, duration]);
  return bar;
}
