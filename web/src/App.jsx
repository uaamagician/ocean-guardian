import { Outlet, useLocation } from "react-router";
import Nav from "./components/Nav";
import Footer from "./components/Footer";

export default function App() {
  const { pathname } = useLocation();
  // The map is a full-height app view; a footer under it would just add scroll.
  const showFooter = pathname !== "/map";
  return (
    <>
      <Nav />
      <main className="app-main">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </>
  );
}
