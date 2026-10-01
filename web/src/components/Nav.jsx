import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Camera, Menu, X } from "lucide-react";

const LINKS = [
  { to: "/map", label: "Beach Map" },
  { to: "/info", label: "Ocean Data" },
  { to: "/action", label: "Cleanups" },
  { to: "/mine", label: "My Reports" },
];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="#ffffff" strokeWidth="2.2" aria-hidden="true">
      <circle cx="16" cy="16" r="13" />
      <path d="M5 18c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2" strokeLinecap="round" />
    </svg>
  );
}

// Transparent over the home hero, solid once scrolled past it and on every other page.
function useSolid(isHome) {
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight - 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);
  return !isHome || pastHero;
}

export default function Nav() {
  const { pathname } = useLocation();
  const solid = useSolid(pathname === "/");
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);

  // Close the mobile drawer whenever the route changes.
  if (open && openedAt !== pathname) setOpen(false);

  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <>
      <nav className="nav" data-solid={solid || open} aria-label="Main">
        <Link to="/" className="nav-logo">
          <Logo />
          <span className="nav-wordmark">Ocean Guardian</span>
        </Link>

        <div className="nav-pill">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-actions">
          <Link to="/report" className="nav-cta">
            <Camera aria-hidden="true" />
            <span>
              Report<span className="nav-cta-long"> a beach</span>
            </span>
          </Link>
          <button
            type="button"
            className="nav-menu-button"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => {
              setOpenedAt(pathname);
              setOpen((v) => !v);
            }}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="nav-drawer">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
