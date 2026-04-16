import React from "react";
import ReactDOM from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "prosemirror-view/style/prosemirror.css";
import App from "./App";
import "./styles.css";

const app = (
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
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  import.meta.env.DEV ? app : <React.StrictMode>{app}</React.StrictMode>,
);
