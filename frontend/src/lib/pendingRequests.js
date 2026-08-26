// Counts in-flight API requests so the UI can always show "something is
// happening". On a slow shop-floor connection a click used to look like nothing
// at all: the button stayed idle until the response landed, so operators pressed
// it again (and again). Every request goes through lib/api, so counting there
// covers the whole app instead of relying on each button to remember.

let pending = 0;
const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn(pending));

export function startRequest() {
  pending += 1;
  emit();
}

export function endRequest() {
  // Never below zero: an interceptor that fires the error path after the success
  // path (or vice versa) would otherwise leave the counter stuck negative and the
  // indicator permanently hidden.
  pending = Math.max(0, pending - 1);
  emit();
}

export function getPending() {
  return pending;
}

export function subscribePending(fn) {
  listeners.add(fn);
  fn(pending);
  return () => listeners.delete(fn);
}
