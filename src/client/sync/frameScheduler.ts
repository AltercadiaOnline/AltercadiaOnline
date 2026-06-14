/** Agenda callback no próximo frame (~16ms) — rAF no browser, timeout no Node/tests. */
export function scheduleNextFrame(callback: () => void): number {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number;
}

export function cancelScheduledFrame(handle: number | null): void {
  if (handle === null) return;
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle);
  }
}
