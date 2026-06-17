import { useEffect, useMemo, useState } from 'react';

const getRemainingMs = (expiresAt) => {
  if (!expiresAt) return 0;
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return 0;
  return Math.max(0, expiresMs - Date.now());
};

const formatRemaining = (remainingMs) => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const useHoldCountdown = (expiresAt) => {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt));

  useEffect(() => {
    setRemainingMs(getRemainingMs(expiresAt));

    if (!expiresAt) return undefined;

    const timer = window.setInterval(() => {
      setRemainingMs(getRemainingMs(expiresAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return useMemo(() => ({
    remainingMs,
    remainingText: formatRemaining(remainingMs),
    isExpired: remainingMs <= 0,
  }), [remainingMs]);
};

export default useHoldCountdown;
