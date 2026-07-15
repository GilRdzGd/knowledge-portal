import { LITERT_CONFIG } from "../services/litert-config.js";

const MAX_QUESTION_CHARS = 600;

function appendText(element, value) {
  element.textContent = String(value || "");
}

function renderDiagnostics(element, steps = []) {
  element.replaceChildren();
  steps.forEach((step) => {
    const item = document.createElement("li");
    item.className = step.ok ? "ok" : "fail";
    const name = document.createElement("strong");
    name.textContent = step.label;
    const detail = document.createElement("span");
    detail.textContent = step.detail || (step.ok ? "Correcto." : "No disponible.");
    item.append(name, detail);
    element.appendChild(item);
  });
  element.hidden = !steps.length;
}

function createMessage(role, text) {
  const row = document.createElement("article");
  row.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Tú" : "PD";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  row.append(avatar, bubble);
  return { row, bubble };
}

function appendEvidence(turn, evidence) {
  if (!Array.isArray(evidence) || !evidence.length) return;
  const details = document.createElement("details");
  details.className = "evidence-panel";
  const summary = document.createElement("summary");
  summary.textContent = "Evidencia utilizada";
  const list = document.createElement("div");
  list.className = "evidence-list";
  evidence.forEach((item, index) => {
    const block = document.createElement("div");
    block.className = "evidence-item";
    const title = document.createElement("strong");
    title.textContent = `${index + 1}. ${item.sourceTable || "-"} -> ${item.targetTable || "-"}`;
    const fields = document.createElement("p");
    fields.textContent = `Campos: ${item.sourceField || "-"} -> ${item.targetField || "-"}`;
    const transform = document.createElement("p");
    transform.textContent = `Transformacion: ${item.transformation || "Sin transformacion registrada"}`;
    const meta = document.createElement("p");
    meta.textContent = `Direccion: ${item.direction || "-"} · Tipo: ${item.relationType || "-"}`;
    block.append(title, fields, transform, meta);
    list.appendChild(block);
  });
  details.append(summary, list);
  turn.appendChild(details);
}

function createChatMarkup() {
  return `
    <main class="chat-app">
      <section class="chat-thread" id="chatThread" aria-live="polite">
        <div class="chat-welcome" id="chatWelcome">
          <div class="chat-logo" aria-hidden="true"><span class="chat-cube"><i></i><i></i><i></i></span></div>
          <div class="prompt-grid">
            <button type="button">De donde proviene ClienteOperacionLnkHashKey?</button>
            <button type="button">Cuales son las tablas raw?</button>
            <button type="button">A donde impacta rd_baz_bdclientes.rd_cripto_trans?</button>
            <button type="button">Resume el linaje global</button>
          </div>
          <section class="local-ai-card" id="localAiCard" aria-live="polite">
            <div>
              <strong>Asistente con IA local</strong>
              <p>La IA se ejecuta en este dispositivo y requiere una descarga grande.</p>
              <p class="local-ai-note">La primera activacion puede descargar aproximadamente <span id="aiDownloadSize">${LITERT_CONFIG.approximateDownload}</span>. Requiere HTTPS, WebGPU y un navegador compatible.</p>
              <p class="local-ai-note">La GPU debe tener VRAM adicional disponible para buffers de inferencia; una GPU de 2 GB puede quedarse corta para este modelo.</p>
              <p class="local-ai-note">Las preguntas no se envian a un servicio de inferencia externo. El archivo del modelo se descarga desde el proveedor configurado.</p>
            </div>
            <div class="local-ai-actions">
              <button type="button" id="activateAi">Activar IA local</button>
              <button type="button" id="stopAi" hidden>Detener</button>
              <span id="aiStatus">Desactivado.</span>
            </div>
            <ul class="ai-diagnostics" id="aiDiagnostics" hidden></ul>
          </section>
          <div class="chat-messages" id="chatMessages" aria-live="polite"></div>
        </div>
      </section>
      <form class="chat-composer" id="chatComposer">
        <textarea id="chatQuestion" rows="1" placeholder="Pregunta sobre linaje, tablas o campos" maxlength="${LITERT_CONFIG.maxQuestionChars || MAX_QUESTION_CHARS}"></textarea>
        <button type="submit" title="Enviar" aria-label="Enviar">↑</button>
      </form>
    </main>`;
}

