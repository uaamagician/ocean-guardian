import "./SeaSurface.css";

// The light on the water behind a sea section's content. It goes first inside
// the section (or the .sea-run that paints two sections as one). Nothing on it
// slides: two copies of the lines, set a little apart, slowly trade
// brightness, so the pattern shifts the way light on water does while the
// sea itself stays put. Two kinds:
//   - sunlit: sunlight netting the bottom
//   - calm: pale open water with a few long, low swells
export default function SeaSurface({ calm = false }) {
  return (
    <div className={`sea-surface ${calm ? "is-calm" : "is-sunlit"}`} aria-hidden="true">
      {calm ? (
        <>
          <div className="sea-swell sea-swell-a" />
          <div className="sea-swell sea-swell-b" />
        </>
      ) : (
        <>
          <div className="sea-net sea-net-a" />
          <div className="sea-net sea-net-b" />
        </>
      )}
    </div>
  );
}
