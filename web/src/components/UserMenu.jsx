import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { CalendarCheck, Camera, LogOut, Megaphone, UserRound } from "lucide-react";
import { isGoogleUser, signInErrorMessage, signInWithGoogle, signOutUser, useUser } from "../lib/auth";

export function Avatar({ user, size = 34 }) {
  const [broken, setBroken] = useState(false);
  const initial = (user.displayName || user.email || "?").trim().charAt(0).toUpperCase();
  if (user.photoURL && !broken) {
    return (
      <img
        className="avatar"
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="avatar avatar-initial" style={{ width: size, height: size }} aria-hidden="true">
      {initial}
    </span>
  );
}

export default function UserMenu() {
  const { ready, user } = useUser();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const [error, setError] = useState("");
  const ref = useRef(null);

  // Close on navigation, outside clicks and Escape.
  if (open && openedAt !== pathname) setOpen(false);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ready) return <span className="user-placeholder" aria-hidden="true" />;

  if (!isGoogleUser(user)) {
    return (
      <div className="user-menu">
        <button
          type="button"
          className="nav-signin"
          onClick={async () => {
            setError("");
            try {
              await signInWithGoogle();
            } catch (err) {
              console.error(err);
              setError(signInErrorMessage(err));
            }
          }}
        >
          Sign in
        </button>
        {error && <p className="user-menu-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.displayName ?? user.email}`}
        onClick={() => {
          setOpenedAt(pathname);
          setOpen((v) => !v);
        }}
      >
        <Avatar user={user} />
      </button>
      {open && (
        <div className="user-dropdown" role="menu">
          <div className="user-dropdown-head">
            <Avatar user={user} size={40} />
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <Link to="/me" role="menuitem" viewTransition>
            <UserRound aria-hidden="true" /> Profile
          </Link>
          <Link to="/me#cleanups" role="menuitem" viewTransition>
            <CalendarCheck aria-hidden="true" /> My cleanups
          </Link>
          <Link to="/action?tab=organize" role="menuitem" viewTransition>
            <Megaphone aria-hidden="true" /> Organize a cleanup
          </Link>
          <Link to="/mine" role="menuitem" viewTransition>
            <Camera aria-hidden="true" /> My reports
          </Link>
          <button type="button" role="menuitem" onClick={() => signOutUser()}>
            <LogOut aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
