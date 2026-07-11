import { createShell } from "./components/shell.js";
import { createViewer } from "./components/viewer.js";
import { createLineagePage } from "./pages/lineage.js";
import { createModelPage } from "./pages/model.js";
import { createDocumentationPage } from "./pages/documentation.js";
import { createHomePage } from "./pages/home.js";
import { createChatPage } from "./pages/chat.js";
import { createLineageChat } from "./components/lineage-chat.js";

async function loadCatalog() {
  const response = await fetch("assets/data/catalog.json");
  if (!response.ok) {
    throw new Error(`No se pudo cargar el catalogo: ${response.status}`);
  }
  return response.json();
}

async function loadAppMeta() {
  const fallback = {
    productName: "Plataforma de Datos",
    versionMajor: 2,
    versionBuild: 35,
    updatedAt: "9 de julio de 2026",
    modelPublishedAt: "3 de julio de 2026"
  };
  try {
    const response = await fetch("assets/data/app-meta.json");
    return response.ok ? { ...fallback, ...(await response.json()) } : fallback;
  } catch (_) {
    return fallback;
  }
}

async function boot() {
  const [catalog, appMeta] = await Promise.all([loadCatalog(), loadAppMeta()]);
  const shell = createShell(document.getElementById("app"));
  const viewer = createViewer(shell);
  const homePage = createHomePage({ shell, viewer, appMeta });
  const lineagePage = createLineagePage({ catalog, shell, viewer });
  const modelPage = createModelPage({ catalog, shell, viewer, appMeta });
  const documentationPage = createDocumentationPage({ shell, viewer });
  const chat = createLineageChat({ catalog });
  const chatPage = createChatPage({ shell, viewer, chat });

  const routes = {
    inicio: () => {
      chat.setVisible(false);
      homePage.show();
    },
    modelo: () => {
      modelPage.show();
      chat.setVisible(true);
    },
    linaje: () => {
      lineagePage.showAll();
      chat.setVisible(true);
    },
    documentacion: () => {
      chat.setVisible(true);
      documentationPage.show();
    },
    chat: () => {
      chat.setVisible(false);
      chatPage.show();
    }
  };

  window.addEventListener("message", (event) => {
    if (event.data?.type === "model-expand") {
      shell.setModelExpanded(Boolean(event.data.expanded));
    }
    if (event.data?.type === "chat-question") {
      chat.ask(event.data.question).then((answer) => {
        shell.viewer.contentWindow?.postMessage({ type: "chat-answer", id: event.data.id, answer }, "*");
      });
    }
  });

  shell.onNavigate((view) => (routes[view] || routes.linaje)());
  lineagePage.bindToolbar();
  homePage.show();
}

boot().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<main class="fatal-error"><h1>No se pudo iniciar el portal</h1><pre>${error.message}</pre></main>`;
});