export function createChatPage({ shell, chat }) {
  let mounted = false;
  let requestId = 0;
  let activeRequestId = "";
  let activeAbort = null;
  let generating = false;
  let aiReady = false;
  let litertEngine = null;
  const config = { ...LITERT_CONFIG };

  function $(selector) {
    return shell.chatMount.querySelector(selector);
  }

  function setAiStatus(text) {
    appendText($("#aiStatus"), text);
  }

  function setGenerating(value) {
    generating = value;
    $("#stopAi").hidden = !value;
    $("#chatComposer button").disabled = value;
  }

  async function ensureLocalAi() {
    if (aiReady) return true;
    if (!config.enabled) return false;
    if (!litertEngine) {
      litertEngine = await import("../services/litert-engine.js");
    }
    const support = litertEngine.isLiteRtSupported();
    if (!support.supported) {
      setAiStatus("La IA local no esta disponible en este navegador. El asistente continuara usando el motor de busqueda determinista.");
      renderDiagnostics($("#aiDiagnostics"), [
        { label: "Contexto seguro", ok: support.secure, detail: support.secure ? "HTTPS o localhost." : support.reason },
        { label: "WebGPU", ok: support.webgpu, detail: support.webgpu ? "navigator.gpu disponible." : support.reason },
      ]);
      $("#activateAi").disabled = false;
      return false;
    }
    $("#activateAi").disabled = true;
    setAiStatus("Comprobando compatibilidad.");
    try {
      const diagnostics = await litertEngine.diagnoseLiteRtEnvironment({ verifyNetwork: true });
      renderDiagnostics($("#aiDiagnostics"), diagnostics.steps);
      if (!diagnostics.gpuAccess.adapter || !diagnostics.gpuAccess.device) {
        throw new Error(diagnostics.gpuAccess.reason || "WebGPU no entrego acceso completo a GPU.");
      }
      await litertEngine.loadLiteRtModel({
        onStatus(status) {
          if (status.state === "downloading") setAiStatus("Descargando modelo.");
          else if (status.state === "initializing") setAiStatus("Inicializando modelo.");
          else if (status.state === "ready") setAiStatus("Listo.");
          else setAiStatus(status.message || "Preparando IA local.");
        },
      });
      aiReady = true;
      $("#activateAi").textContent = "IA local activa";
      $("#activateAi").disabled = true;
      setAiStatus("Listo.");
      return true;
    } catch (error) {
      console.error(error);
      aiReady = false;
      $("#activateAi").disabled = false;
      setAiStatus(error?.message || "Error de carga. Puedes reintentar.");
      return false;
    }
  }

  async function renderAnswer({ id, questionText, deterministicAnswer, evidence }) {
    const bubble = shell.chatMount.querySelector(`[data-request-id="${id}"]`);
    if (!bubble || id !== activeRequestId) return;
    const turn = bubble.closest(".chat-turn");
    if (!aiReady || !Array.isArray(evidence) || !evidence.length) {
      bubble.textContent = Array.isArray(evidence) && !evidence.length
        ? `No encontré suficiente evidencia en el catálogo para responder esta pregunta.\n\n${deterministicAnswer}`
        : deterministicAnswer;
      $("#chatQuestion").focus();
      return;
    }
    if (!litertEngine) litertEngine = await import("../services/litert-engine.js");
    activeAbort = new AbortController();
    setGenerating(true);
    setAiStatus("Generando.");
    bubble.textContent = "";
    let output = "";
    try {
      await litertEngine.generateGroundedAnswer({
        question: questionText,
        evidence,
        signal: activeAbort.signal,
        onToken(token, fullText) {
          if (id !== activeRequestId) return;
          output = fullText || output + token;
          bubble.textContent = output;
        },
      });
      if (!output.trim()) bubble.textContent = deterministicAnswer;
      appendEvidence(turn, evidence);
      setAiStatus("Listo.");
    } catch (error) {
      console.error(error);
      bubble.textContent = error?.name === "AbortError"
        ? `Generacion cancelada.\n\n${deterministicAnswer}`
        : `${error?.message || "No se pudo generar con IA local."}\n\n${deterministicAnswer}`;
      appendEvidence(turn, evidence);
      setAiStatus(error?.name === "AbortError" ? "Cancelado." : "Error de generacion. Se uso el motor determinista.");
    } finally {
      activeAbort = null;
      setGenerating(false);
      $("#chatQuestion").focus();
    }
  }

  async function ask(text) {
    if (generating) return;
    const questionText = String(text || "").trim().slice(0, config.maxQuestionChars || MAX_QUESTION_CHARS);
    if (!questionText) return;

    const turn = document.createElement("div");
    turn.className = "chat-turn";
    const userMessage = createMessage("user", questionText);
    const assistantMessage = createMessage("assistant", "Analizando metadata...");
    turn.append(userMessage.row, assistantMessage.row);
    $("#chatMessages").prepend(turn);

    const id = String(++requestId);
    activeRequestId = id;
    assistantMessage.bubble.dataset.requestId = id;
    $("#chatQuestion").value = "";
    $("#chatQuestion").style.height = "auto";
    $("#chatThread").scrollTop = 0;

    try {
      const result = await chat.retrieveEvidence(questionText, {
        maxEvidenceItems: config.maxEvidenceItems || 15,
      });
      await renderAnswer({
        id,
        questionText,
        deterministicAnswer: result.deterministicAnswer,
        evidence: result.evidence,
      });
    } catch (error) {
      console.error("No se pudo responder la pregunta del chat", error);
      assistantMessage.bubble.textContent = "No se pudo consultar la metadata local en este momento.";
    }
  }

  function mount() {
    if (mounted) return;
    shell.chatMount.innerHTML = createChatMarkup();
    if (!config.enabled) {
      $("#localAiCard").hidden = true;
    }
    shell.chatMount.querySelectorAll(".prompt-grid button").forEach((button) => {
      button.addEventListener("click", () => ask(button.textContent || ""));
    });
    $("#chatComposer").addEventListener("submit", (event) => {
      event.preventDefault();
      ask($("#chatQuestion").value);
    });
    $("#activateAi").addEventListener("click", () => ensureLocalAi());
    $("#stopAi").addEventListener("click", () => {
      activeAbort?.abort();
      litertEngine?.cancelLiteRtGeneration?.();
      setAiStatus("Cancelado.");
    });
    $("#chatQuestion").addEventListener("input", () => {
      const input = $("#chatQuestion");
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
    });
    $("#chatQuestion").addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        $("#chatComposer").requestSubmit();
      }
    });
    mounted = true;
  }

  return {
    show() {
      shell.setActive("chat");
      shell.pageTitle.textContent = "Chat";
      shell.targetLabel.textContent = "Consulta local de metadata";
      shell.relMode.textContent = "Chat";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      mount();
      shell.chatMount.scrollTop = 0;
      $("#chatQuestion")?.focus();
    },
  };
}
