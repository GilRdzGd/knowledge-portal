export function createLineageDocument(dataPath) {
  const encodedPath = encodeURIComponent(dataPath);
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Linaje de datos</title>
  <link rel="stylesheet" href="assets/css/lineage.css" />
  <link rel="stylesheet" href="assets/css/embed-overrides.css" />
</head>
<body>
<div class="app" id="app">
  <aside class="sidebar">
    <div class="brand"><div class="mark" aria-hidden="true"><span class="data-cube"><i></i><i></i><i></i></span></div><span>Plataforma de Datos</span></div>
    <nav class="nav">
      <a href="#"><span>⌂</span><span>Inicio</span></a>
      <a href="#"><span>▣</span><span>Modelo</span></a>
      <a class="active" href="#"><span>⌘</span><span>Linaje</span></a>
      <a href="#"><span>✦</span><span>Chat</span></a>
    </nav>
    <div class="sidebar-footer">
      <button id="toggleSidebar" class="sidebar-toggle" title="Ocultar menú">‹</button>
    </div>
  </aside>
  <main>
    <section class="content">
      <div class="header">
        <div>
          <h1>Linaje de datos a nivel de campo</h1>
          <p class="subtitle">Actualizado: 3 de julio de 2026</p>
        </div>
        <div class="actions"></div>
      </div>
      <div class="counts">
        <div class="count up"><b id="cUp">0</b><span>Upstream</span></div>
        <div class="count down"><b id="cDown">0</b><span>Downstream</span></div>
        <div style="display:none"><b id="cNb">0</b></div>
      </div>
      <div class="workspace detail-collapsed" id="workspace">
        <button class="detail-toggle" id="toggleDetail" title="Ocultar detalle">&gt;</button>
        <div class="canvas-shell" id="scrollArea">
          <div class="toolbar global-toolbar">
            <div class="toolbar-controls">
              <button class="toolbar-reset" id="clearTableSearch" title="Mostrar todas las tablas">Todas</button>
              <label class="global-search"><span>Tabla</span><input id="tableSearch" list="tableOptions" placeholder="Buscar tabla..." autocomplete="off"><datalist id="tableOptions"></datalist></label>
              <button class="toolbar-reset" id="reset">Restablecer layout</button>
              <div class="zoom-controls">
                <button id="zoomOut" title="Alejar">−</button>
                <span id="zoomPct">100%</span>
                <button id="zoomIn" title="Acercar">+</button>
              </div>
              <button class="toolbar-reset" id="downloadCsv" title="Descargar linaje CSV">CSV</button>
            </div>
            <div class="legend">
              <span><i class="pill" style="background:var(--green)"></i>Origen raw</span>
              <span><i class="pill" style="background:var(--blue)"></i>Staging DV</span>
              <span><i class="pill" style="background:var(--purple)"></i>Delta / Satélite</span>
              <span><i class="line-sample"></i>Mapeo directo</span>
              <span><i class="line-sample dashed"></i>Hash / transformación</span>
              <span class="mode-pill" id="relMode">Vista tabla</span>
            </div>
          </div>
          <div class="canvas" id="canvas">
            <svg class="links" id="links"></svg>
          </div>
        </div>
        <aside class="side" id="side">
          <div class="side-head"><p class="side-title">Detalle del campo</p><span class="badge" id="detailBadge">—</span></div>
          <div class="field-card"><strong id="dFull">—</strong><span id="dCtx"></span></div>
          <div class="section">
            <h3>Propiedades</h3>
            <div class="kv"><span>Campo</span><strong id="dName">—</strong></div>
            <div class="kv"><span>Tabla</span><strong id="dTable">—</strong></div>
            <div class="kv"><span>Tipo</span><strong id="dType">—</strong></div>
            <div class="kv"><span>Descripción</span><strong id="dDescription">—</strong></div>
          </div>
          <div class="section"><h3>Origen del campo (upstream)</h3><div class="path-list" id="dOrigins"></div></div>
          <div class="section"><h3>Transformación aplicada</h3><div class="formula" id="dFormula">—</div></div>
          <div class="section"><h3>Impacto descendente (downstream)</h3><div class="path-list" id="dImpact"></div></div>
        </aside>
      </div>
      <div style="display:none">
        <div id="nbHead"></div>
        <div id="nbToggle"></div>
        <div id="nbBody"></div>
      </div>
    </section>
  </main>
</div>
  <script type="module" src="assets/js/components/lineage-renderer.js?data=${encodedPath}"><\/script>
</body>
</html>`;
}
