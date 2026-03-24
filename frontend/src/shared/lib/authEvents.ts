type VoidFn = () => void;

let onUnauthorized: VoidFn | null = null;

export function setUnauthorizedHandler(fn: VoidFn | null) {
  onUnauthorized = fn;
}

export function notifyUnauthorized() {
  onUnauthorized?.();
}
