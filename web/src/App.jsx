import { NavLink, Outlet } from "react-router";
import { CameraIcon, ListIcon, MapIcon, PeopleIcon, WaveIcon } from "./components/Icons";

const navClass = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

export default function App() {
  return (
    <div className="app">
      <nav className="nav" aria-label="主要選單">
        <div className="nav-brand">
          Ocean Guardian
          <small>海岸回報</small>
        </div>
        <NavLink to="/" end className={navClass}>
          <MapIcon />
          海灘地圖
        </NavLink>
        <NavLink to="/info" className={navClass}>
          <WaveIcon />
          海洋資訊
        </NavLink>
        <NavLink to="/report" className={({ isActive }) => `${navClass({ isActive })} nav-report`}>
          <span className="nav-report-buoy">
            <CameraIcon />
          </span>
          回報
        </NavLink>
        <NavLink to="/action" className={navClass}>
          <PeopleIcon />
          淨灘行動
        </NavLink>
        <NavLink to="/mine" className={navClass}>
          <ListIcon />
          我的回報
        </NavLink>
      </nav>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
