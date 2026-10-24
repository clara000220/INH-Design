/* INH — tiny global "is anything loading" tracker.
   Any async op can bump the counter via beginBusy() / endBusy() (or wrap
   with trackBusy). The App shell subscribes via subscribe() and renders a
   top progress bar whenever the count > 0. Zero wiring at the call site
   when combined with the auto-wrapped api.* functions. */

let count = 0;
const listeners = new Set();

const notify = () => listeners.forEach(fn => { try { fn(count > 0); } catch { /* ignore */ } });

export function beginBusy() { count += 1; notify(); }
export function endBusy() { count = Math.max(0, count - 1); notify(); }

export async function trackBusy(promise) {
  beginBusy();
  try { return await promise; }
  finally { endBusy(); }
}

export function subscribe(fn) {
  listeners.add(fn);
  // Fire once immediately so new subscribers see current state.
  try { fn(count > 0); } catch { /* ignore */ }
  return () => listeners.delete(fn);
}

export function isBusy() { return count > 0; }
