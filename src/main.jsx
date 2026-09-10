import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/system.css";
import "./styles/play-polish.css";
import "./styles/adventure.css";
import "./styles/booster.css";
const isActivity =
  location.pathname === "/tusmon" ||
  new URLSearchParams(location.search).has("frame_id");
const isLegal = ["/privacy", "/terms"].includes(location.pathname);
const App = isActivity
  ? lazy(() => import("./tusmon/TusmonApp.jsx"))
  : isLegal
    ? lazy(() => import("./legal/LegalPage.jsx"))
    : lazy(() => import("./App.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<p role="status">Chargement du jeu…</p>}>
      <App />
    </Suspense>
  </StrictMode>,
);
