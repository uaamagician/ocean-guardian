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

// Pushes the moving light lines on the water aside around (x, y), in step
// with the ripple: a hole opens under the tap, spreads out and fills back in.
// `el` is the layer holding the lines; its CSS masks with --hx/--hy (where),
// --hr (how far the push has spread) and --hk (how much of the middle is left:
// 1 untouched, 0 cleared). Optionally the lines bulge outward a little too.
export function scatter(el, x, y, { push = false } = {}) {
  if (!el) return;
  cancelAnimationFrame(el.scatterFrame);
  el.style.setProperty("--hx", `${x}px`);
  el.style.setProperty("--hy", `${y}px`);
  el.classList.add("is-scattering");
  if (push) {
    el.style.transformOrigin = `${x}px ${y}px`;
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }, { transform: "scale(1)" }], {
      duration: 1100,
      easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
    });
  }
  const start = performance.now();
  const DURATION = 1500;
  const step = (now) => {
    const t = (now - start) / DURATION;
    if (t >= 1) {
      el.classList.remove("is-scattering");
      return;
    }
    const spread = 1 - (1 - Math.min(t / 0.6, 1)) ** 3;
    const left = t < 0.18 ? 1 - 0.9 * (t / 0.18) : 0.1 + 0.9 * ((t - 0.18) / 0.82) ** 1.6;
    el.style.setProperty("--hr", `${40 + 240 * spread}px`);
    el.style.setProperty("--hk", left.toFixed(3));
    el.scatterFrame = requestAnimationFrame(step);
  };
  el.scatterFrame = requestAnimationFrame(step);
}
