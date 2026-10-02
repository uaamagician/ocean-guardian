import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.jsx";
import HomePage from "./pages/HomePage.jsx";
import MapPage from "./pages/MapPage.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import MyReportsPage from "./pages/MyReportsPage.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import ActionPage from "./pages/ActionPage.jsx";
import GuidePage from "./pages/GuidePage.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "map", element: <MapPage /> },
      { path: "report", element: <ReportPage /> },
      { path: "mine", element: <MyReportsPage /> },
      { path: "info", element: <InfoPage /> },
      { path: "action", element: <ActionPage /> },
      { path: "guide", element: <GuidePage /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
