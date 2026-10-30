import { useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Camera, Menu, X } from "lucide-react";
import UserMenu from "./UserMenu";
import { isGoogleUser, useUser } from "../lib/auth";

const LINKS = [
  { to: "/map", label: "Beach Map" },
  { to: "/action", label: "Cleanups" },
  { to: "/history", label: "History" },
  { to: "/guide", label: "Field Guide" },
  { to: "/info", label: "Ocean Data" },
];

function Logo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <circle cx="16" cy="16" r="13" />
      <path d="M5 18c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2 2.2-2 4.4-2" strokeLinecap="round" />
    </svg>
  );
}

// Slides the marker circle to whichever link is active.
function usePillIndicator(pillRef, pathname) {
  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill) return undefined;
    const place = () => {
      const active = pill.querySelector(".nav-link.active");
      pill.style.setProperty("--ind-opacity", active ? "1" : "0");
      if (!active) return;
      pill.style.setProperty("--ind-x", `${active.offsetLeft}px`);
      pill.style.setProperty("--ind-w", `${active.offsetWidth}px`);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [pillRef, pathname]);
}

export default function Nav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const pillRef = useRef(null);
  usePillIndicator(pillRef, pathname);
  const { user } = useUser();

  // Close the mobile drawer whenever the route changes.
  if (open && openedAt !== pathname) setOpen(false);

  const linkClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <>
      {/* The torn, frosted paper is its own layer behind the header, so its
          clip-path never cuts off the account menu. */}
      <div className="nav-shadow" aria-hidden="true" />
      <div className="nav-paper" aria-hidden="true" />
      <nav className="nav" aria-label="Main">
        <Link to="/" className="nav-logo" aria-label="Ocean Guardian home" viewTransition>
          <Logo />
          <span className="nav-wordmark"><span className="wordmark-strong">Ocean</span> <span className="wordmark-light">Guardian</span></span>
        </Link>

        <div className="nav-pill" ref={pillRef}>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass} viewTransition>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-actions">
          <Link to="/report" className="nav-cta" aria-label="Report a beach" viewTransition>
            <Camera aria-hidden="true" />
            <span className="nav-cta-text">
              Report<span className="nav-cta-long"> a beach</span>
            </span>
          </Link>
          <UserMenu />
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
            <Link key={l.to} to={l.to} viewTransition>
              {l.label}
            </Link>
          ))}
          <Link to="/me" viewTransition>
            {isGoogleUser(user) ? "Profile and my cleanups" : "My cleanups"}
          </Link>
          <Link to="/mine" viewTransition>
            My reports
          </Link>
        </div>
      )}
    </>
  );
}
