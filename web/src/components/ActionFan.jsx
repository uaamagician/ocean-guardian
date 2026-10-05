import { Link } from "react-router";
import { Camera, LifeBuoy, Megaphone } from "lucide-react";

const ACTIONS = [
  { to: "/report", short: "Report", label: "Report a beach", icon: Camera, tone: "coral" },
  { to: "/action", short: "Join", label: "Join a cleanup", icon: LifeBuoy, tone: "sea" },
  { to: "/action?tab=organize", short: "Organize", label: "Organize a cleanup", icon: Megaphone, tone: "sun" },
];

// Three square cards stacked at odd angles, like notes dropped on a table.
// Hovering (or tabbing into) the stack deals them out left, middle and right;
// on touch screens they start dealt out.
export default function ActionFan({ className = "" }) {
  return (
    <nav className={`fan ${className}`} aria-label="What would you like to do?">
      {ACTIONS.map(({ to, short, label, icon: Icon, tone }) => (
        <Link key={to} to={to} className={`fan-card fan-${tone}`} aria-label={label} viewTransition>
          <span className="fan-face">
            <Icon aria-hidden="true" />
          </span>
          <span className="fan-label" aria-hidden="true">
            {short}
          </span>
        </Link>
      ))}
    </nav>
  );
}
