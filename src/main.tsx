import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "prosemirror-view/style/prosemirror.css";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Theme
      appearance="inherit"
      accentColor="cyan"
      grayColor="slate"
      panelBackground="translucent"
      radius="medium"
      scaling="100%"
      hasBackground={false}
    >
      <App />
    </Theme>
  </React.StrictMode>
);
