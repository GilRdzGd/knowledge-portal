import { createAssistantRetrieval } from "../services/assistant-evidence.js";

export function createLineageChat({ catalog }) {
  const retrieval = createAssistantRetrieval({ catalog });
  const panel = document.createElement("aside");
  panel.id = "lineageLocalChat";
  panel.className = "llc-collapsed llc-hidden";
  panel.innerHTML = `
    <div class="llc-head">
      <div class="llc-title">
        <span class="nav-icon" aria-hidden="true">✦</span>
        <div><strong>Asistente</strong></div>
      </div>
      <div class="llc-head-actions">
        <button class="llc-icon-btn llc-close-btn" id="llcClose" type="button" title="Cerrar asistente" aria-label="Cerrar asistente">×</button>
        <button class="llc-icon-btn" id="llcMinimize" type="button" title="Minimizar" aria-label="Minimizar asistente">+</button>
      </div>
    </div>
    <div class="llc-body">
      <div class="llc-examples" id="llcExamples"></div>
      <textarea id="llcQuestion" placeholder="Ej. De donde proviene ClienteOperacionLnkHashKey?"></textarea>
      <div class="llc-toolbar"><button id="llcAsk">Preguntar</button><button id="llcCopy">Copiar</button><button id="llcClear">Limpiar</button></div>
      <div id="llcAnswer">Haz una pregunta sobre origen, destino o transformacion de un campo.</div>
      <div class="llc-foot">Consulta local sobre los JSON extraidos. No usa backend ni API externa.</div>
    </div>`;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector(`#${id}`);
  const examples = [
    "De donde proviene ClienteOperacionLnkHashKey?",
    "Cuales son las tablas raw?",
    "A donde impacta rd_baz_bdclientes.rd_cripto_trans?",
  ];

  async function askMiniChat(question) {
    const text = String(question || "").trim();
    if (!text) return;
    $("llcAnswer").textContent = "Analizando metadata...";
    $("llcAnswer").textContent = await retrieval.ready.then(() => retrieval.answerQuestion(text));
  }

  examples.forEach((text) => {
    const button = document.createElement("button");
    button.className = "llc-chip";
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", () => {
      $("llcQuestion").value = text;
      askMiniChat(text);
    });
    $("llcExamples").appendChild(button);
  });

  $("llcAsk").addEventListener("click", () => askMiniChat($("llcQuestion").value));
  $("llcQuestion").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askMiniChat($("llcQuestion").value);
    }
  });
  $("llcClear").addEventListener("click", () => {
    $("llcQuestion").value = "";
    $("llcAnswer").textContent = "Haz una pregunta sobre origen, destino o transformacion de un campo.";
  });
  $("llcCopy").addEventListener("click", async () => navigator.clipboard?.writeText($("llcAnswer").textContent || ""));
  $("llcClose").addEventListener("click", () => panel.classList.add("llc-hidden"));
  $("llcMinimize").addEventListener("click", () => {
    panel.classList.toggle("llc-collapsed");
    $("llcMinimize").textContent = panel.classList.contains("llc-collapsed") ? "+" : "-";
  });

  return {
    async ask(question) {
      await retrieval.ready;
      return retrieval.answerQuestion(question);
    },
    async retrieveEvidence(question, options) {
      await retrieval.ready;
      return retrieval.retrieveEvidence(question, options);
    },
    getStatus() {
      return retrieval.getStatus();
    },
    setVisible(visible) {
      panel.classList.toggle("llc-hidden", !visible);
    },
    ready: retrieval.ready,
  };
}
