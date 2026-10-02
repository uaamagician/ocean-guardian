import { Outlet, ScrollRestoration, useLocation } from "react-router";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import SmoothScroll from "./components/SmoothScroll";

const LONG_PAGES = new Set(["/", "/info"]);

export default function App() {
  const { pathname } = useLocation();
  // The map is a full-height app view: no footer under it, and the wheel zooms the map.
  const isMap = pathname === "/map";
  return (
    <>
      <SmoothScroll enabled={!isMap} />
      <ScrollRestoration />
      {LONG_PAGES.has(pathname) && <div className="scroll-progress" aria-hidden="true" />}
      <Nav />
      <main className="app-main">
        <Outlet />
      </main>
      {!isMap && <Footer />}
    </>
  );
}
