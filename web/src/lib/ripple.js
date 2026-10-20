// Drops a pebble at (x, y) inside `layer`: a quick splash of light, then
// glossy rings spreading out (styled as .water-splash / .water-ring in
// index.css). Plain DOM nodes that remove themselves when they finish, in a
// layer React never renders into.
export function dropRipple(layer, x, y) {
  const add = (className, delay) => {
    const el = document.createElement("span");
    el.className = className;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    if (delay) el.style.animationDelay = `${delay}s`;
    layer.append(el);
    el.addEventListener("animationend", () => el.remove());
  };
  add("water-splash", 0);
  add("water-ring", 0);
  add("water-ring is-second", 0.14);
  add("water-ring is-third", 0.28);
}

// The tap pushes the water: everything moving on it (the light lines, the
// swells) swells outward from (x, y) for a moment, overshoots a touch on the
// way back and settles, like the surface lifting round a dropped pebble.
export function push(el, x, y) {
  if (!el) return;
  el.style.transformOrigin = `${x}px ${y}px`;
  // Easing per step (the whole animation runs linear), so the swell really
  // peaks about 0.3 s in rather than being squeezed into the first instant.
  el.animate(
    [
      { transform: "scale(1)", easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" },
      { transform: "scale(1.045)", offset: 0.22, easing: "ease-in-out" },
      { transform: "scale(0.993)", offset: 0.6, easing: "ease-in-out" },
      { transform: "scale(1)" },
    ],
    { duration: 1400 },
  );
}
