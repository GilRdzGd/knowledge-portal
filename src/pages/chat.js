function createChatDocument(status) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chat</title>
  <link rel="stylesheet" href="assets/css/embed-overrides.css" />
</head>
<body class="chat-doc">
  <main class="chat-app">
    <section class="chat-thread" id="thread" aria-live="polite">
      <div class="chat-welcome" id="welcome">
        <div class="chat-logo" aria-hidden="true"><span class="chat-cube"><i></i><i></i><i></i></span></div>
        <div class="prompt-grid">
          <button type="button">De donde proviene ClienteOperacionLnkHashKey?</button>
          <button type="button">Cuales son las tablas raw?</button>
          <button type="button">A donde impacta rd_baz_bdclientes.rd_cripto_trans?</button>
          <button type="button">Resume el linaje global</button>
        </div>
        <div class="chat-messages" id="messages" aria-live="polite"></div>
      </div>
    </section>
    <form class="chat-composer" id="composer">
      <textarea id="question" rows="1" placeholder="Pregunta sobre linaje, tablas o campos"></textarea>
      <button type="submit" title="Enviar" aria-label="Enviar">↑</button>
    </form>
  </main>
  <script>
    const thread = document.getElementById("thread");
    const welcome = document.getElementById("welcome");
    const messages = document.getElementById("messages");
    const composer = document.getElementById("composer");
    const question = document.getElementById("question");
    const promptButtons = Array.from(document.querySelectorAll(".prompt-grid button"));
    let requestId = 0;

    function createMessage(role, text) {
      const row = document.createElement("article");
      row.className = "message " + role;
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      avatar.textContent = role === "user" ? "Tú" : "PD";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = text;
      row.append(avatar, bubble);
      return { row, bubble };
    }

    function ask(text) {
      const value = text.trim();
      if (!value) return;
      const turn = document.createElement("div");
      turn.className = "chat-turn";
      const userMessage = createMessage("user", value);
      const assistantMessage = createMessage("assistant", "Analizando metadata...");
      turn.append(userMessage.row, assistantMessage.row);
      messages.prepend(turn);
      const pending = assistantMessage.bubble;
      const id = String(++requestId);
      pending.dataset.requestId = id;
      window.parent.postMessage({ type: "chat-question", id, question: value }, "*");
      question.value = "";
      question.style.height = "auto";
      thread.scrollTop = 0;
    }

    promptButtons.forEach((button) => button.addEventListener("click", () => ask(button.textContent || "")));
    composer.addEventListener("submit", (event) => {
      event.preventDefault();
      ask(question.value);
    });
    question.addEventListener("input", () => {
      question.style.height = "auto";
      question.style.height = Math.min(question.scrollHeight, 160) + "px";
    });
    question.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        composer.requestSubmit();
      }
    });
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "chat-answer") return;
      const bubble = thread.querySelector('[data-request-id="' + event.data.id + '"]');
      if (bubble) bubble.textContent = event.data.answer;
    });
    question.focus();
  </script>
</body>
</html>`;
}

export function createChatPage({ shell, viewer, chat }) {
  return {
    show() {
      shell.setActive("chat");
      shell.pageTitle.textContent = "Chat";
      shell.targetLabel.textContent = "Consulta local de metadata";
      shell.relMode.textContent = "Chat";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createChatDocument(chat.getStatus()));
    }
  };
}
