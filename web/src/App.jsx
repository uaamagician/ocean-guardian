import { Outlet, ScrollRestoration, useLocation } from "react-router";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import SmoothScroll from "./components/SmoothScroll";
import { SketchDefs } from "./components/Sketch";

const LONG_PAGES = new Set(["/", "/info", "/guide", "/action"]);
// Event pages are long too, but their paths carry an id.
const isLongPage = (path) => LONG_PAGES.has(path) || path.startsWith("/events/");

export default function App() {
  const { pathname } = useLocation();
  // The map is a full-height app view: no footer under it, and the wheel zooms the map.
  const isMap = pathname === "/map";
  return (
    <>
      <SketchDefs />
      <SmoothScroll enabled={!isMap} />
      <ScrollRestoration />
      {isLongPage(pathname) && <div className="scroll-progress" aria-hidden="true" />}
      <Nav />
      <main className="app-main">
        <Outlet />
      </main>
      {!isMap && <Footer />}
    </>
  );
}
