// Wraps each word of an element's text in a span so it can be animated.
// Unlike SplitText, element nodes stay exactly where React put them (only text
// nodes are swapped), and elements matching `keep` move as one piece. `revert`
// puts the original text nodes back, so React's view of the DOM stays true.
export function splitWords(root, { keep = ".marked" } = {}) {
  const swaps = [];
  const pieces = [];

  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        if (!child.textContent.trim()) continue;
        const parts = child.textContent.split(/(\s+)/).filter(Boolean);
        const nodes = parts.map((part) => {
          if (/^\s+$/.test(part)) return document.createTextNode(part);
          const span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          pieces.push(span);
          return span;
        });
        child.replaceWith(...nodes);
        swaps.push({ original: child, nodes });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.matches(keep)) pieces.push(child);
        else if (!(child instanceof SVGElement)) walk(child);
      }
    }
  };
  walk(root);

  const revert = () => {
    for (const { original, nodes } of swaps) {
      nodes[0].replaceWith(original);
      nodes.slice(1).forEach((n) => n.remove());
    }
  };
  return { pieces, revert };
}
