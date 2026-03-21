import { useState, useCallback, useEffect, useRef } from 'react';

const PULL_THRESHOLD = 60; // px para disparar refresh
const MAX_PULL_DISTANCE = 90; // px máximo de arrastre visual

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullProgress: number; // 0-1
}

/**
 * Detecta el gesto pull-to-refresh sobre el scroll del window.
 * Usa pointer events (no touchstart) según las reglas iOS Safari del proyecto.
 * Solo activa en dispositivos táctiles (pointerType !== 'mouse').
 */
export function usePullToRefresh(onRefresh: () => Promise<void>): PullToRefreshState {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  // Refs para evitar stale closures en los callbacks
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const currentDeltaRef = useRef(0);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (isRefreshingRef.current) return;
    startYRef.current = e.clientY;
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    if (isRefreshingRef.current) return;

    const deltaY = e.clientY - startYRef.current;

    if (!isPullingRef.current) {
      // Activar solo cuando estamos arriba del todo y el usuario arrastra hacia abajo
      if (window.scrollY === 0 && deltaY > 8) {
        isPullingRef.current = true;
        setIsPulling(true);
      }
      return;
    }

    // Prevenir scroll nativo mientras hacemos PTR
    e.preventDefault();

    const clamped = Math.min(Math.max(deltaY, 0), MAX_PULL_DISTANCE * 1.2);
    currentDeltaRef.current = clamped;
    setPullProgress(Math.min(clamped / MAX_PULL_DISTANCE, 1));
  }, []);

  const handlePointerUp = useCallback(async () => {
    if (!isPullingRef.current) return;

    const delta = currentDeltaRef.current;
    isPullingRef.current = false;
    currentDeltaRef.current = 0;
    setIsPulling(false);

    if (delta >= PULL_THRESHOLD) {
      isRefreshingRef.current = true;
      setIsRefreshing(true);
      setPullProgress(1);
      try {
        await onRefresh();
      } finally {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
        setPullProgress(0);
      }
    } else {
      setPullProgress(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return { isPulling, isRefreshing, pullProgress };
}
