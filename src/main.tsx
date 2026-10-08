import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Fonts are bundled locally and inlined into the build (works fully offline).
import "@fontsource/press-start-2p/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
