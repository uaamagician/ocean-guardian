import { Link } from "react-router";
import { Building2, CalendarX, FileText, Footprints, HandHeart, Megaphone, Waves } from "lucide-react";
import { DEBRIS_TYPES, TOOL_BY_ID } from "../lib/guide";
import { CountUp, Reveal } from "./Motion";

export function Problem() {
  return (
    <section className="band band-dark problem">
      <div className="band-inner">
        <Reveal className="problem-figure">
          <CountUp value={11000000} className="mega-number" />
          <p className="problem-lead">tonnes of plastic enter the ocean every year.</p>
        </Reveal>
        <div className="problem-body">
          <Reveal as="p" delay={100}>
            Ocean currents carry plastic fragments, abandoned fishing nets and industrial packaging thousands of
            kilometers, then leave them on coastlines: crowded tourist beaches, holiday resorts, even atolls where
            nobody lives.
          </Reveal>
          <Reveal as="p" delay={200}>
            Millions of people who love the sea want to change this. In practice it is hard to know where help is
            needed, what to bring, or whether any of it makes a difference.
          </Reveal>
          <Reveal className="problem-forecast" delay={300}>
            <CountUp value={29} suffix=" million" className="forecast-number" />
            <span>tonnes a year by 2040 if nothing changes.</span>
          </Reveal>
          <p className="data-note">Source: The Pew Charitable Trusts and SYSTEMIQ, Breaking the Plastic Wave (2020).</p>
        </div>
      </div>
    </section>
  );
}

const GAPS = [
  {
    icon: FileText,
    title: "Data that goes to sleep",
    body: "Cleanup data cards are filled in by hand after an event, then rarely looked at again.",
  },
  {
    icon: CalendarX,
    title: "Counting stops between events",
    body: "Campaigns mobilize thousands of volunteers for a day. Between events, nobody is keeping watch.",
  },
  {
    icon: Waves,
    title: "Paperwork instead of maps",
    body: "Official platforms track permits and totals, but can't show what a beach looks like today.",
  },
];

