import { Link } from "react-router";
import { DEBRIS_TYPES, TOOL_BY_ID } from "../lib/guide";
import { CountUp, Reveal } from "./Motion";
import { Doodle, Marked, Note } from "./Sketch";
import ActionButtons from "./ActionButtons";
import { SeaLife } from "./Life";

// The numbers behind the project, each with its source.
const FACTS = [
  {
    value: 11000000,
    label: "tonnes of plastic enter the ocean every year",
    source: "Pew Charitable Trusts and SYSTEMIQ, 2020",
  },
  {
    value: 29,
    suffix: " million",
    label: "tonnes a year by 2040 if nothing changes",
    source: "Pew Charitable Trusts and SYSTEMIQ, 2020",
  },
  {
    value: 223273,
    label: "coastal cleanups in Taiwan since 2020",
    source: "Taiwan Ministry of Environment",
  },
  {
    value: 378347,
    label: "tonnes of coastal waste removed in Taiwan",
    source: "Taiwan Ministry of Environment",
  },
];

export function WhyItMatters() {
  return (
    <section className="band band-dark why">
      <SeaLife fish={["orange", "blue"]} turtle={false} />
      <div className="band-inner">
        <Doodle name="bottle" className="band-doodle why-bottle bob" />
        <Reveal className="band-head">
          <h2>Why it matters</h2>
          <p>
            Cleanups happen on cleanup days. Debris arrives with every tide. SDG target 14.1 asks for a significant cut
            in marine debris; it starts with knowing which beach needs help today.
          </p>
        </Reveal>
        <ul className="why-grid">
          {FACTS.map((f, i) => (
            <Reveal as="li" key={f.label} delay={i * 40}>
              <CountUp value={f.value} suffix={f.suffix} className="why-number" />
              <span className="why-label">{f.label}</span>
              <small>{f.source}</small>
            </Reveal>
          ))}
        </ul>
        <Note arrow="before" className="why-note">
          that's about 21 tonnes every minute
        </Note>
      </div>
    </section>
  );
}

const TEASER_DEBRIS = ["fishing", "microplastics", "styrofoam", "glass", "hazardous", "natural"];
const TEASER_TOOLS = ["gloves", "pickers", "sieves", "netCutters", "buckets", "firstAid"];

export function GuideTeaser() {
  return (
    <section className="band band-paper">
      <div className="band-inner">
        <div className="band-split">
          <Reveal className="band-head">
            <h2>
              Know what you're <Marked delay={300}>picking up</Marked>
            </h2>
            <p>How to handle each kind of debris safely, and every tool a cleanup plan may ask for.</p>
          </Reveal>
          <Link to="/guide" className="btn" viewTransition>
            Open the field guide
          </Link>
        </div>
        <div className="teaser-cols">
          <div>
            <h3>What washes up</h3>
            <ul className="teaser-chips">
              {TEASER_DEBRIS.map((id, i) => {
                const { icon: Icon, name } = DEBRIS_TYPES.find((d) => d.id === id);
                return (
                  <Reveal as="li" key={id} delay={i * 25}>
                    <Link to={`/guide#debris-${id}`} viewTransition>
                      <Icon aria-hidden="true" />
                      {name}
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </div>
          <div>
            <h3>What to bring</h3>
            <ul className="teaser-chips">
              {TEASER_TOOLS.map((id, i) => {
                const { icon: Icon, name } = TOOL_BY_ID[id];
                return (
                  <Reveal as="li" key={id} delay={i * 25}>
                    <Link to={`/guide#tool-${id}`} viewTransition>
                      <Icon aria-hidden="true" />
                      {name}
                    </Link>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

const CTA_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg/1920px-2022_Beach_Cleanup_at_the_Long_Fong_Fishing_Port.jpg";

export function FinalCta() {
  return (
    <section className="final-cta" style={{ backgroundImage: `url("${CTA_IMAGE}")` }}>
      <Reveal className="final-cta-inner">
        <h2>
          <span className="serif-italic">Every report</span>
          <span>
            makes the map <Marked delay={350}>more true.</Marked>
          </span>
        </h2>
        <p>Start with the beach nearest you. It takes one photo.</p>
        <ActionButtons light className="final-actions" />
      </Reveal>
      <small className="final-cta-credit">Long Fong Fishing Port, Miaoli. Photo: Taiwankengo, CC BY-SA 4.0</small>
    </section>
  );
}
