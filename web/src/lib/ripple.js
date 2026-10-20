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
