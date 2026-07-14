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
          <button class="zoom-button view-reset-button" id="reset-view-layout-button" type="button" aria-label="Restablecer layout" title="Restablecer layout">
            <svg class="layout-button-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
              <path d="M40.5 5.5h-33a2 2 0 0 0-2 2v33a2 2 0 0 0 2 2h33a2 2 0 0 0 2-2v-33a2 2 0 0 0-2-2Z"/>
              <path d="M24 5.5v37"/>
              <path d="M42.5 24H24"/>
            </svg>
          </button>
          <button class="zoom-button relation-highlight-button" id="relation-highlight-button" type="button" aria-pressed="false" aria-label="Resaltar relaciones" title="Resaltar relaciones">
            <svg class="relation-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M10.0464 14C8.54044 12.4882 8.67609 9.90087 10.3494 8.22108L15.197 3.35462C16.8703 1.67483 19.4476 1.53865 20.9536 3.05046C22.4596 4.56228 22.3239 7.14956 20.6506 8.82935L18.2268 11.2626"/>
              <path d="M13.9536 10C15.4596 11.5118 15.3239 14.0991 13.6506 15.7789L11.2268 18.2121L8.80299 20.6454C7.12969 22.3252 4.55237 22.4613 3.0464 20.9495C1.54043 19.4377 1.67609 16.8504 3.34939 15.1706L5.77323 12.7373"/>
            </svg>
          </button>
          <button class="zoom-button expand-diagram-button" id="expand-diagram-button" type="button" aria-label="Expandir modelo" title="Expandir modelo">
            <svg class="aspect-button-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path fill-rule="evenodd" d="M1.667563 14.999001H3.509521C3.784943 14.999001 4 15.222859 4 15.499001C4 15.767068 3.780405 15.999001 3.509521 15.999001H.490479C.354351 15.999001.232969 15.944316.145011 15.855661C.056625 15.763694 0 15.642369 0 15.508523V12.48948C0 12.214059.223858 11.999001.5 11.999001C.768066 11.999001 1 12.218596 1 12.48948V14.252351L5.779724 9.472627C5.975228 9.277123 6.284966 9.283968 6.480228 9.47923C6.66978 9.668781 6.678447 9.988118 6.486831 10.179734L1.667563 14.999001ZM14.330152 14.999001H12.488194C12.212773 14.999001 11.997715 15.222859 11.997715 15.499001C11.997715 15.767068 12.21731 15.999001 12.488194 15.999001H15.507237C15.643364 15.999001 15.764746 15.944316 15.852704 15.855661C15.94109 15.763694 15.997715 15.642369 15.997715 15.508523V12.48948C15.997715 12.214059 15.773858 11.999001 15.497715 11.999001C15.229649 11.999001 14.997715 12.218596 14.997715 12.48948V14.252351L10.217991 9.472627C10.022487 9.277123 9.712749 9.283968 9.517487 9.47923C9.327935 9.668781 9.319269 9.988118 9.510884 10.179734L14.330152 14.999001ZM1.667563 1H3.509521C3.784943 1 4 .776142 4 .5C4 .231934 3.780405 0 3.509521 0H.490479C.354351 0 .232969.054685.145011.14334C.056625.235308 0 .356632 0 .490479V3.509521C0 3.784943.223858 4 .5 4C.768066 4 1 3.780405 1 3.509521V1.74665L5.779724 6.526374C5.975228 6.721878 6.284966 6.715034 6.480228 6.519772C6.66978 6.33022 6.678447 6.010883 6.486831 5.819268L1.667563 1ZM14.251065 1H12.488194C12.212773 1 11.997715.776142 11.997715.5C11.997715.231934 12.21731 0 12.488194 0H15.507237C15.643364 0 15.764746.054685 15.852704.14334C15.94109.235308 15.997715.356632 15.997715.490479V3.509521C15.997715 3.784943 15.773858 4 15.497715 4C15.229649 4 14.997715 3.780405 14.997715 3.509521V1.667563L10.178448 6.486831C9.982944 6.682335 9.673206 6.67549 9.477943 6.480228C9.288392 6.290677 9.279725 5.97134 9.471341 5.779724L14.251065 1Z"/>
            </svg>
          </button>
          <div class="zoom-controls" aria-label="Zoom controls">
            <button class="zoom-button" data-zoom-action="out" type="button" aria-label="Zoom out">-</button>
            <button class="zoom-button zoom-readout" data-zoom-action="reset" type="button" aria-label="Reset zoom">100%</button>
            <button class="zoom-button" data-zoom-action="in" type="button" aria-label="Zoom in">+</button>
          </div>
          <button class="zoom-button export-png-button" id="export-png-button" type="button" aria-label="Descargar imagen PNG del diagrama" title="Descargar imagen PNG del diagrama">
            <svg class="download-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M17 9.00195C19.175 9.01406 20.3529 9.11051 21.1213 9.8789C22 10.7576 22 12.1718 22 15.0002V16.0002C22 18.8286 22 20.2429 21.1213 21.1215C20.2426 22.0002 18.8284 22.0002 16 22.0002H8C5.17157 22.0002 3.75736 22.0002 2.87868 21.1215C2 20.2429 2 18.8286 2 16.0002L2 15.0002C2 12.1718 2 10.7576 2.87868 9.87889C3.64706 9.11051 4.82497 9.01406 7 9.00195"/>
              <path d="M12 2V15M12 15L9 11.5M12 15L15 11.5"/>
            </svg>
          </button>
          <span class="toolbar-separator" aria-hidden="true"></span>
          <button class="zoom-button view-save-button" id="save-view-button" type="button" hidden aria-label="Guardar vista" title="Guardar vista">
            <svg class="save-button-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
              <path d="M51 53.48H10.52V13A2.48 2.48 0 0 1 13 10.52h33.07l7.41 6.4V51A2.48 2.48 0 0 1 51 53.48Z"/>
              <rect x="21.5" y="10.52" width="21.01" height="15.5"/>
              <rect x="17.86" y="36.46" width="28.28" height="17.02"/>
            </svg>
          </button>
          <button class="zoom-button edit-mode-button" id="edit-mode-button" type="button" aria-pressed="false" aria-label="Activar edicion" title="Activar edicion">
            <svg class="edit-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M21.2799 6.40005 11.7399 15.94C10.7899 16.89 7.96987 17.33 7.33987 16.7 6.70987 16.07 7.13987 13.25 8.08987 12.3L17.6399 2.75002C17.8754 2.49308 18.1605 2.28654 18.4781 2.14284 18.7956 1.99914 19.139 1.92124 19.4875 1.9139 19.8359 1.90657 20.1823 1.96991 20.5056 2.10012 20.8289 2.23033 21.1225 2.42473 21.3686 2.67153 21.6147 2.91833 21.8083 3.21243 21.9376 3.53609 22.0669 3.85976 22.1294 4.20626 22.1211 4.55471 22.1128 4.90316 22.0339 5.24635 21.8894 5.5635 21.7448 5.88065 21.5375 6.16524 21.2799 6.40005Z"/>
              <path d="M11 4H6C4.93913 4 3.92178 4.42142 3.17163 5.17157 2.42149 5.92172 2 6.93913 2 8v10c0 1.0609.42149 2.0783 1.17163 2.8284C3.92178 21.5786 4.93913 22 6 22h11c2.21 0 3-1.8 3-4v-5"/>
            </svg>
          </button>
          <span class="toolbar-separator edit-toolbar-separator" aria-hidden="true"></span>
          <button class="zoom-button view-new-button" id="new-view-button" type="button" aria-label="Nueva vista" title="Nueva vista">
            <svg class="new-view-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
              <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(2 2)">
                <path d="m16.5 5.5v-3c0-1.1045695-.8954305-2-2-2h-3"/>
                <path d="m8.5 10.5v-4"/>
                <path d="m6.5 8.5h4"/>
                <path d="m16.5 11.5v3c0 1.1045695-.8954305 2-2 2h-3m-6-16h-3c-1.1045695 0-2 .8954305-2 2v3m5 11h-3c-1.1045695 0-2-.8954305-2-2v-3"/>
              </g>
            </svg>
          </button>
          <div class="color-controls" aria-label="Table color controls">
            <button class="zoom-button color-button" id="table-color-button" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Color" title="Color">
              <svg class="color-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
                <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3)">
                  <path d="m14 1c.8284271.82842712.8284271 2.17157288 0 3l-9.5 9.5-4 1 1-3.9436508 9.5038371-9.55252193c.7829896-.78700064 2.0312313-.82943964 2.864366-.12506788z"/>
                  <path d="m12.5 3.5 1 1"/>
                </g>
              </svg>
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
          <div class="relation-controls" aria-label="Relation controls">
            <button class="zoom-button relation-delete-button" id="delete-relation-button" type="button" disabled aria-label="Eliminar relacion" title="Eliminar relacion">
              <svg class="broken-link-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
                <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(2 2)">
                  <path d="m7.5 5.32842712 1-1c1.1045695-1.10456949 2.8954305-1.10456949 4 0 1.1045695 1.1045695 1.1045695 2.89543051 0 4l-1 1m-3.17157288 3.17157288-1 1c-1.10456949 1.1045695-2.8954305 1.1045695-4 0-1.10456949-1.1045695-1.10456949-2.8954305 0-4l1-1"/>
                  <path d="m5.5 3.5v-3"/>
                  <path d="m.5 5.5h3"/>
                  <path d="m11.5 16.5v-3"/>
                  <path d="m13.5 11.5h3"/>
                </g>
              </svg>
            </button>
          </div>
          <div class="group-controls" aria-label="Group controls">
            <button class="zoom-button group-button" id="group-tables-button" type="button" disabled aria-label="Agrupar" title="Agrupar">
              <svg class="group-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
                <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(3.5 3.5)">
                  <path d="m6.00772212.56701593-5 2.85714286c-.62314999.35608571-1.00772212 1.01877259-1.00772212 1.73648628v6.83935493c0 1.1045695.8954305 2 2 2h10c1.1045695 0 2-.8954305 2-2v-6.83935493c0-.71771369-.3845721-1.38040057-1.0077221-1.73648628l-5.00000002-2.85714286c-.61486534-.35135162-1.36969042-.35135162-1.98455576 0z"/>
                  <path d="m7 5v6"/>
                  <path d="m4 8h6"/>
                </g>
              </svg>
            </button>
            <button class="zoom-button group-button" id="delete-group-button" type="button" disabled aria-label="Eliminar grupo" title="Eliminar grupo">
              <svg class="mail-remove-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
                <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(3.5 3.5)">
                  <path d="m6.00772212.56701593-5 2.85714286c-.62314999.35608571-1.00772212 1.01877259-1.00772212 1.73648628v6.83935493c0 1.1045695.8954305 2 2 2h10c1.1045695 0 2-.8954305 2-2v-6.83935493c0-.71771369-.3845721-1.38040057-1.0077221-1.73648628l-5.00000002-2.85714286c-.61486534-.35135162-1.36969042-.35135162-1.98455576 0z"/>
                  <path d="m4 8h6"/>
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="diagram-viewport">
        <div class="diagram-scene">
          <svg viewBox="0 0 860 540" preserveAspectRatio="none" role="img" aria-hidden="true" class="diagram-lines"></svg>
        </div>
      </div>
      <aside class="dbml-editor-panel" id="dbml-editor-panel" aria-label="Editor DBML">
        <div class="dbml-editor-separator" aria-hidden="true"></div>
        <header class="dbml-editor-header">
          <h2>Editor</h2>
          <button class="dbml-editor-run" id="dbml-run-button" type="button">
            <span aria-hidden="true">▶</span>
            Ejecutar
          </button>
          <button class="dbml-editor-collapse" id="dbml-editor-collapse" type="button" aria-label="Contraer editor" title="Contraer editor">›</button>
        </header>
        <div class="dbml-editor-body">
          <div class="dbml-line-numbers" id="dbml-line-numbers" aria-hidden="true"></div>
          <div class="dbml-code-wrap">
            <pre class="dbml-highlight" id="dbml-highlight" aria-hidden="true"></pre>
            <textarea class="dbml-editor-input" id="dbml-editor-input" spellcheck="false" aria-label="Codigo DBML"></textarea>
          </div>
        </div>
      </aside>
    </div>
  <script type="module" src="assets/js/components/modeler.js"><\/script>
</body>
</html>`;
}
