import { createShell } from "./components/shell.js";
import { createViewer } from "./components/viewer.js";
import { createLineagePage } from "./pages/lineage.js";
import { createModelPage } from "./pages/model.js";
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

async function boot() {
  const catalog = await loadCatalog();
  const shell = createShell(document.getElementById("app"));
  const viewer = createViewer(shell);
  const homePage = createHomePage({ shell, viewer });
  const lineagePage = createLineagePage({ catalog, shell, viewer });
  const modelPage = createModelPage({ catalog, shell, viewer });
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
