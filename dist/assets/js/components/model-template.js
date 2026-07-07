export function createModelDocument() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Modelo · Coinpro Data Vault</title>
  <link rel="stylesheet" href="assets/css/model.css" />
  <link rel="stylesheet" href="assets/css/embed-overrides.css" />
</head>
<body>
<div class="diagram-panel" aria-label="Entity relationship diagram">
      <div class="diagram-toolbar">
        <div class="diagram-toolbar-right">
          <div class="view-controls" aria-label="Vistas del modelo">
            <label class="view-select-label">
              <span>Vista</span>
              <select id="model-view-select"></select>
            </label>
            <button class="zoom-button view-new-button" id="new-view-button" type="button">
              Nueva vista
            </button>
            <button class="zoom-button view-reset-button" id="reset-view-layout-button" type="button">
              Restablecer layout
            </button>
            <div class="view-table-controls">
              <button class="zoom-button view-table-button" id="view-table-button" type="button" aria-haspopup="true" aria-expanded="false">
                Tablas
              </button>
              <div class="view-table-menu" id="view-table-menu" hidden>
                <div class="view-table-menu-head">Tablas de la vista</div>
                <div class="view-table-options" id="view-table-options"></div>
              </div>
            </div>
          </div>
          <button class="zoom-button edit-mode-button" id="edit-mode-button" type="button" aria-pressed="false">
            Edicion
          </button>
          <button class="zoom-button relation-highlight-button" id="relation-highlight-button" type="button" aria-pressed="false">
            Relaciones
          </button>
          <div class="color-controls" aria-label="Table color controls">
            <button class="zoom-button color-button" id="table-color-button" type="button" aria-haspopup="true" aria-expanded="false">
              Color
            </button>
            <div class="color-menu" id="table-color-menu" hidden>
              <button class="color-swatch" type="button" data-color-value="#ff3b0a" style="--swatch:#ff3b0a" aria-label="Red"></button>
              <button class="color-swatch" type="button" data-color-value="#ff7a00" style="--swatch:#ff7a00" aria-label="Orange"></button>
              <button class="color-swatch" type="button" data-color-value="#ffb703" style="--swatch:#ffb703" aria-label="Yellow"></button>
              <button class="color-swatch" type="button" data-color-value="#1db954" style="--swatch:#1db954" aria-label="Green"></button>
              <button class="color-swatch" type="button" data-color-value="#0096c7" style="--swatch:#0096c7" aria-label="Blue"></button>
              <button class="color-swatch" type="button" data-color-value="#7b2cbf" style="--swatch:#7b2cbf" aria-label="Violet"></button>
              <button class="color-swatch" type="button" data-color-value="#e83e8c" style="--swatch:#e83e8c" aria-label="Pink"></button>
              <button class="color-swatch" type="button" data-color-value="#18d7e9" style="--swatch:#18d7e9" aria-label="Cyan"></button>
              <label class="hex-color-field">
                <span>HEX</span>
                <input id="table-color-hex" type="text" maxlength="7" inputmode="text" placeholder="#ff3b0a" />
              </label>
              <button class="color-apply" type="button" id="table-color-apply">Aplicar</button>
              <button class="color-clear" type="button" data-color-clear="true">Sin color</button>
            </div>
          </div>
          <div class="zoom-controls" aria-label="Zoom controls">
            <button class="zoom-button expand-diagram-button" id="expand-diagram-button" type="button" aria-label="Expandir modelo" title="Expandir modelo">⛶</button>
            <button class="zoom-button" data-zoom-action="out" type="button" aria-label="Zoom out">-</button>
            <button class="zoom-button zoom-readout" data-zoom-action="reset" type="button" aria-label="Reset zoom">100%</button>
            <button class="zoom-button" data-zoom-action="in" type="button" aria-label="Zoom in">+</button>
          </div>
          <div class="relation-controls" aria-label="Relation controls">
            <button class="zoom-button relation-delete-button" id="delete-relation-button" type="button" disabled>
              Borrar relacion
            </button>
          </div>
          <div class="group-controls" aria-label="Group controls">
            <button class="zoom-button group-button" id="group-tables-button" type="button" disabled>
              Agrupar
            </button>
            <button class="zoom-button group-button" id="delete-group-button" type="button" disabled>
              Eliminar grupo
            </button>
          </div>
        </div>
      </div>

      <div class="diagram-viewport">
        <div class="diagram-scene">
          <svg viewBox="0 0 860 540" preserveAspectRatio="none" role="img" aria-hidden="true" class="diagram-lines"></svg>
        </div>
      </div>
    </div>
  <script type="module" src="assets/js/components/modeler.js"><\/script>
</body>
</html>`;
}
