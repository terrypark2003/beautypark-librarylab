import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./poster.css";

// 임베드 폰트 (CDN 의존 제거)
import "pretendard/dist/web/variable/pretendardvariable.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/playfair-display/900.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/pinyon-script/400.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
