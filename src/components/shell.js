export function createShell(root) {
  root.innerHTML = `
    <div class="app" id="appShell">
      <aside class="sidebar">
        <div class="brand"><div class="mark" aria-hidden="true"><span class="data-cube"><i></i><i></i><i></i></span></div><span class="brand-name">Plataforma de Datos</span></div>
        <nav class="nav" aria-label="Navegacion principal">
          <a class="active" href="#" data-view="inicio"><span>⌂</span><span>Inicio</span></a>
          <a href="#" data-view="modelo"><span>▣</span><span>Modelo</span></a>
          <a href="#" data-view="linaje"><span>⌘</span><span>Linaje</span></a>
          <a href="#" data-view="chat"><span>✦</span><span>Chat</span></a>
        </nav>
        <div class="sidebar-footer">
          <button id="toggleSidebar" class="sidebar-toggle" title="Ocultar menu">‹</button>
        </div>
      </aside>
      <main class="content">
        <header class="header">
          <div>
            <h1 id="pageTitle">Linaje de datos global</h1>
            <p class="subtitle">Tabla objetivo: <code id="targetLabel">Coinpro - visor global</code></p>
          </div>
        </header>
        <section class="counts" aria-label="Conteos de relaciones">
          <div class="count up"><b id="cUp">0</b><span>Upstream</span></div>
          <div class="count down"><b id="cDown">0</b><span>Downstream</span></div>
          <div class="count nb"><b id="cNb">0</b><span>Neighborhood</span></div>
        </section>
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
                <span><i class="pill green"></i>Origen raw</span>
                <span><i class="pill blue"></i>Staging DV</span>
                <span><i class="pill purple"></i>Delta / Satelite</span>
                <span><i class="line-sample"></i>Mapeo directo</span>
                <span><i class="line-sample dashed"></i>Hash / transformacion</span>
                <span class="mode-pill" id="relMode">Vista linaje</span>
              </div>
            </div>
            <div class="frame-wrap" id="frameWrap"><iframe id="viewer" title="Vista seleccionada"></iframe></div>
          </div>
        </section>
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
    frameWrap: root.querySelector("#frameWrap"),
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
      elements.app.classList.toggle("mode-home", view === "inicio");
      elements.app.classList.toggle("mode-chat", view === "chat");
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
