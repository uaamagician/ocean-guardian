const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function MapIcon() {
  return (
    <svg {...base}>
      <path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.2" />
    </svg>
  );
}

export function WaveIcon() {
  return (
    <svg {...base}>
      <path d="M2 8c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
      <path d="M2 13c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
      <path d="M2 18c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg {...base} strokeWidth={2}>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

export function PeopleIcon() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 14.2c2.8.4 5 2.8 5 5.8" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg {...base}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </svg>
  );
}
