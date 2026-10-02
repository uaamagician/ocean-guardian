import { useState } from "react";

// Fades in once decoded. A cached image fires onLoad (or is already complete)
// before paint, so it shows without a visible fade.
export default function FadeImg({ className = "", onLoad, ...props }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      {...props}
      ref={(img) => {
        if (img?.complete && img.naturalWidth && !loaded) setLoaded(true);
      }}
      className={`fade-img ${loaded ? "is-loaded" : ""} ${className}`}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
    />
  );
}
