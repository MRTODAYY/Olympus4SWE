import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/rail.css";
import "./styles/buttons.css";
import "./styles/stage.css";
import "./styles/hitl.css";
import "./styles/views.css";
import "./styles/cards.css";
import "./styles/topology.css";
import "./styles/workflow-stages.css";
import "./styles/table.css";
import "./styles/waterfall.css";
import "./styles/dock.css";
import "./styles/dialog.css";
import "./styles/picker.css";
import "./styles/drawer.css";
import "./styles/workbench.css";
import "./styles/board.css";
import "./styles/pantheon.css";
import "./styles/responsive.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { I18nProvider, useI18n } from "./i18n";
import { Workbench } from "./state/workbench";

const container = document.getElementById("root");
if (!container) throw new Error("Ariadne: #root is missing from index.html");

const workbench = new Workbench();

/**
 * The workbench keeps all UI state on the `Workbench` instance, so remounting the
 * view tree on a locale change is safe — and it is what lets non-component label
 * modules (`lib/labels.ts`, graph helpers) pick up the new language.
 */
function LocalizedApp() {
  const { locale } = useI18n();
  return <App key={locale} workbench={workbench} />;
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <LocalizedApp />
    </I18nProvider>
  </StrictMode>,
);
void workbench.start();
