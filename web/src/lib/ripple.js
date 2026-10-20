// Drops a pebble at (x, y) inside `layer`: a small glint where it lands, then
// a few ripples spreading out. Real ripples seen from above are never neat
// full circles: the light catches them in broken arcs, so each ring here is a
// run of uneven arcs with gaps, wobbled by the hand-drawn #rough filter
// (components/Sketch.jsx), a pale crest with a faint shadow outside it. The
// gaps fall in a different place on every tap. Plain DOM nodes that remove
// themselves when done (styled in index.css), in a layer React never renders
// into.

const SVG = "http://www.w3.org/2000/svg";

// Break a circle of radius r into a few arcs of uneven length.
function brokenDash(r) {
  const around = 2 * Math.PI * r;
  const parts = [];
  let used = 0;
  while (used < around * 0.92) {
    const arc = around * (0.12 + Math.random() * 0.22);
    const gap = around * (0.04 + Math.random() * 0.1);
    parts.push(arc.toFixed(1), gap.toFixed(1));
    used += arc + gap;
  }
  return parts.join(" ");
}

function ring(svg, r, crest, shadow) {
  const dash = brokenDash(r);
  const turn = Math.random() * 360;
  const add = (radius, stroke, width) => {
    const c = document.createElementNS(SVG, "circle");
    c.setAttribute("cx", "50");
    c.setAttribute("cy", "50");
    c.setAttribute("r", radius);
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", stroke);
    c.setAttribute("stroke-width", width);
    c.setAttribute("stroke-linecap", "round");
    c.setAttribute("stroke-dasharray", dash);
    c.setAttribute("transform", `rotate(${turn.toFixed(1)} 50 50)`);
    svg.append(c);
  };
  add(r + 1.8, `rgba(16, 70, 90, ${shadow})`, 1.3);
  add(r, `rgba(255, 255, 255, ${crest})`, 1.7);
}

export function dropRipple(layer, x, y) {
  const place = (el) => {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.append(el);
    el.addEventListener("animationend", () => el.remove());
  };

  const glint = document.createElement("span");
  glint.className = "water-glint";
  place(glint);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "water-ripple");
  svg.setAttribute("aria-hidden", "true");
  ring(svg, 44, 0.9, 0.16);
  ring(svg, 33, 0.7, 0.12);
  ring(svg, 22, 0.5, 0.08);
  place(svg);
}
