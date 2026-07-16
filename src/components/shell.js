export function createShell(root) {
  root.innerHTML = `
    <div class="app" id="appShell">
      <aside class="sidebar">
        <div class="brand"><div class="mark" aria-hidden="true"><span class="data-cube"><i></i><i></i><i></i></span></div><span class="brand-name">Plataforma de Datos</span></div>
        <nav class="nav" aria-label="Navegacion principal">
          <a class="active" href="#" data-view="inicio"><span class="nav-icon">⌂</span><span>Inicio</span></a>
          <a href="#" data-view="modelo"><span class="nav-icon">▣</span><span>Modelo de Datos</span></a>
          <a href="#" data-view="linaje"><span class="nav-icon">⌘</span><span>Linaje de Datos</span></a>
          <a href="#" data-view="inventario"><span class="nav-icon">▤</span><span>Inventario de Objetos</span></a>
          <a href="#" data-view="documentacion"><span class="nav-icon"><svg class="nav-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M6 1C4.34314 1 3 2.34315 3 4V20C3 21.6569 4.34315 23 6 23H19C20.6569 23 22 21.6569 22 20V10C22 9.73478 21.8946 9.48043 21.7071 9.29289L13.7071 1.29292C13.6114 1.19722 13.4983 1.1229 13.3753 1.07308C13.2572 1.02527 13.1299 1 13 1H6ZM12 3H6C5.44771 3 5 3.44771 5 4V20C5 20.5523 5.44772 21 6 21H19C19.5523 21 20 20.5523 20 20V11H13C12.4477 11 12 10.5523 12 10V3ZM18.5858 9.00003L14 4.41424V9.00003H18.5858Z" fill="currentColor"/></svg></span><span>Documentacion</span></a>
          <a href="#" data-view="nomenclaturas"><span class="nav-icon"><svg class="nav-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.7586,13 C11.6994,13 12.1893533,14.0920038 11.6139222,14.7923977 L11.5364,14.8778 L7.41424,19 L11,19 C11.5523,19 12,19.4477 12,20 C12,20.51285 11.613973,20.9355092 11.1166239,20.9932725 L11,21 L5.24145,21 C4.30065,21 3.81071515,19.9079962 4.3861123,19.2076023 L4.46363,19.1222 L8.58581,15 L5.00003,15 C4.44774,15 4.00003,14.5523 4.00003,14 C4.00003,13.48715 4.38606566,13.0644908 4.8834079,13.0067275 L5.00003,13 L10.7586,13 Z M17,4 C17.5523,4 18,4.44772 18,5 L18,17.414 L19.1213,16.2927 C19.5119,15.9022 20.145,15.9022 20.5356,16.2927 C20.9261,16.6832 20.9261,17.3164 20.5356,17.7069 L17.7071,20.5354 C17.3166,20.9259 16.6834,20.9259 16.2929,20.5354 L13.4645,17.7069 C13.074,17.3164 13.074,16.6832 13.4645,16.2927 C13.855,15.9022 14.4882,15.9022 14.8787,16.2927 L16,17.414 L16,5 C16,4.44772 16.4477,4 17,4 Z M8.00003,3 C8.674326,3 9.28067533,3.39562382 9.55608491,4.00153967 L9.60994,4.13453 L11.9418,10.6637 C12.1275,11.1838 11.8565,11.756 11.3364,11.9417 C10.85345,12.1142286 10.3254908,11.8927974 10.1038503,11.443863 L10.0583,11.3363 L9.58102,10 L6.41903,10 L5.94177,11.3363 C5.75602,11.8564 5.1838,12.1275 4.66369,11.9417 C4.18073071,11.7692643 3.91252214,11.2635709 4.02540056,10.7757876 L4.05829,10.6637 L6.39012,4.13453 C6.63311,3.45416 7.27757,3 8.00003,3 Z M8.00003,5.57321 L7.13332,8 L8.86674,8 L8.00003,5.57321 Z" fill="currentColor"/></svg></span><span>Nomenclaturas</span></a>
          <a href="#" data-view="chat"><span class="nav-icon">✦</span><span>Asistente</span></a>
        </nav>
        <div class="sidebar-footer">
          <button id="toggleSidebar" class="sidebar-toggle" title="Ocultar menu">‹</button>
        </div>
      </aside>
      <main class="content">
        <header class="header">
          <div>
            <h1 id="pageTitle">Linaje de Datos</h1>
            <p class="subtitle" id="targetLabel">Actualizado: 3 de julio de 2026</p>
          </div>
        </header>
        <section class="workspace">
          <div class="viewer-shell" id="scrollArea">
            <div class="toolbar global-toolbar">
              <div class="toolbar-controls">
                <button class="toolbar-button" id="clearTableSearch" title="Mostrar todos los linajes">Todas</button>
                <label class="global-search">
                  <span>Tabla</span>
                  <input id="tableSearch" list="tableOptions" placeholder="Buscar tabla..." autocomplete="off" />
                  <datalist id="tableOptions"></datalist>
                </label>
                <button class="toolbar-button" id="reset">Restablecer layout</button>
                <div class="zoom-controls">
                  <button id="zoomOut" title="Alejar">−</button>
                  <span id="zoomPct">100%</span>
                  <button id="zoomIn" title="Acercar">+</button>
                </div>
                <button class="toolbar-button" id="downloadCsv" title="Descargar linaje CSV">CSV</button>
              </div>
              <div class="legend">
                <span class="mode-pill" id="relMode">Vista linaje</span>
                <section class="counts" aria-label="Conteos de relaciones">
                  <div class="count up"><b id="cUp">0</b><span>Upstream</span></div>
                  <div class="count down"><b id="cDown">0</b><span>Downstream</span></div>
                  <div class="count nb"><b id="cNb">0</b><span>Neighborhood</span></div>
                </section>
              </div>
            </div>
            <div class="frame-wrap" id="frameWrap"><iframe id="viewer" title="Vista seleccionada" allow="webgpu"></iframe></div>
          </div>
        </section>
        <div class="home-mount" id="homeMount" hidden></div>
        <div class="inventario-mount" id="inventarioMount" hidden></div>
        <div class="documentacion-mount" id="documentacionMount" hidden></div>
        <div class="nomenclaturas-mount" id="nomenclaturasMount" hidden></div>
        <div class="chat-mount" id="chatMount" hidden></div>
      </main>
    </div>`;

  const elements = {
    app: root.querySelector("#appShell"),
    pageTitle: root.querySelector("#pageTitle"),
    targetLabel: root.querySelector("#targetLabel"),
    counts: root.querySelector(".counts"),
    cUp: root.querySelector("#cUp"),
    cDown: root.querySelector("#cDown"),
    cNb: root.querySelector("#cNb"),
    toolbar: root.querySelector(".global-toolbar"),
    input: root.querySelector("#tableSearch"),
    options: root.querySelector("#tableOptions"),
    relMode: root.querySelector("#relMode"),
    workspace: root.querySelector(".workspace"),
    homeMount: root.querySelector("#homeMount"),
    frameWrap: root.querySelector("#frameWrap"),
    inventarioMount: root.querySelector("#inventarioMount"),
    documentacionMount: root.querySelector("#documentacionMount"),
    nomenclaturasMount: root.querySelector("#nomenclaturasMount"),
    chatMount: root.querySelector("#chatMount"),
    viewer: root.querySelector("#viewer"),
    scrollArea: root.querySelector("#scrollArea"),
    navLinks: Array.from(root.querySelectorAll(".nav a[data-view]")),
    clearSearch: root.querySelector("#clearTableSearch"),
    reset: root.querySelector("#reset"),
    zoomOut: root.querySelector("#zoomOut"),
    zoomIn: root.querySelector("#zoomIn"),
    zoomPct: root.querySelector("#zoomPct"),
    downloadCsv: root.querySelector("#downloadCsv")
  };

  root.querySelector("#toggleSidebar").addEventListener("click", function toggleSidebar() {
    elements.app.classList.toggle("sidebar-collapsed");
    this.textContent = elements.app.classList.contains("sidebar-collapsed") ? "›" : "‹";
  });

  return {
    ...elements,
    setActive(view) {
      elements.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === view));
      elements.app.classList.toggle("mode-model", view === "modelo");
      elements.app.classList.toggle("mode-lineage", view === "linaje");
      elements.app.classList.toggle("mode-inventario", view === "inventario");
      elements.app.classList.toggle("mode-documentacion", view === "documentacion");
      elements.app.classList.toggle("mode-nomenclaturas", view === "nomenclaturas");
      elements.app.classList.toggle("mode-home", view === "inicio");
      elements.app.classList.toggle("mode-chat", view === "chat");
      const fullPageViews = ["inventario", "documentacion", "nomenclaturas", "inicio", "chat"];
      const isFullPage = fullPageViews.includes(view);
      elements.workspace.hidden = isFullPage;
      elements.scrollArea.hidden = isFullPage;
      elements.homeMount.hidden = view !== "inicio";
      elements.inventarioMount.hidden = view !== "inventario";
      elements.documentacionMount.hidden = view !== "documentacion";
      elements.nomenclaturasMount.hidden = view !== "nomenclaturas";
      elements.chatMount.hidden = view !== "chat";
      if (view !== "modelo") {
        elements.app.classList.remove("model-expanded");
      }
    },
    setModelExpanded(expanded) {
      elements.app.classList.toggle("model-expanded", expanded);
    },
    onNavigate(callback) {
      elements.navLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
          event.preventDefault();
          callback(link.dataset.view);
        });
      });
    },
    setCounts(counts) {
      elements.cUp.textContent = counts?.upstream ?? 0;
      elements.cDown.textContent = counts?.downstream ?? 0;
      elements.cNb.textContent = counts?.neighborhood ?? 0;
    }
  };
}
