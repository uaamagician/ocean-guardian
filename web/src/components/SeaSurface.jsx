import "./SeaSurface.css";

// The light on the water behind a sea section's content. It goes first inside
// the section (or the .sea-run that paints two sections as one). One layer,
// standing still and slowly brightening and dimming, so the water looks
// alive without any lines crossing each other. Two kinds:
//   - sunlit: sunlight netting the bottom
//   - calm: pale open water with a few long, low swells
export default function SeaSurface({ calm = false }) {
  return (
    <div className={`sea-surface ${calm ? "is-calm" : "is-sunlit"}`} aria-hidden="true">
      {calm ? (
        <div className="sea-swell" />
      ) : (
        <div className="sea-net" />
      )}
    </div>
  );
}
