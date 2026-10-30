// tone drives the color scale in index.css (.level-dot[data-tone]).
export const CATEGORIES = {
  clean: { label: "Clean", tone: "clean" },
  light: { label: "Light debris", tone: "light" },
  moderate: { label: "Moderate debris", tone: "moderate" },
  heavy: { label: "Heavy debris", tone: "heavy" },
  not_beach: { label: "Not a beach photo", tone: "none" },
  healthy: { label: "Healthy coral", tone: "clean" },
  partially_bleached: { label: "Partly bleached", tone: "light" },
  severely_bleached: { label: "Severely bleached", tone: "moderate" },
  dead: { label: "Dead coral", tone: "heavy" },
  not_coral: { label: "Not a coral photo", tone: "none" },
};

export const STATUS = {
  processing: "AI is analyzing",
  published: "Live on the map",
  pending_review: "Waiting for review",
};

export const TYPES = {
  trash: "Beach debris",
  coral: "Coral",
};

export const TONE_COLORS = {
  clean: "#3f9a85",
  light: "#d4ab3c",
  moderate: "#e57a32",
  heavy: "#b8321e",
  none: "#8d9ca1",
};

// The year shows only when it isn't this one, which matters for old photos.
export function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}
