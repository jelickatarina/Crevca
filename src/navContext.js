let pending = null;

export function setNavContext(ctx) {
  pending = ctx;
}

export function consumeNavContext() {
  const c = pending;
  pending = null;
  return c;
}