export function Gap() {
  return (
    <section className="band">
      <div className="band-inner">
        <Reveal className="band-head">
          <h2>
            <span className="serif-italic">People want to help.</span> The tools hold them back.
          </h2>
        </Reveal>
        <ul className="gap-list">
          {GAPS.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 120}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </ul>
        <Reveal className="gap-answer">
          <p>
            Ocean Guardian keeps the record going between cleanups. Anyone can add a photo in seconds, AI turns it into
            data, and the map shows where help is needed now.
          </p>
          <Link to="/map" className="btn">
            See the live map
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

const OCEAN_FACTS = [
  { value: 50, prefix: "About ", suffix: "%", text: "of the oxygen on Earth is produced in the ocean.", source: "NOAA" },
  {
    value: 30,
    prefix: "About ",
    suffix: "%",
    text: "of the carbon dioxide people release is absorbed by the ocean.",
    source: "United Nations",
  },
  {
    value: 3,
    suffix: " billion+",
    text: "people depend on marine and coastal life for their livelihoods.",
    source: "United Nations",
  },
];

export function Sdg14() {
  return (
    <section className="band band-deep sdg">
      <div className="band-inner">
        <div className="sdg-top">
          <Reveal className="sdg-figure">
            <CountUp value={70} suffix="%" className="mega-number" />
            <p className="problem-lead">of Earth's surface is ocean.</p>
          </Reveal>
          <Reveal className="band-head" delay={120}>
            <h2>Built for SDG 14, Life Below Water</h2>
            <p>
              The fourteenth UN Sustainable Development Goal is to conserve and sustainably use the oceans, seas and
              marine resources. The ocean steadies our climate, makes much of the oxygen we breathe, and feeds and
              employs billions of people.
            </p>
          </Reveal>
        </div>

        <ul className="fact-row">
          {OCEAN_FACTS.map((f, i) => (
            <Reveal as="li" key={f.text} delay={i * 120}>
              <strong>
                {f.prefix}
                <CountUp value={f.value} suffix={f.suffix} />
              </strong>
              <p>{f.text}</p>
              <small>{f.source}</small>
            </Reveal>
          ))}
        </ul>

        <Reveal as="blockquote" className="target">
          <p>
            “By 2025, prevent and significantly reduce marine pollution of all kinds, in particular from land-based
            activities, including marine debris and nutrient pollution.”
          </p>
          <footer>
            SDG Target 14.1. Ocean Guardian focuses on the land-based debris that ends up on beaches.
          </footer>
        </Reveal>
      </div>
    </section>
  );
}

const TAIWAN_STATS = [
  { value: 223273, label: "coastal cleanups" },
  { value: 378347, label: "tonnes of coastal waste removed" },
  { value: 1920954, label: "volunteer turnouts" },
  { value: 74.1, decimals: 1, suffix: "%", label: "of the coastline adopted by groups" },
];

export function TaiwanNumbers() {
  return (
    <section className="band">
      <div className="band-inner">
        <Reveal className="band-head">
          <h2>Taiwan's coastal cleanups, in numbers</h2>
          <p>
            Since 2020, according to Taiwan's Ministry of Environment. That's a huge effort, and it all happens on
            cleanup days. Ocean Guardian adds what happens in between.
          </p>
        </Reveal>
        <ul className="number-grid">
          {TAIWAN_STATS.map((s, i) => (
            <Reveal as="li" key={s.label} delay={i * 100}>
              <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} className="number-grid-value" />
              <span>{s.label}</span>
            </Reveal>
          ))}
        </ul>
        <p className="report-meta">
          Source:{" "}
          <a href="https://ecolife2.moenv.gov.tw/BeachCleanup/">Ministry of Environment, Coastal Clean-up Platform</a>,
          retrieved October 2026.
        </p>
      </div>
    </section>
  );
}

const AUDIENCES = [
  { icon: Footprints, title: "Beachgoers", body: "Check a beach before you go, and report what you find when you get there." },
  { icon: HandHeart, title: "Volunteers", body: "See which beaches need help most, and join a cleanup near you." },
  {
    icon: Megaphone,
    title: "Organizers",
    body: "NGOs, schools and clubs can skip the site visit and plan crews and gear from live reports.",
  },
  {
    icon: Building2,
    title: "Companies",
    body: "Turn volunteer days into measurable results for ESG and SDG 14.1 reporting.",
  },
];

export function Audiences() {
  return (
    <section className="band">
      <div className="band-inner">
        <Reveal className="band-head">
          <h2>One map, four ways to help</h2>
        </Reveal>
        <ul className="audience-grid">
          {AUDIENCES.map(({ icon: Icon, title, body }, i) => (
            <Reveal as="li" key={title} delay={i * 100}>
              <Icon aria-hidden="true" />
              <h3>{title}</h3>
              <p>{body}</p>
            </Reveal>
          ))}
        </ul>
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
            <h2>Know what you're picking up</h2>
            <p>
              Nets need cutters, styrofoam needs a sieve, needles need a professional, and driftwood should stay put.
              The field guide covers each kind of debris and every tool a cleanup plan may ask for.
            </p>
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
                  <Reveal as="li" key={id} delay={i * 50}>
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
                  <Reveal as="li" key={id} delay={i * 50}>
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
          <span>makes the map more true.</span>
        </h2>
        <p>Start with the beach nearest you. It takes one photo.</p>
        <div className="final-cta-actions">
          <Link to="/report" className="btn btn-primary">
            Report a beach
          </Link>
          <Link to="/map" className="btn btn-light">
            Explore the map
          </Link>
        </div>
      </Reveal>
      <small className="final-cta-credit">Long Fong Fishing Port, Miaoli. Photo: Taiwankengo, CC BY-SA 4.0</small>
    </section>
  );
}
