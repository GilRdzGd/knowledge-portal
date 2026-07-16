import { createShell } from "./components/shell.js";
import { createViewer } from "./components/viewer.js";
import { createLineagePage } from "./pages/lineage.js";
import { createModelPage } from "./pages/model.js";
import { createInventoryPage } from "./pages/inventory.js";
import { createDocumentationPage } from "./pages/documentation.js";
import { createNomenclaturasPage } from "./pages/nomenclaturas.js";
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
  const inventoryPage = createInventoryPage({ shell, viewer });
  const documentationPage = createDocumentationPage({ shell });
  const nomenclaturasPage = createNomenclaturasPage({ shell });
  const chat = createLineageChat({ catalog });
  const chatPage = createChatPage({ shell, chat });

  function isViewerMessage(event) {
    const allowedOrigin = event.origin === window.location.origin || event.origin === "null";
    return event.source === shell.viewer.contentWindow && allowedOrigin && event.data && typeof event.data.type === "string";
  }

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
    inventario: () => {
      chat.setVisible(true);
      inventoryPage.show();
    },
    documentacion: () => {
      chat.setVisible(true);
      documentationPage.show();
    },
    nomenclaturas: () => {
      chat.setVisible(true);
      nomenclaturasPage.show();
    },
    chat: () => {
      chat.setVisible(false);
      chatPage.show();
    }
  };

  window.addEventListener("message", (event) => {
    if (!isViewerMessage(event)) return;
    if (event.data?.type === "model-expand") {
      shell.setModelExpanded(Boolean(event.data.expanded));
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
