import { Link } from "react-router";
import { CalendarCheck, Camera, Megaphone } from "lucide-react";

// The three things people come here to do. `light` is for dark photos.
export default function ActionButtons({ light = false, className = "" }) {
  const secondary = light ? "btn btn-light" : "btn";
  return (
    <div className={`action-buttons ${className}`}>
      <Link to="/report" className="btn btn-primary" viewTransition>
        <Camera aria-hidden="true" /> Report a beach
      </Link>
      <Link to="/action" className={secondary} viewTransition>
        <CalendarCheck aria-hidden="true" /> Join a cleanup
      </Link>
      <Link to="/action?tab=organize" className={secondary} viewTransition>
        <Megaphone aria-hidden="true" /> Organize one
      </Link>
    </div>
  );
}
