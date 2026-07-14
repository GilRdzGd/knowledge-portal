/*
 * Interactive ER / Data Vault modeler.
 *
 * Relationships follow the conventions of contemporary data-modeling tools
 * (dbdiagram, DrawSQL, DataGrip): connections are drawn column-to-column
 * (FK -> PK), leave the left/right side of a table at the exact row of the
 * field involved, route orthogonally, and use crow's-foot notation
 * (the "many" fork on the foreign key, the "one" bar on the primary key).
 */

// ------------------------------------------------------------------ DOM refs
const diagramPanel = document.querySelector(".diagram-panel");
const diagramViewport = document.querySelector(".diagram-viewport");
const diagramScene = document.querySelector(".diagram-scene");
const zoomButtons = Array.from(document.querySelectorAll("[data-zoom-action]"));
const zoomReadout = document.querySelector(".zoom-readout");
const expandDiagramButton = document.querySelector("#expand-diagram-button");
const editModeButton = document.querySelector("#edit-mode-button");
const relationHighlightButton = document.querySelector("#relation-highlight-button");
const viewControls = document.querySelector(".view-controls");
const modelViewSelect = document.querySelector("#model-view-select");
const newViewButton = document.querySelector("#new-view-button");
const resetViewLayoutButton = document.querySelector("#reset-view-layout-button");
const saveViewButton = document.querySelector("#save-view-button");
const exportPngButton = document.querySelector("#export-png-button");
const viewTableControls = document.querySelector(".view-table-controls");
const viewTableButton = document.querySelector("#view-table-button");
const viewTableMenu = document.querySelector("#view-table-menu");
const viewTableOptions = document.querySelector("#view-table-options");
const colorControls = document.querySelector(".color-controls");
const tableColorButton = document.querySelector("#table-color-button");
const tableColorMenu = document.querySelector("#table-color-menu");
const colorSwatches = Array.from(document.querySelectorAll("[data-color-value]"));
const clearColorButton = document.querySelector("[data-color-clear]");
const tableColorHexInput = document.querySelector("#table-color-hex");
const tableColorApplyButton = document.querySelector("#table-color-apply");
const groupControls = document.querySelector(".group-controls");
const groupTablesButton = document.querySelector("#group-tables-button");
const deleteGroupButton = document.querySelector("#delete-group-button");
const relationControls = document.querySelector(".relation-controls");
const deleteRelationButton = document.querySelector("#delete-relation-button");
const dbmlEditorCollapseButton = document.querySelector("#dbml-editor-collapse");
const dbmlEditorInput = document.querySelector("#dbml-editor-input");
const dbmlEditorHighlight = document.querySelector("#dbml-highlight");
const dbmlLineNumbers = document.querySelector("#dbml-line-numbers");
const dbmlRunButton = document.querySelector("#dbml-run-button");

const SVG_NS = "http://www.w3.org/2000/svg";

// ---------------------------------------------------------------- constants
const DEFAULT_ZOOM = 0.6;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.15;

const CARD_WIDTH = 320;
const ROW_HEIGHT = 28;
const MAX_VISIBLE_ER_FIELDS = 20;
const COLUMN_X = [80, 580, 1080, 1580];
const COLUMN_TOP = 120;
const CARD_GAP = 60;
const SCENE_PADDING = 240;

const STUB = 26; // horizontal length of the connector stub leaving a table
const CORNER = 9; // radius of the rounded elbows
const STORAGE_KEY = "data-modeler-state-v8";
const DEFAULT_VIEW_ID = "default";
const SAVE_ICON_MARKUP = `
  <svg class="save-button-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <path d="M51 53.48H10.52V13A2.48 2.48 0 0 1 13 10.52h33.07l7.41 6.4V51A2.48 2.48 0 0 1 51 53.48Z"/>
    <rect x="21.5" y="10.52" width="21.01" height="15.5"/>
    <rect x="17.86" y="36.46" width="28.28" height="17.02"/>
  </svg>
`;
const RELATION_ICON_MARKUP = `
  <svg class="relation-button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M10.0464 14C8.54044 12.4882 8.67609 9.90087 10.3494 8.22108L15.197 3.35462C16.8703 1.67483 19.4476 1.53865 20.9536 3.05046C22.4596 4.56228 22.3239 7.14956 20.6506 8.82935L18.2268 11.2626"/>
    <path d="M13.9536 10C15.4596 11.5118 15.3239 14.0991 13.6506 15.7789L11.2268 18.2121L8.80299 20.6454C7.12969 22.3252 4.55237 22.4613 3.0464 20.9495C1.54043 19.4377 1.67609 16.8504 3.34939 15.1706L5.77323 12.7373"/>
  </svg>
`;
const ASPECT_ICON_MARKUP = `
  <svg class="aspect-button-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path fill-rule="evenodd" d="M1.667563 14.999001H3.509521C3.784943 14.999001 4 15.222859 4 15.499001C4 15.767068 3.780405 15.999001 3.509521 15.999001H.490479C.354351 15.999001.232969 15.944316.145011 15.855661C.056625 15.763694 0 15.642369 0 15.508523V12.48948C0 12.214059.223858 11.999001.5 11.999001C.768066 11.999001 1 12.218596 1 12.48948V14.252351L5.779724 9.472627C5.975228 9.277123 6.284966 9.283968 6.480228 9.47923C6.66978 9.668781 6.678447 9.988118 6.486831 10.179734L1.667563 14.999001ZM14.330152 14.999001H12.488194C12.212773 14.999001 11.997715 15.222859 11.997715 15.499001C11.997715 15.767068 12.21731 15.999001 12.488194 15.999001H15.507237C15.643364 15.999001 15.764746 15.944316 15.852704 15.855661C15.94109 15.763694 15.997715 15.642369 15.997715 15.508523V12.48948C15.997715 12.214059 15.773858 11.999001 15.497715 11.999001C15.229649 11.999001 14.997715 12.218596 14.997715 12.48948V14.252351L10.217991 9.472627C10.022487 9.277123 9.712749 9.283968 9.517487 9.47923C9.327935 9.668781 9.319269 9.988118 9.510884 10.179734L14.330152 14.999001ZM1.667563 1H3.509521C3.784943 1 4 .776142 4 .5C4 .231934 3.780405 0 3.509521 0H.490479C.354351 0 .232969.054685.145011.14334C.056625.235308 0 .356632 0 .490479V3.509521C0 3.784943.223858 4 .5 4C.768066 4 1 3.780405 1 3.509521V1.74665L5.779724 6.526374C5.975228 6.721878 6.284966 6.715034 6.480228 6.519772C6.66978 6.33022 6.678447 6.010883 6.486831 5.819268L1.667563 1ZM14.251065 1H12.488194C12.212773 1 11.997715.776142 11.997715.5C11.997715.231934 12.21731 0 12.488194 0H15.507237C15.643364 0 15.764746.054685 15.852704.14334C15.94109.235308 15.997715.356632 15.997715.490479V3.509521C15.997715 3.784943 15.773858 4 15.497715 4C15.229649 4 14.997715 3.780405 14.997715 3.509521V1.667563L10.178448 6.486831C9.982944 6.682335 9.673206 6.67549 9.477943 6.480228C9.288392 6.290677 9.279725 5.97134 9.471341 5.779724L14.251065 1Z"/>
  </svg>
`;
const COLOR_ICON_MARKUP = `
  <svg class="color-button-icon" viewBox="0 0 21 21" aria-hidden="true" focusable="false">
    <g fill="none" fill-rule="evenodd" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" transform="translate(3 3)">
      <path d="m14 1c.8284271.82842712.8284271 2.17157288 0 3l-9.5 9.5-4 1 1-3.9436508 9.5038371-9.55252193c.7829896-.78700064 2.0312313-.82943964 2.864366-.12506788z"/>
      <path d="m12.5 3.5 1 1"/>
    </g>
  </svg>
`;
// Cada archivo assets/data/model-schema*.json es una vista. El build genera un
// manifiesto (model-schemas.json) listando los esquemas disponibles y, por
// convencion, su archivo de configuracion/posiciones model-views*.json.
const SCHEMA_MANIFEST_PATH = "assets/data/model-schemas.json";
const FALLBACK_SCHEMAS = [
  { id: DEFAULT_VIEW_ID, name: "Modelo base", file: "model-schema.json", viewsFile: "model-views.json" },
];

// ------------------------------------------------------------------- schema
// El esquema activo se carga bajo demanda al abrir/cambiar de vista.
let schemaTables = [];
const tableById = {};
const tableByName = {};

async function fetchModelJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}: ${response.status}`);
  }
  return response.json();
}

function rebuildSchemaLookups() {
  Object.keys(tableById).forEach((key) => delete tableById[key]);
  Object.keys(tableByName).forEach((key) => delete tableByName[key]);
  schemaTables.forEach((table) => {
    tableById[table.id] = table;
    tableByName[table.title.trim().toLowerCase()] = table;
  });
}

async function loadSchemaFile(file) {
  const data = await fetchModelJson(`assets/data/${file}`);
  schemaTables = Array.isArray(data) ? data : [];
  rebuildSchemaLookups();
}

// -------------------------------------------------------------- runtime state
let zoom = DEFAULT_ZOOM;
let diagramExpanded = false;
let editModeEnabled = false;
let svg = null;
let relationships = [];
let schemaRelationships = [];
let customRelationships = [];
const deletedRelationIds = new Set();
let relationEls = [];
const fieldConnectors = [];
const routeHandles = [];
const relationRoutes = {};
let pendingConnectorId = null;
let selectedRelationId = null;
let erCards = [];
let selectedCardId = null;
const selectedCardIds = new Set();
let selectedGroupId = null;
let relationHighlightEnabled = false;
const groups = [];
const groupEls = [];
const schemaGroups = [];
const schemaGroupEls = [];
const schemaGroupHeaderEls = [];
const cardColors = {};
let viewPositions = {};
let modelViews = FALLBACK_SCHEMAS.map((view) => ({ ...view }));
let activeViewId = DEFAULT_VIEW_ID;
let viewportCentered = false;
let modelPersistTimer = 0;
// Desplazamiento de la escena para centrar el contenido cuando cabe en el
// viewport (el scroll por sí solo no puede centrar contenido más chico).
let sceneOffsetX = 0;
let sceneOffsetY = 0;
// Cache de las semillas de configuracion por vista (archivos model-views*.json).
const viewSeeds = {};

// ---------------------------------------------------------------- utilities
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function dbmlIdentifier(value) {
  const text = String(value || "").trim();
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(text) ? text : `"${text.replace(/"/g, '\\"')}"`;
}

function dbmlString(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

function unquoteDbml(value) {
  const text = String(value || "").trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    return text.slice(1, -1).replace(/\\n/g, "\n").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return text;
}

function stripInlineComment(line) {
  let quote = "";
  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index];
    if ((char === "'" || char === '"') && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
    }
    if (!quote && char === "/" && line[index + 1] === "/") {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseSettings(settingsText) {
  const settings = {};
  const text = String(settingsText || "").trim().replace(/^\[/, "").replace(/\]$/, "");
  const parts = [];
  let current = "";
  let quote = "";
  for (const char of text) {
    if ((char === "'" || char === '"') && current.at(-1) !== "\\") {
      quote = quote === char ? "" : quote || char;
    }
    if (char === "," && !quote) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  parts.forEach((part) => {
    const [rawKey, ...rest] = part.split(":");
    const key = rawKey.trim().toLowerCase();
    if (!rest.length) {
      settings[key] = true;
      return;
    }
    settings[key] = unquoteDbml(rest.join(":").trim());
  });
  return settings;
}

function dbmlTokenClass(token) {
  if (/^\/\//.test(token)) return "token-comment";
  if (/^["']/.test(token)) return "token-string";
  if (/^(Table|TableGroup|Ref|Enum|Project|Note|Indexes|indexes|pk|unique|note|headerColor|color)$/i.test(token)) {
    return "token-keyword";
  }
  if (/^(bigint|int|integer|varchar|string|text|date|datetime|timestamp|decimal|numeric|float|boolean|bool|uuid|json)$/i.test(token)) {
    return "token-type";
  }
  if (/^#[0-9a-f]{3,8}$/i.test(token)) return "token-color";
  if (/^[<>\-[\]{}():,.]+$/.test(token)) return "token-symbol";
  return "";
}

function highlightDbmlLine(line) {
  const pattern = /(\/\/.*|#[0-9a-f]{3,8}|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:Table|TableGroup|Ref|Enum|Project|Note|Indexes|indexes|pk|unique|note|headerColor|color)\b|\b(?:bigint|int|integer|varchar|string|text|date|datetime|timestamp|decimal|numeric|float|boolean|bool|uuid|json)\b|[<>\-[\]{}():,.]+)/gi;
  let output = "";
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    output += escapeHtml(line.slice(cursor, match.index));
    const token = match[0];
    const cls = dbmlTokenClass(token);
    output += cls ? `<span class="${cls}">${escapeHtml(token)}</span>` : escapeHtml(token);
    cursor = match.index + token.length;
    if (/^\/\//.test(token)) break;
  }
  output += escapeHtml(line.slice(cursor));
  return output || " ";
}

function syncDbmlEditor() {
  if (!dbmlEditorInput || !dbmlEditorHighlight || !dbmlLineNumbers) return;
  const lines = (dbmlEditorInput.value || "").split("\n");
  dbmlLineNumbers.innerHTML = lines.map((_, index) => `<span>${index + 1}</span>`).join("");
  dbmlEditorHighlight.innerHTML = lines.map(highlightDbmlLine).join("\n");
}

function fieldDbmlSettings(field) {
  const settings = [];
  const key = String(field.key || "").toUpperCase();
  if (key.includes("PK")) settings.push("pk");
  if (key.includes("UK")) settings.push("unique");
  if (field.note) settings.push(`note: '${dbmlString(field.note)}'`);
  return settings.length ? ` [${settings.join(", ")}]` : "";
}

function tableToDbml(table) {
  const lines = [`Table ${dbmlIdentifier(table.title)} [headerColor: ${table.headerColor || tableAccentColor(table.id)}] {`];
  (table.fields || []).forEach((field) => {
    lines.push(`  ${dbmlIdentifier(field.name)} ${field.type || "varchar"}${fieldDbmlSettings(field)}`);
  });
  if (table.description) {
    lines.push("");
    lines.push(`  Note: '${dbmlString(table.description)}'`);
  }
  lines.push("}");
  return lines.join("\n");
}

function splitDbmlHeader(line) {
  const match = /^(TableGroup|Table)\s+((?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_][A-Za-z0-9_]*))(?:\s+(\[[^\]]*\]))?\s*\{\s*$/i.exec(line.trim());
  if (!match) return null;
  return {
    kind: match[1].toLowerCase(),
    name: unquoteDbml(match[2].trim()),
    settings: parseSettings(match[3] || ""),
  };
}

function parseDbml(dbml) {
  const parsedTables = [];
  const tableColors = {};
  const refs = [];
  const tableGroups = [];
  const existingByName = new Map(schemaTables.map((table) => [String(table.title || "").toLowerCase(), table]));
  let current = null;

  String(dbml || "").split(/\r?\n/).forEach((rawLine) => {
    const line = stripInlineComment(rawLine).trim();
    if (!line) return;

    const header = splitDbmlHeader(line);
    if (header) {
      current = { ...header, fields: [], members: [], note: "", existing: null };
      if (header.kind === "table") {
        const existing = existingByName.get(header.name.toLowerCase());
        current.existing = existing || null;
        current.id = existing?.id || fieldSlug(header.name);
        current.tag = existing?.tag || (String(header.name).startsWith("fact_") ? "fact" : String(header.name).startsWith("dim_") ? "dimension" : "tabla");
        current.headerColor = header.settings.headercolor || existing?.headerColor || "";
        if (current.headerColor) tableColors[current.id] = current.headerColor;
      }
      return;
    }

    if (line === "}") {
      if (current?.kind === "table") {
        const existing = current.existing || {};
        parsedTables.push({
          ...existing,
          id: current.id,
          title: current.name,
          tag: current.tag,
          description: current.note || existing.description || "",
          relations: Array.isArray(existing.relations) ? existing.relations : [],
          fields: current.fields,
          modelRelations: [],
          dbmlGroup: "",
          dbmlGroupColor: "",
          headerColor: current.headerColor || "",
        });
      } else if (current?.kind === "tablegroup") {
        tableGroups.push({
          name: current.name,
          color: current.settings.color || schemaGroupColor(tableGroups.length),
          note: current.settings.note || current.note || "",
          members: current.members,
        });
      }
      current = null;
      return;
    }

    const refMatch = /^Ref\s*:\s*([A-Za-z0-9_".]+)\.([A-Za-z0-9_".]+)\s*>\s*([A-Za-z0-9_".]+)\.([A-Za-z0-9_".]+)/i.exec(line);
    if (refMatch) {
      refs.push({
        childTable: unquoteDbml(refMatch[1]),
        childField: unquoteDbml(refMatch[2]),
        parentTable: unquoteDbml(refMatch[3]),
        parentField: unquoteDbml(refMatch[4]),
      });
      return;
    }

    if (!current) return;
    const noteMatch = /^Note\s*:\s*(.+)$/i.exec(line);
    if (noteMatch) {
      current.note = unquoteDbml(noteMatch[1].trim());
      return;
    }
    if (current.kind === "tablegroup") {
      const member = unquoteDbml(line.replace(/,$/, "").trim());
      if (member && !/[{}[\]]/.test(member)) {
        current.members.push(member);
      }
      return;
    }
    if (current.kind === "table") {
      const fieldMatch = /^("[^"]+"|'[^']+'|[A-Za-z_][A-Za-z0-9_]*)\s+([^\[\s]+(?:\([^\)]*\))?)\s*(\[[^\]]*\])?/.exec(line);
      if (!fieldMatch) return;
      const settings = parseSettings(fieldMatch[3] || "");
      const key = settings.pk ? "PK" : settings.unique ? "UK" : "";
      current.fields.push({
        key,
        name: unquoteDbml(fieldMatch[1]),
        type: fieldMatch[2],
        note: settings.note || "",
      });
    }
  });

  const byTitle = new Map(parsedTables.map((table) => [table.title.toLowerCase(), table]));
  tableGroups.forEach((group) => {
    group.members.forEach((name) => {
      const table = byTitle.get(String(name).toLowerCase());
      if (table) {
        table.dbmlGroup = group.name;
        table.dbmlGroupColor = group.color;
      }
    });
  });
  refs.forEach((ref) => {
    const child = byTitle.get(ref.childTable.toLowerCase());
    const parent = byTitle.get(ref.parentTable.toLowerCase());
    if (!child || !parent) return;
    child.modelRelations.push({
      id: `${child.id}.${ref.childField}__${parent.id}.${ref.parentField}`,
      childId: child.id,
      childField: ref.childField,
      parentId: parent.id,
      parentField: ref.parentField,
      source: "dbml-editor",
      dbmlGroup: child.dbmlGroup || "",
    });
  });

  return { tables: parsedTables, colors: tableColors };
}

function relationshipToDbml(rel) {
  const child = tableById[rel.childId];
  const parent = tableById[rel.parentId];
  if (!child || !parent || !rel.childField || !rel.parentField) return "";
  return `Ref: ${dbmlIdentifier(child.title)}.${dbmlIdentifier(rel.childField)} > ${dbmlIdentifier(parent.title)}.${dbmlIdentifier(rel.parentField)}`;
}

function tableGroupToDbml(group, options = {}) {
  const tableNames = (group.cardIds || [])
    .map((id) => tableById[id]?.title)
    .filter(Boolean)
    .map((name) => `  ${dbmlIdentifier(name)}`);
  if (!tableNames.length) return "";
  const color = group.color || options.color || schemaGroupColor(0);
  const note = options.note || `Grupo ${group.name}`;
  return [
    `TableGroup ${dbmlIdentifier(group.name || "grupo")} [color: ${color}, note: '${dbmlString(note)}'] {`,
    ...tableNames,
    "}",
  ].join("\n");
}

function activeTableGroupsDbml() {
  const blocks = [];
  if (isDefaultView()) {
    schemaGroups.forEach((group) => {
      const block = tableGroupToDbml(group, { note: `Grupo generado desde ${group.name}` });
      if (block) blocks.push(block);
    });
  }
  groups
    .filter((group) => (group.viewId || DEFAULT_VIEW_ID) === activeViewId)
    .forEach((group) => {
      const block = tableGroupToDbml(group);
      if (block) blocks.push(block);
    });
  return blocks;
}

function updateDbmlEditorFromView() {
  if (!dbmlEditorInput) return;
  try {
    const relationLines = currentRelationships().map(relationshipToDbml).filter(Boolean);
    const groupBlocks = activeTableGroupsDbml();
    dbmlEditorInput.value = [
      `// Vista: ${currentView()?.name || activeViewId}`,
      "",
      ...schemaTables.map(tableToDbml),
      groupBlocks.length ? "\n// Grupos" : "",
      ...groupBlocks,
      relationLines.length ? "\n// Relaciones" : "",
      ...relationLines,
    ].filter((line) => line !== "").join("\n\n");
    syncDbmlEditor();
  } catch (error) {
    console.warn("No se pudo generar DBML para la vista activa", error);
  }
}

async function persistActiveModelFiles() {
  if (!isLocalHost()) return;
  const view = currentView();
  const payload = {
    schemaFile: view.file,
    viewsFile: view.viewsFile || `model-views.${view.id}.json`,
    schema: schemaTablesForSave(),
    views: currentViewConfig(),
  };
  const response = await fetch("save-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function scheduleModelFilePersist() {
  if (!isLocalHost()) return;
  window.clearTimeout(modelPersistTimer);
  modelPersistTimer = window.setTimeout(() => {
    captureCurrentPositions();
    persistActiveModelFiles().catch((error) => {
      console.warn("No se pudo sincronizar model-schema desde la UI", error);
    });
  }, 300);
}

async function applyDbmlEditor() {
  if (!dbmlEditorInput || !dbmlRunButton) return;
  dbmlRunButton.classList.add("is-running");
  dbmlRunButton.disabled = true;
  const original = dbmlRunButton.textContent;
  try {
    const parsed = parseDbml(dbmlEditorInput.value);
    if (!parsed.tables.length) {
      throw new Error("No se encontraron tablas DBML validas.");
    }
    captureCurrentPositions();
    schemaTables = parsed.tables;
    rebuildSchemaLookups();
    Object.keys(cardColors).forEach((key) => delete cardColors[key]);
    Object.assign(cardColors, parsed.colors);
    const nextState = {
      ...currentViewConfig(),
      positions: sanitizePositions(viewPositions[activeViewId]),
      colors: { ...cardColors },
      customRelationships: [],
      deletedRelationIds: [],
      relationRoutes: {},
      groups: [],
      schemaGroups: [],
      zoom,
    };
    renderViewSelect();
    renderActiveSchema(nextState);
    saveState();
    await persistActiveModelFiles();
    dbmlRunButton.textContent = "Ejecutado";
  } catch (error) {
    console.error("No se pudo aplicar DBML", error);
    dbmlRunButton.textContent = "Error";
  } finally {
    setTimeout(() => {
      dbmlRunButton.classList.remove("is-running");
      dbmlRunButton.disabled = false;
      dbmlRunButton.textContent = original || "Ejecutar";
    }, 1200);
  }
}

function fieldSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function viewFileSlug(name) {
  return fieldSlug(name).replace(/-/g, "_") || `vista_${Date.now()}`;
}

function createSvg(tag) {
  return document.createElementNS(SVG_NS, tag);
}

function cardEl(tableId) {
  return document.querySelector(`[data-er-card="${tableId}"]`);
}

let modelTooltip = null;

function ensureModelTooltip() {
  if (modelTooltip) {
    return modelTooltip;
  }
  modelTooltip = document.createElement("div");
  modelTooltip.className = "model-comment-tooltip";
  modelTooltip.id = "model-comment-tooltip";
  modelTooltip.hidden = true;
  modelTooltip.setAttribute("role", "tooltip");
  document.body.appendChild(modelTooltip);
  return modelTooltip;
}

function positionModelTooltip(target) {
  const tooltip = ensureModelTooltip();
  const margin = 14;
  const offset = 10;
  const targetRect = target.getBoundingClientRect();
  const rect = tooltip.getBoundingClientRect();
  const left = Math.min(targetRect.right + offset, Math.max(margin, window.innerWidth - rect.width - margin));
  let top = targetRect.top + targetRect.height / 2 - rect.height / 2;

  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - rect.height - margin;
  }
  top = Math.max(margin, top);

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showModelTooltip(target) {
  const comment = target.dataset.tooltipComment || "";
  if (!comment.trim()) {
    return;
  }
  target.classList.add("is-comment-hovered");
  const tooltip = ensureModelTooltip();
  const title = document.createElement("strong");
  const body = document.createElement("span");
  title.textContent = target.dataset.tooltipTitle || "Comentario";
  body.textContent = comment;
  tooltip.replaceChildren(title, body);
  tooltip.hidden = false;

  positionModelTooltip(target);
}

function hideModelTooltip() {
  document.querySelectorAll(".is-comment-hovered").forEach((target) => target.classList.remove("is-comment-hovered"));
  if (modelTooltip) {
    modelTooltip.hidden = true;
  }
}

function bindCommentTooltips() {
  document.querySelectorAll("[data-model-tooltip]").forEach((target) => {
    target.addEventListener("mouseenter", () => showModelTooltip(target));
    target.addEventListener("mousemove", () => positionModelTooltip(target));
    target.addEventListener("mouseleave", hideModelTooltip);
    target.addEventListener("focus", () => showModelTooltip(target));
    target.addEventListener("blur", hideModelTooltip);
  });
}

function metrics(card) {
  return {
    left: Number.parseFloat(card.style.left || "0"),
    top: Number.parseFloat(card.style.top || "0"),
    width: card.offsetWidth,
    height: card.offsetHeight,
  };
}

// ----------------------------------------------------- relationship derivation
function buildSchemaGroups() {
  const grouped = new Map();
  schemaTables.forEach((table) => {
    if (!table.dbmlGroup) {
      return;
    }
    if (!grouped.has(table.dbmlGroup)) {
      grouped.set(table.dbmlGroup, {
        id: `schema-group-${fieldSlug(table.dbmlGroup)}`,
        name: table.dbmlGroup,
        cardIds: [],
        color: table.dbmlGroupColor || schemaGroupColor(grouped.size),
        locked: true,
      });
    }
    if (table.dbmlGroupColor) {
      grouped.get(table.dbmlGroup).color = table.dbmlGroupColor;
    }
    grouped.get(table.dbmlGroup).cardIds.push(table.id);
  });
  schemaGroups.splice(0, schemaGroups.length, ...grouped.values());
}

function schemaGroupColor(index) {
  const colors = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#4f46e5", "#0f766e"];
  return colors[index % colors.length];
}

// Relationships can come from DBML-enriched modelRelations or, as fallback,
// from field notes that mention "FK a <table>.<column>".
function deriveRelationships() {
  const result = [];
  const seen = new Set();

  schemaTables.forEach((child) => {
    (child.modelRelations || []).forEach((rel) => {
      if (!tableById[rel.childId] || !tableById[rel.parentId]) {
        return;
      }
      const id = rel.id || `${rel.childId}.${rel.childField}__${rel.parentId}.${rel.parentField}`;
      if (seen.has(id)) {
        return;
      }
      seen.add(id);
      result.push({
        id,
        childId: rel.childId,
        childField: rel.childField,
        parentId: rel.parentId,
        parentField: rel.parentField,
        source: rel.source || "schema",
        dbmlGroup: rel.dbmlGroup || child.dbmlGroup || "",
      });
    });

    if (child.modelRelations?.length) {
      return;
    }

    (child.fields || []).forEach((field) => {
      const match = /FK a\s+([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)/i.exec(field.note || "");
      if (!match) {
        return;
      }

      const parent = tableByName[match[1].trim().toLowerCase()];
      if (!parent || parent.id === child.id) {
        return;
      }

      const id = `${child.id}.${field.name}__${parent.id}.${match[2]}`;
      if (seen.has(id)) {
        return;
      }
      seen.add(id);

      result.push({
        id,
        childId: child.id,
        childField: field.name,
        parentId: parent.id,
        parentField: match[2],
      });
    });
  });

  return result;
}

// ------------------------------------------------------------------- layout
function estimateHeight(table) {
  const count = Math.min(table.fields?.length || 0, MAX_VISIBLE_ER_FIELDS);
  return 84 + count * ROW_HEIGHT + 12;
}

function computeColumn(table, satelliteParentTag) {
  if (table.tag === "hub") return 1;
  if (table.tag === "link") return 2;
  if (table.tag === "satelite") {
    return satelliteParentTag[table.id] === "link" ? 3 : 0;
  }
  return 1;
}

function tableKind(table) {
  if (String(table.title || "").startsWith("fact_")) return "fact";
  if (String(table.title || "").startsWith("dim_")) return "dim";
  return "other";
}

function layoutStarGroup(group, top, positions) {
  const members = group.cardIds.map((id) => tableById[id]).filter(Boolean);
  const facts = members.filter((table) => tableKind(table) === "fact");
  const dims = members.filter((table) => tableKind(table) === "dim");
  const others = members.filter((table) => tableKind(table) === "other");
  const leftX = 80;
  const centerX = 720;
  const rightX = 1360;
  const dimGap = 54;
  const factGap = 76;
  const dimRows = [[], []];

  dims.forEach((table, index) => dimRows[index % 2].push(table));
  dimRows[0].forEach((table, index) => {
    positions[table.id] = { left: leftX, top: top + index * (estimateHeight(table) + dimGap) };
  });
  dimRows[1].forEach((table, index) => {
    positions[table.id] = { left: rightX, top: top + index * (estimateHeight(table) + dimGap) };
  });

  const dimHeight = Math.max(
    ...dimRows.map((row) => row.reduce((sum, table) => sum + estimateHeight(table) + dimGap, 0)),
    260
  );
  const factHeight = facts.reduce((sum, table) => sum + estimateHeight(table) + factGap, 0);
  let factTop = top + Math.max(0, (dimHeight - factHeight) / 2);
  facts.forEach((table) => {
    positions[table.id] = { left: centerX, top: factTop };
    factTop += estimateHeight(table) + factGap;
  });
  others.forEach((table, index) => {
    positions[table.id] = { left: centerX, top: factTop + index * (estimateHeight(table) + factGap) };
  });

  const totalHeight = Math.max(dimHeight, factHeight, 260);
  return top + totalHeight + 180;
}

function computeLayout(savedPositions) {
  const satelliteParentTag = {};
  relationships.forEach((rel) => {
    const child = tableById[rel.childId];
    if (child && child.tag === "satelite") {
      satelliteParentTag[rel.childId] = tableById[rel.parentId]?.tag || "hub";
    }
  });

  const positions = {};
  const placeTablesInColumns = (tables, startTop = COLUMN_TOP) => {
    const columns = { 0: [], 1: [], 2: [], 3: [] };
    tables.forEach((table) => {
      columns[computeColumn(table, satelliteParentTag)].push(table);
    });

    Object.keys(columns).forEach((key) => {
      const column = Number(key);
      let y = startTop;
      columns[column].forEach((table) => {
        positions[table.id] = { left: COLUMN_X[column], top: y };
        y += estimateHeight(table) + CARD_GAP;
      });
    });
  };

  if (schemaGroups.length) {
    let groupTop = COLUMN_TOP;
    schemaGroups.forEach((group) => {
      groupTop = layoutStarGroup(group, groupTop, positions);
    });
    const ungroupedTables = schemaTables.filter((table) => !positions[table.id]);
    if (ungroupedTables.length) {
      placeTablesInColumns(ungroupedTables, groupTop);
    }
  } else {
    placeTablesInColumns(schemaTables);
  }

  if (savedPositions) {
    Object.entries(savedPositions).forEach(([id, pos]) => {
      if (tableById[id] && pos && typeof pos.left === "number" && typeof pos.top === "number") {
        positions[id] = { left: pos.left, top: pos.top };
      }
    });
  }

  schemaTables.forEach((table, index) => {
    if (!positions[table.id]) {
      positions[table.id] = {
        left: COLUMN_X[index % COLUMN_X.length],
        top: COLUMN_TOP + Math.floor(index / COLUMN_X.length) * (estimateHeight(table) + CARD_GAP),
      };
    }
  });

  return positions;
}

// ------------------------------------------------------------ diagram cards
function renderCards(savedPositions) {
  if (!diagramScene) {
    return;
  }

  const positions = computeLayout(savedPositions);

  const cardsMarkup = schemaTables
    .map((table) => {
      const pos = positions[table.id];
      const capped = (table.fields || []).length > MAX_VISIBLE_ER_FIELDS;
      const rows = (table.fields || [])
        .map((field) => {
          const badge = field.key ? `<strong>${escapeHtml(field.key)}</strong>` : "";
          return `<span class="er-row" data-field="${fieldSlug(field.name)}" data-model-tooltip="field" data-tooltip-title="${escapeHtml(
            field.name
          )}" data-tooltip-comment="${escapeHtml(
            field.note || "Sin comentario registrado."
          )}">${badge}<span>${escapeHtml(
            field.name
          )}</span><em>${escapeHtml(field.type)}</em></span>`;
        })
        .join("");

      const totalFields = (table.fields || []).length;
      const expandToggle = capped
        ? `<button type="button" class="er-expand-toggle" data-expand-toggle aria-expanded="false" title="Expandir tabla completa">Ver todo (${totalFields})</button>`
        : "";

      return `
        <div class="er-card is-${tableKind(table)}-table" data-er-card="${escapeHtml(table.id)}" tabindex="0" role="button"
             style="left:${pos.left}px; top:${pos.top}px; width:${CARD_WIDTH}px;">
          <span class="er-card-title" data-model-tooltip="table" data-tooltip-title="${escapeHtml(
            table.title
          )}" data-tooltip-comment="${escapeHtml(
            table.description || "Sin comentario registrado."
          )}">${escapeHtml(table.title)}</span>
          <span class="er-card-meta">${escapeHtml(table.tag)}</span>
          <div class="er-card-fields${capped ? " is-field-capped" : ""}">${rows}</div>
          ${expandToggle}
        </div>`;
    })
    .join("");

  const svgEl = createSvg("svg");
  svgEl.setAttribute("class", "diagram-lines");
  svgEl.setAttribute("preserveAspectRatio", "none");

  diagramScene.innerHTML = "";
  diagramScene.appendChild(svgEl);
  diagramScene.insertAdjacentHTML("beforeend", cardsMarkup);

  svg = svgEl;
  erCards = Array.from(document.querySelectorAll("[data-er-card]"));
}

function captureCurrentPositions() {
  const positions = {};
  erCards.forEach((card) => {
    positions[card.dataset.erCard] = {
      left: Number.parseFloat(card.style.left || "0"),
      top: Number.parseFloat(card.style.top || "0"),
    };
  });
  viewPositions[activeViewId] = positions;
  return positions;
}

function applyCurrentViewPositions() {
  const positions = computeLayout(viewPositions[activeViewId]);
  erCards.forEach((card) => {
    const pos = positions[card.dataset.erCard];
    if (!pos) {
      return;
    }
    card.style.left = `${pos.left}px`;
    card.style.top = `${pos.top}px`;
  });
  resizeScene();
  updateRelationships();
  updateGroups();
}

function resizeScene() {
  if (!diagramScene) {
    return;
  }

  let maxRight = 1800;
  let maxBottom = 1200;
  erCards.forEach((card) => {
    if (card.classList.contains("is-view-hidden")) {
      return;
    }
    const m = metrics(card);
    maxRight = Math.max(maxRight, m.left + m.width + SCENE_PADDING);
    maxBottom = Math.max(maxBottom, m.top + m.height + SCENE_PADDING);
  });

  diagramScene.style.width = `${maxRight}px`;
  diagramScene.style.height = `${maxBottom}px`;
}

// --------------------------------------------------------------- model views
function currentView() {
  return modelViews.find((view) => view.id === activeViewId) || modelViews[0];
}

// Con vistas basadas en archivo, cada vista es un esquema completo, por lo que
// siempre se muestran las relaciones y grupos derivados del esquema activo.
function isDefaultView() {
  return true;
}

function sanitizePositions(positions) {
  const out = {};
  if (!positions || typeof positions !== "object") {
    return out;
  }
  Object.entries(positions).forEach(([id, pos]) => {
    if (pos && typeof pos.left === "number" && typeof pos.top === "number") {
      out[id] = { left: pos.left, top: pos.top };
    }
  });
  return out;
}

function renderViewSelect() {
  if (!modelViewSelect) {
    return;
  }
  modelViewSelect.innerHTML = modelViews
    .map((view) => `<option value="${escapeHtml(view.id)}">${escapeHtml(view.name)}</option>`)
    .join("");
  modelViewSelect.value = activeViewId;
}

function closeViewTableMenu() {
  if (viewTableMenu) {
    viewTableMenu.hidden = true;
    viewTableButton?.setAttribute("aria-expanded", "false");
  }
}

// Las vistas ahora provienen de archivos model-schema*.json; los controles para
// componer vistas por subconjunto de tablas ya no aplican y quedan ocultos.
function renderViewControls() {
  renderViewSelect();
  closeViewTableMenu();
  if (newViewButton) {
    newViewButton.hidden = !(editModeEnabled && isLocalHost());
  }
  if (viewTableControls) {
    viewTableControls.hidden = true;
  }
  // "Guardar" solo en modo edicion y cuando se sirve en local (puede escribir
  // los archivos model-schema/model-views de la vista).
  if (saveViewButton) {
    saveViewButton.hidden = !(editModeEnabled && isLocalHost());
  }
}

async function createNewModelView() {
  if (!isLocalHost()) {
    return;
  }
  const name = window.prompt("Nombre de la nueva vista", "Nueva vista");
  if (name === null) {
    return;
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return;
  }
  const existingIds = new Set(modelViews.map((view) => view.id));
  const baseId = viewFileSlug(trimmed);
  let id = baseId;
  let index = 2;
  while (existingIds.has(id)) {
    id = `${baseId}_${index}`;
    index += 1;
  }

  const view = {
    id,
    name: trimmed,
    file: `model-schema.${id}.json`,
    viewsFile: `model-views.${id}.json`,
  };
  modelViews.push(view);
  activeViewId = id;
  schemaTables = [];
  rebuildSchemaLookups();
  viewPositions[activeViewId] = {};
  viewSeeds[activeViewId] = {
    positions: {},
    colors: {},
    customRelationships: [],
    deletedRelationIds: [],
    relationRoutes: {},
    groups: [],
    schemaGroups: [],
    zoom,
  };
  renderViewSelect();
  renderActiveSchema(viewSeeds[activeViewId]);
  saveState();
  try {
    await persistActiveModelFiles();
  } catch (error) {
    console.error("No se pudo crear la nueva vista", error);
  }
}

function resetCurrentViewLayout() {
  viewPositions[activeViewId] = {};
  applyCurrentViewPositions();
  updateCollapsedCards();
  updateGroups();
  resizeScene();
  rebuildRelationships();
  refreshSelectionStyles();
  centerViewport({ force: true });
  captureCurrentPositions();
  saveState();
}

// ---------------------------------------------- vistas por archivo de esquema
async function loadSchemaManifest() {
  const manifest = await fetchModelJson(SCHEMA_MANIFEST_PATH).catch(() => null);
  const schemas = Array.isArray(manifest?.schemas)
    ? manifest.schemas
        .filter((entry) => entry && entry.id && entry.file)
        .map((entry) => ({
          id: String(entry.id),
          name: String(entry.name || entry.id),
          file: String(entry.file),
          viewsFile: entry.viewsFile ? String(entry.viewsFile) : null,
        }))
    : [];

  modelViews = schemas.length ? schemas : FALLBACK_SCHEMAS.map((view) => ({ ...view }));

  const preferred = manifest?.defaultId && modelViews.some((view) => view.id === manifest.defaultId)
    ? manifest.defaultId
    : modelViews[0].id;
  return preferred;
}

// Reconstruye por completo el diagrama para el esquema de la vista activa.
function renderActiveSchema(state) {
  relationships = [];
  schemaRelationships = deriveRelationships();
  customRelationships = [];
  deletedRelationIds.clear();
  Object.keys(relationRoutes).forEach((key) => delete relationRoutes[key]);
  groups.length = 0;
  Object.keys(cardColors).forEach((key) => delete cardColors[key]);
  selectedCardIds.clear();
  selectedCardId = null;
  selectedGroupId = null;
  selectedRelationId = null;
  pendingConnectorId = null;
  buildSchemaGroups();

  // Posiciones y zoom provienen de la configuracion de la vista activa.
  viewPositions[activeViewId] = sanitizePositions(state?.positions || {});
  if (typeof state?.zoom === "number") {
    zoom = clamp(state.zoom, MIN_ZOOM, MAX_ZOOM);
  }

  if (Array.isArray(state?.customRelationships)) {
    customRelationships = state.customRelationships
      .filter((rel) => rel && tableById[rel.childId] && tableById[rel.parentId])
      .map((rel) => ({ ...rel, viewId: activeViewId }));
  }
  if (Array.isArray(state?.deletedRelationIds)) {
    state.deletedRelationIds.forEach((id) => deletedRelationIds.add(id));
  }
  if (state?.relationRoutes && typeof state.relationRoutes === "object") {
    Object.entries(state.relationRoutes).forEach(([id, wp]) => {
      if (wp && Number.isFinite(wp.x) && Number.isFinite(wp.y)) {
        relationRoutes[id] = { x: wp.x, y: wp.y };
      }
    });
  }

  renderCards(viewPositions[activeViewId]);
  applyColors(state?.colors);
  createFieldConnectors();
  rebuildRelationships();
  updateDbmlEditorFromView();
  bindCards();
  bindCommentTooltips();
  restoreSchemaGroups(state?.schemaGroups);
  renderSchemaGroups();
  restoreGroups(state?.groups);
  resizeScene();
  applyZoom();
  updateRelationships();
  updateGroups();
  updateEditModeUi();
  centerViewport({ force: true });
}

async function activateView(viewId) {
  const view = modelViews.find((entry) => entry.id === viewId) || currentView();
  if (!view) {
    return;
  }
  activeViewId = view.id;
  try {
    await loadSchemaFile(view.file);
  } catch (error) {
    console.error(error);
    return;
  }
  const seed = await loadViewSeed(view);
  const state = effectiveViewState(activeViewId, seed, readLocalBlob());
  renderViewSelect();
  renderActiveSchema(state);
}

// --------------------------------------------------- relationship geometry
function sideDirection(side) {
  return side === "right" ? 1 : -1;
}

// Vertical position of a field row relative to the scene, accounting for the
// internal scroll of capped tables (>20 fields). When a row is scrolled out of
// the visible band the anchor is clamped to the edge and reported as hidden.
function rowMetrics(card, row) {
  const cardTop = Number.parseFloat(card.style.top || "0");
  if (!row) {
    return { y: cardTop + 48, visible: true };
  }

  const fields = row.closest(".er-card-fields");
  let center = row.offsetTop + row.offsetHeight / 2;
  let visible = true;

  if (fields && fields.classList.contains("is-field-capped")) {
    center -= fields.scrollTop;
    const top = fields.offsetTop;
    const bottom = fields.offsetTop + fields.clientHeight;
    visible = center >= top && center <= bottom;
    center = clamp(center, top + 6, bottom - 6);
  }

  return { y: cardTop + center, visible };
}

function anchorPoint(tableId, fieldName, side) {
  const card = cardEl(tableId);
  if (!card) {
    return null;
  }

  const m = metrics(card);
  const row = card.querySelector(`.er-row[data-field="${fieldSlug(fieldName)}"]`);
  const { y } = rowMetrics(card, row);
  const x = side === "left" ? m.left : m.left + m.width;
  return { x, y };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Turns a poly-line into a path with rounded elbows.
function roundedPath(points) {
  const pts = points.filter(
    (pt, index) => index === 0 || pt.x !== points[index - 1].x || pt.y !== points[index - 1].y
  );
  if (pts.length < 2) {
    return "";
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    const inLen = distance(prev, cur);
    const outLen = distance(cur, next);
    const r = Math.min(CORNER, inLen / 2, outLen / 2);

    const inX = cur.x - ((cur.x - prev.x) / inLen) * r;
    const inY = cur.y - ((cur.y - prev.y) / inLen) * r;
    const outX = cur.x + ((next.x - cur.x) / outLen) * r;
    const outY = cur.y + ((next.y - cur.y) / outLen) * r;

    d += ` L ${inX} ${inY} Q ${cur.x} ${cur.y} ${outX} ${outY}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function computeRoute(child, childSide, parent, parentSide, waypoint) {
  const childStub = { x: child.x + sideDirection(childSide) * STUB, y: child.y };
  const parentStub = { x: parent.x + sideDirection(parentSide) * STUB, y: parent.y };

  if (waypoint && Number.isFinite(waypoint.x) && Number.isFinite(waypoint.y)) {
    // Ruta en "S" a traves de un punto definido por el usuario: mantiene los
    // angulos rectos ortogonales pero permite mover el codo arriba/abajo e
    // izquierda/derecha.
    const points = [
      child,
      childStub,
      { x: waypoint.x, y: childStub.y },
      { x: waypoint.x, y: waypoint.y },
      { x: parentStub.x, y: waypoint.y },
      parentStub,
      parent,
    ];
    return { points, elbow: { x: waypoint.x, y: waypoint.y } };
  }

  const midX = (childStub.x + parentStub.x) / 2;
  const points = [
    child,
    childStub,
    { x: midX, y: childStub.y },
    { x: midX, y: parentStub.y },
    parentStub,
    parent,
  ];
  return { points, elbow: { x: midX, y: (childStub.y + parentStub.y) / 2 } };
}

// Crow's foot ("many") on the FK child side, single bar ("one") on the PK parent side.
function buildMarkerPath(child, childSide, parent, parentSide) {
  const cd = sideDirection(childSide);
  const apex = { x: child.x + cd * 15, y: child.y };
  const spread = 7;

  let d = "";
  d += `M ${apex.x} ${apex.y} L ${child.x} ${child.y - spread} `;
  d += `M ${apex.x} ${apex.y} L ${child.x} ${child.y + spread} `;
  d += `M ${apex.x} ${apex.y} L ${child.x} ${child.y} `;

  const pd = sideDirection(parentSide);
  const barX = parent.x + pd * 12;
  d += `M ${barX} ${parent.y - 6} L ${barX} ${parent.y + 6}`;
  return d;
}

function scopedRelationshipId(baseId) {
  return isDefaultView() ? baseId : `${activeViewId}::${baseId}`;
}

function relationViewId(rel) {
  return rel.viewId || DEFAULT_VIEW_ID;
}

function tableAccentColor(tableId) {
  if (cardColors[tableId]) {
    return cardColors[tableId];
  }
  const table = tableById[tableId];
  if (table?.headerColor) {
    return table.headerColor;
  }
  if (tableKind(table) === "fact") {
    return "#7c3aed";
  }
  if (tableKind(table) === "dim") {
    return "#2563eb";
  }
  if (String(tableId || "").startsWith("h-")) {
    return "#2563eb";
  }
  if (String(tableId || "").startsWith("l-")) {
    return "#7c3aed";
  }
  if (String(tableId || "").startsWith("s-")) {
    return "#059669";
  }
  return "#64748b";
}

// Merge relationships for the active view. Default keeps schema-derived
// relationships; custom views start empty and only show view-local custom ones.
function currentRelationships() {
  const activeCustomRelationships = customRelationships.filter((rel) => relationViewId(rel) === activeViewId);
  const merged = isDefaultView() ? [...schemaRelationships, ...activeCustomRelationships] : activeCustomRelationships;
  const seen = new Set();
  const out = [];
  merged.forEach((rel) => {
    if (seen.has(rel.id) || deletedRelationIds.has(rel.id)) {
      return;
    }
    seen.add(rel.id);
    out.push(rel);
  });
  return out;
}

function relationshipStableId(rel) {
  return rel?.id || `${rel?.childId}.${rel?.childField}__${rel?.parentId}.${rel?.parentField}`;
}

function schemaTablesForSave() {
  return schemaTables.map((table) => ({
    ...table,
    headerColor: cardColors[table.id] || table.headerColor,
    modelRelations: (table.modelRelations || []).filter((rel) => !deletedRelationIds.has(relationshipStableId(rel))),
  }));
}

function syncSchemaRelationshipsFromTables() {
  schemaRelationships = deriveRelationships();
}

function removeSchemaRelationship(relationId) {
  let removed = false;
  schemaTables.forEach((table) => {
    const before = table.modelRelations || [];
    const after = before.filter((rel) => relationshipStableId(rel) !== relationId);
    if (after.length !== before.length) {
      table.modelRelations = after;
      removed = true;
    }
  });
  return removed;
}

function addSchemaRelationship(rel) {
  const child = tableById[rel.childId];
  if (!child) {
    return false;
  }
  child.modelRelations = Array.isArray(child.modelRelations) ? child.modelRelations : [];
  if (child.modelRelations.some((item) => relationshipStableId(item) === rel.id)) {
    return false;
  }
  child.modelRelations.push({
    id: rel.id,
    childId: rel.childId,
    childField: rel.childField,
    parentId: rel.parentId,
    parentField: rel.parentField,
    source: "ui",
    dbmlGroup: child.dbmlGroup || "",
  });
  return true;
}

function rebuildRelationships() {
  relationships = currentRelationships();
  buildRelationElements();
  updateRelationships();
  applyRelationHighlightMode();
}

function buildRelationElements() {
  if (!svg) {
    return;
  }

  svg.querySelectorAll(".relation-group").forEach((el) => el.remove());
  relationEls = [];
  routeHandles.splice(0).forEach((el) => el.remove());

  relationships.forEach((rel) => {
    const group = createSvg("g");
    group.setAttribute("class", "relation-group");
    group.dataset.relId = rel.id;
    group.style.setProperty("--relation-color", tableAccentColor(rel.childId));
    if (rel.custom) {
      group.dataset.custom = "true";
    }

    const hit = createSvg("path");
    hit.setAttribute("class", "relation-hit");

    const path = createSvg("path");
    path.setAttribute("class", "relation");

    const marker = createSvg("path");
    marker.setAttribute("class", "relation-marker");

    // Capa de "flujo": puntos que se animan a lo largo de la relacion (del hijo
    // FK hacia el padre PK) cuando la relacion esta activa por hover.
    const flow = createSvg("path");
    flow.setAttribute("class", "relation-flow");

    group.appendChild(hit);
    group.appendChild(path);
    group.appendChild(marker);
    group.appendChild(flow);
    svg.appendChild(group);

    group.addEventListener("click", (event) => {
      event.stopPropagation();
      if (editModeEnabled) {
        selectRelation(rel.id);
      }
    });

    if (rel.id === selectedRelationId) {
      group.classList.add("is-selected");
    }

    const handle = createRouteHandle(rel);
    relationEls.push({ rel, group, hit, path, marker, flow, handle });
  });
}

// Tirador arrastrable en el codo de cada relacion para reencaminarla.
function createRouteHandle(rel) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "relation-handle relation-route-handle";
  handle.hidden = !editModeEnabled;
  handle.setAttribute("aria-label", "Mover relacion (doble clic para restablecer)");

  let pointerId = null;
  let moved = false;

  handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    moved = false;
    handle.classList.add("is-dragging");
    handle.setPointerCapture(pointerId);
    selectRelation(rel.id);
  });

  handle.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId || !diagramScene) {
      return;
    }
    const rect = diagramScene.getBoundingClientRect();
    relationRoutes[rel.id] = {
      x: (event.clientX - rect.left) / zoom,
      y: (event.clientY - rect.top) / zoom,
    };
    moved = true;
    updateRelationships();
  });

  function stop(event) {
    if (event.pointerId !== pointerId) {
      return;
    }
    handle.classList.remove("is-dragging");
    if (handle.hasPointerCapture(pointerId)) {
      handle.releasePointerCapture(pointerId);
    }
    pointerId = null;
    if (moved) {
      saveState();
    }
  }

  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", stop);
  handle.addEventListener("click", (event) => event.stopPropagation());
  handle.addEventListener("dblclick", (event) => {
    event.preventDefault();
    event.stopPropagation();
    delete relationRoutes[rel.id];
    updateRelationships();
    saveState();
  });

  diagramScene.appendChild(handle);
  routeHandles.push(handle);
  return handle;
}

function updateRelationships() {
  if (!svg || !diagramScene) {
    return;
  }

  const width = diagramScene.clientWidth;
  const height = diagramScene.clientHeight;
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);

  relationEls.forEach(({ rel, hit, path, marker, flow, handle }) => {
    const childCard = cardEl(rel.childId);
    const parentCard = cardEl(rel.parentId);
    if (
      !childCard ||
      !parentCard ||
      isCardViewHidden(rel.childId) ||
      isCardViewHidden(rel.parentId) ||
      isCardGroupCollapsed(rel.childId) ||
      isCardGroupCollapsed(rel.parentId)
    ) {
      hit.setAttribute("d", "");
      path.setAttribute("d", "");
      marker.setAttribute("d", "");
      if (flow) flow.setAttribute("d", "");
      if (handle) handle.hidden = true;
      return;
    }
    const childCenter = metrics(childCard);
    const parentCenter = metrics(parentCard);
    const childCardMidX = childCenter.left + childCenter.width / 2;
    const parentCardMidX = parentCenter.left + parentCenter.width / 2;

    const waypoint = relationRoutes[rel.id];
    let childSide;
    let parentSide;
    if (waypoint && Number.isFinite(waypoint.x)) {
      // Con la relacion reencaminada, cada extremo se ancla en el lado de su
      // tabla que mira hacia el punto de ruta (izquierda o derecha).
      childSide = waypoint.x >= childCardMidX ? "right" : "left";
      parentSide = waypoint.x >= parentCardMidX ? "right" : "left";
    } else {
      const parentIsRight = parentCardMidX >= childCardMidX;
      childSide = parentIsRight ? "right" : "left";
      parentSide = parentIsRight ? "left" : "right";
    }

    const childAnchor = anchorPoint(rel.childId, rel.childField, childSide);
    const parentAnchor = anchorPoint(rel.parentId, rel.parentField, parentSide);
    if (!childAnchor || !parentAnchor) {
      hit.setAttribute("d", "");
      path.setAttribute("d", "");
      marker.setAttribute("d", "");
      if (flow) flow.setAttribute("d", "");
      if (handle) handle.hidden = true;
      return;
    }

    const routed = computeRoute(childAnchor, childSide, parentAnchor, parentSide, waypoint);
    const connectorPath = roundedPath(routed.points);
    hit.setAttribute("d", connectorPath);
    path.setAttribute("d", connectorPath);
    marker.setAttribute("d", buildMarkerPath(childAnchor, childSide, parentAnchor, parentSide));
    if (flow) flow.setAttribute("d", connectorPath);

    if (handle) {
      handle.style.left = `${routed.elbow.x}px`;
      handle.style.top = `${routed.elbow.y}px`;
      handle.hidden = !editModeEnabled;
    }
  });

  updateConnectorPositions();
}

// -------------------------------------------------- field-level edit (connectors)
function fieldByName(table, name) {
  return (table?.fields || []).find((field) => field.name === name) || null;
}

function createFieldConnectors() {
  if (!diagramScene) {
    return;
  }

  fieldConnectors.splice(0).forEach((connector) => connector.remove());

  schemaTables.forEach((table) => {
    const card = cardEl(table.id);
    if (!card) {
      return;
    }

    (table.fields || []).forEach((field) => {
      const slug = fieldSlug(field.name);
      ["left", "right"].forEach((side) => {
        const connector = document.createElement("button");
        connector.type = "button";
        connector.className = "field-connector";
        connector.hidden = !editModeEnabled;
        connector.dataset.connectorId = `${table.id}::${slug}::${side}`;
        connector.dataset.tableId = table.id;
        connector.dataset.field = slug;
        connector.dataset.fieldName = field.name;
        connector.dataset.side = side;
        connector.setAttribute("aria-label", `Conectar ${table.title}.${field.name} (${side})`);
        connector.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onConnectorClick(connector);
        });
        diagramScene.appendChild(connector);
        fieldConnectors.push(connector);
      });
    });
  });

  updateConnectorPositions();
}

function updateConnectorPositions() {
  fieldConnectors.forEach((connector) => {
    const card = cardEl(connector.dataset.tableId);
    const row = card?.querySelector(`.er-row[data-field="${connector.dataset.field}"]`);
    if (!card || !row || isCardViewHidden(connector.dataset.tableId) || isCardGroupCollapsed(connector.dataset.tableId)) {
      connector.hidden = true;
      return;
    }
    const m = metrics(card);
    const { y, visible } = rowMetrics(card, row);
    connector.style.left = `${connector.dataset.side === "left" ? m.left : m.left + m.width}px`;
    connector.style.top = `${y}px`;
    connector.hidden = !editModeEnabled || !visible;
  });
}

function setPendingConnector(connectorId) {
  pendingConnectorId = connectorId;
  fieldConnectors.forEach((connector) => {
    connector.classList.toggle("is-pending", connector.dataset.connectorId === connectorId);
  });
}

function onConnectorClick(connector) {
  if (!editModeEnabled) {
    return;
  }

  const connectorId = connector.dataset.connectorId;

  if (!pendingConnectorId) {
    setPendingConnector(connectorId);
    return;
  }

  if (pendingConnectorId === connectorId) {
    setPendingConnector(null);
    return;
  }

  const source = fieldConnectors.find((item) => item.dataset.connectorId === pendingConnectorId);
  if (!source || source.dataset.tableId === connector.dataset.tableId) {
    // Can't relate a table to itself; treat the new click as a fresh start.
    setPendingConnector(connectorId);
    return;
  }

  createCustomRelationship(source, connector);
  setPendingConnector(null);
}

function createCustomRelationship(sourceConnector, targetConnector) {
  const aTable = tableById[sourceConnector.dataset.tableId];
  const bTable = tableById[targetConnector.dataset.tableId];
  const aField = fieldByName(aTable, sourceConnector.dataset.fieldName);
  const bField = fieldByName(bTable, targetConnector.dataset.fieldName);
  if (!aTable || !bTable || !aField || !bField) {
    return;
  }

  // The primary key side is the parent ("one"); the other side is the child ("many").
  // Falls back to source = child when neither/both endpoints are a PK.
  const aIsPk = aField.key === "PK";
  const bIsPk = bField.key === "PK";
  let child;
  let childField;
  let parent;
  let parentField;
  if (bIsPk && !aIsPk) {
    child = aTable;
    childField = aField;
    parent = bTable;
    parentField = bField;
  } else if (aIsPk && !bIsPk) {
    child = bTable;
    childField = bField;
    parent = aTable;
    parentField = aField;
  } else {
    child = aTable;
    childField = aField;
    parent = bTable;
    parentField = bField;
  }

  const baseId = `${child.id}.${childField.name}__${parent.id}.${parentField.name}`;
  const id = scopedRelationshipId(baseId);
  deletedRelationIds.delete(id);

  const exists = currentRelationships().some((rel) => rel.id === id);
  if (!exists) {
    const rel = {
      id,
      viewId: activeViewId,
      childId: child.id,
      childField: childField.name,
      parentId: parent.id,
      parentField: parentField.name,
      custom: true,
    };
    if (isDefaultView()) {
      addSchemaRelationship(rel);
      syncSchemaRelationshipsFromTables();
    } else {
      customRelationships.push(rel);
    }
  }

  rebuildRelationships();
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function selectRelation(relationId) {
  selectedRelationId = relationId;
  selectedCardId = null;
  selectedCardIds.clear();
  selectedGroupId = null;
  refreshSelectionStyles();
}

function deleteSelectedRelation() {
  if (!selectedRelationId) {
    return;
  }
  deletedRelationIds.add(selectedRelationId);
  delete relationRoutes[selectedRelationId];
  const removedFromSchema = removeSchemaRelationship(selectedRelationId);
  const index = customRelationships.findIndex((rel) => rel.id === selectedRelationId);
  if (index !== -1) {
    customRelationships.splice(index, 1);
  }
  if (removedFromSchema) {
    deletedRelationIds.delete(selectedRelationId);
    syncSchemaRelationshipsFromTables();
  }
  selectedRelationId = null;
  rebuildRelationships();
  updateDbmlEditorFromView();
  refreshSelectionStyles();
  saveState();
  scheduleModelFilePersist();
}

function updateRelationButtons() {
  if (deleteRelationButton) {
    deleteRelationButton.disabled = !editModeEnabled || !selectedRelationId;
  }
}

// ---------------------------------------------------------------- highlight
function markRow(tableId, fieldName, on) {
  const card = cardEl(tableId);
  const row = card?.querySelector(`.er-row[data-field="${fieldSlug(fieldName)}"]`);
  if (row) {
    row.classList.toggle("is-linked", on);
  }
}

function clearHighlight() {
  diagramPanel?.classList.remove("is-focused");
  relationEls.forEach(({ group }) => group.classList.remove("is-active", "is-flowing"));
  erCards.forEach((card) => card.classList.remove("is-active"));
  document.querySelectorAll(".er-row.is-linked").forEach((row) => row.classList.remove("is-linked"));
  if (relationHighlightEnabled) {
    applyRelationHighlightMode();
  }
}

function highlightRelation(rel) {
  diagramPanel?.classList.remove("is-relation-highlight-mode");
  clearHighlight();
  diagramPanel?.classList.add("is-focused");
  const target = relationEls.find((item) => item.rel.id === rel.id);
  target?.group.classList.add("is-active");
  cardEl(rel.childId)?.classList.add("is-active");
  cardEl(rel.parentId)?.classList.add("is-active");
  markRow(rel.childId, rel.childField, true);
  markRow(rel.parentId, rel.parentField, true);
}

// Al pasar el cursor por una tabla solo se afecta a sus relaciones (brillo +
// grosor + flujo de puntos). Las tablas NO se difuminan ni cambian de estilo.
function highlightTable(tableId) {
  clearHighlight();
  relationEls.forEach(({ rel, group }) => {
    if (rel.childId === tableId || rel.parentId === tableId) {
      group.classList.add("is-active", "is-flowing");
    }
  });
}

function applyRelationHighlightMode() {
  diagramPanel?.classList.toggle("is-relation-highlight-mode", relationHighlightEnabled);
  relationEls.forEach(({ group }) => {
    group.classList.toggle("is-active", relationHighlightEnabled);
    group.classList.toggle("is-flowing", relationHighlightEnabled);
  });
  document.querySelectorAll(".er-row.is-linked").forEach((row) => row.classList.remove("is-linked"));
  if (!relationHighlightEnabled) {
    return;
  }
  relationships.forEach((rel) => {
    markRow(rel.childId, rel.childField, true);
    markRow(rel.parentId, rel.parentField, true);
  });
}

function setRelationHighlightMode(enabled) {
  relationHighlightEnabled = enabled;
  relationHighlightButton?.setAttribute("aria-pressed", enabled ? "true" : "false");
  if (relationHighlightButton) {
    const label = enabled ? "Ocultar relaciones" : "Resaltar relaciones";
    relationHighlightButton.innerHTML = RELATION_ICON_MARKUP;
    relationHighlightButton.setAttribute("aria-label", label);
    relationHighlightButton.setAttribute("title", label);
  }
  if (!enabled) {
    diagramPanel?.classList.remove("is-relation-highlight-mode", "is-focused");
    relationEls.forEach(({ group }) => group.classList.remove("is-active", "is-flowing"));
    document.querySelectorAll(".er-row.is-linked").forEach((row) => row.classList.remove("is-linked"));
    return;
  }
  applyRelationHighlightMode();
}

// ------------------------------------------------------------------ dragging
// Captura los waypoints (codos) de las relaciones cuyos DOS extremos estan en
// el conjunto que se movera, para trasladarlos con el mismo delta y que la
// relacion se mueva rigida junto con la caja/seleccion (no quede estatica).
function captureIntraRoutes(movedIds) {
  const map = {};
  relationEls.forEach(({ rel }) => {
    const wp = relationRoutes[rel.id];
    if (wp && movedIds.has(rel.childId) && movedIds.has(rel.parentId)) {
      map[rel.id] = { x: wp.x, y: wp.y };
    }
  });
  return map;
}

function applyRouteDelta(startRoutes, dx, dy) {
  Object.entries(startRoutes).forEach(([id, wp]) => {
    relationRoutes[id] = { x: wp.x + dx, y: wp.y + dy };
  });
}

function enableDragging(card) {
  let pointerId = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let dragItems = []; // [{ el, left, top }]
  let startRoutes = {};
  let minLeft = 0;
  let minTop = 0;

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;

    // Si la tarjeta forma parte de una multi-seleccion, se arrastran todas las
    // seleccionadas juntas; si no, solo esta.
    const tableId = card.dataset.erCard;
    const ids =
      selectedCardIds.size > 1 && selectedCardIds.has(tableId)
        ? Array.from(selectedCardIds)
        : [tableId];
    dragItems = ids
      .map((id) => cardEl(id))
      .filter(Boolean)
      .map((el) => ({
        el,
        left: Number.parseFloat(el.style.left || "0"),
        top: Number.parseFloat(el.style.top || "0"),
      }));
    minLeft = Math.min(...dragItems.map((d) => d.left));
    minTop = Math.min(...dragItems.map((d) => d.top));
    startRoutes = captureIntraRoutes(new Set(dragItems.map((d) => d.el.dataset.erCard)));

    dragItems.forEach((d) => d.el.classList.add("is-dragging"));
    card.setPointerCapture(pointerId);
    event.preventDefault();
  });

  card.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    moved = moved || Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4;

    // Delta comun, acotado para que ninguna tarjeta cruce los limites y se
    // conserven las posiciones relativas del grupo seleccionado.
    let dx = (event.clientX - startX) / zoom;
    let dy = (event.clientY - startY) / zoom;
    dx = Math.max(dx, 24 - minLeft);
    dy = Math.max(dy, 72 - minTop);

    dragItems.forEach((d) => {
      d.el.style.left = `${d.left + dx}px`;
      d.el.style.top = `${d.top + dy}px`;
    });
    applyRouteDelta(startRoutes, dx, dy);

    resizeScene();
    updateRelationships();
    updateGroups();
  });

  function stop(event) {
    if (event.pointerId !== pointerId) {
      return;
    }
    dragItems.forEach((d) => d.el.classList.remove("is-dragging"));
    card.dataset.dragMoved = moved ? "true" : "false";
    if (card.hasPointerCapture(pointerId)) {
      card.releasePointerCapture(pointerId);
    }
    pointerId = null;
    if (moved && editModeEnabled) {
      captureCurrentPositions();
      saveState();
    }
    dragItems = [];
  }

  card.addEventListener("pointerup", stop);
  card.addEventListener("pointercancel", stop);
}

function bindCards() {
  erCards.forEach((card) => {
    const tableId = card.dataset.erCard;

    card.addEventListener("click", (event) => {
      if (card.dataset.dragMoved === "true") {
        card.dataset.dragMoved = "false";
        return;
      }
      if (editModeEnabled && (event.shiftKey || event.metaKey || event.ctrlKey)) {
        toggleCardSelection(tableId);
      } else {
        selectCard(tableId);
      }
    });

    // Hover sobre cualquier parte de la tabla: resalta y anima el flujo de
    // puntos sobre sus relaciones (respetando la direccion FK -> PK).
    card.addEventListener("mouseenter", () => {
      if (card.classList.contains("is-dragging")) {
        return;
      }
      highlightTable(tableId);
    });
    card.addEventListener("mouseleave", () => {
      clearHighlight();
    });

    const fields = card.querySelector(".er-card-fields.is-field-capped");
    if (fields) {
      fields.addEventListener("scroll", () => updateRelationships(), { passive: true });
    }

    // Boton para expandir la tabla completa / volver al tope de columnas.
    const expandToggle = card.querySelector("[data-expand-toggle]");
    if (expandToggle) {
      expandToggle.addEventListener("pointerdown", (event) => event.stopPropagation());
      expandToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        const expanded = card.classList.toggle("is-expanded");
        expandToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        const total = (tableById[tableId]?.fields || []).length;
        expandToggle.textContent = expanded ? "Ver menos" : `Ver todo (${total})`;
        resizeScene();
        updateRelationships();
        updateGroups();
      });
    }

    enableDragging(card);
  });
}

// ------------------------------------------------------------- zoom / expand
function applyZoom() {
  if (!diagramScene || !zoomReadout) {
    return;
  }
  diagramScene.style.transform = `translate(${sceneOffsetX}px, ${sceneOffsetY}px) scale(${zoom})`;
  diagramScene.style.transformOrigin = "top left";
  zoomReadout.textContent = `${Math.round(zoom * 100)}%`;
}

function setZoom(next) {
  zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
  applyZoom();
  updateRelationships();
  saveState();
}

function centerViewport({ force = false } = {}) {
  if (!diagramViewport || !diagramScene || (!force && viewportCentered) || !erCards.length) {
    return;
  }

  const visibleCards = erCards.filter((card) => !card.classList.contains("is-view-hidden"));
  if (!visibleCards.length) {
    return;
  }

  const vw = diagramViewport.clientWidth;
  const vh = diagramViewport.clientHeight;
  // Si el viewport todavia no tiene dimensiones (iframe recien montado),
  // reintentar en el siguiente frame para centrar con medidas reales.
  if (!vw || !vh) {
    requestAnimationFrame(() => centerViewport({ force: true }));
    return;
  }

  const bounds = visibleCards.reduce(
    (acc, card) => {
      const m = metrics(card);
      const table = tableById[card.dataset.erCard];
      const width = m.width || CARD_WIDTH;
      const height = m.height || (table ? estimateHeight(table) : ROW_HEIGHT * 4);
      return {
        minLeft: Math.min(acc.minLeft, m.left),
        minTop: Math.min(acc.minTop, m.top),
        maxRight: Math.max(acc.maxRight, m.left + width),
        maxBottom: Math.max(acc.maxBottom, m.top + height),
      };
    },
    { minLeft: Infinity, minTop: Infinity, maxRight: -Infinity, maxBottom: -Infinity }
  );

  // El encabezado de grupo se dibuja ~56px por encima de las tarjetas y es la
  // zona para arrastrarlo; se reserva esa holgura al medir el contenido para
  // que quede dentro del area visible.
  const hasGroups =
    schemaGroups.length > 0 ||
    groups.some((group) => (group.viewId || DEFAULT_VIEW_ID) === activeViewId);
  const topBound = bounds.minTop - (hasGroups ? 62 : 0);

  const contentWidth = (bounds.maxRight - bounds.minLeft) * zoom;
  const contentHeight = (bounds.maxBottom - topBound) * zoom;

  // La barra de herramientas flota sobre el viewport (position:absolute), por lo
  // que se reserva su altura real como margen superior para que el contenido y
  // el encabezado del grupo nunca queden debajo de ella y sigan accesibles.
  const toolbarEl = diagramPanel?.querySelector(".diagram-toolbar");
  const topSafe = toolbarEl
    ? Math.min(vh * 0.5, toolbarEl.offsetTop + toolbarEl.offsetHeight + 16)
    : 76;
  const availableHeight = Math.max(80, vh - topSafe);

  // Eje X: si el contenido cabe, se centra con un desplazamiento de la escena;
  // si desborda, el desplazamiento es 0 y se centra por scroll.
  sceneOffsetX = contentWidth <= vw ? (vw - contentWidth) / 2 - bounds.minLeft * zoom : 0;
  // Eje Y: se centra dentro del area util (por debajo de la barra).
  sceneOffsetY = contentHeight <= availableHeight
    ? topSafe + (availableHeight - contentHeight) / 2 - topBound * zoom
    : 0;

  applyZoom();

  const centerX = (bounds.minLeft + bounds.maxRight) / 2;
  const centerY = (topBound + bounds.maxBottom) / 2;
  diagramViewport.scrollLeft = contentWidth > vw ? Math.max(0, centerX * zoom - vw / 2) : 0;
  diagramViewport.scrollTop = contentHeight > availableHeight
    ? Math.max(0, centerY * zoom - (topSafe + availableHeight / 2))
    : 0;
  viewportCentered = true;
}

function setDiagramExpanded(expanded) {
  if (!diagramPanel) {
    return;
  }
  diagramExpanded = expanded;
  diagramPanel.classList.toggle("is-expanded", expanded);
  document.body.classList.toggle("diagram-expanded-mode", expanded);
  window.parent?.postMessage({ type: "model-expand", expanded }, "*");
  if (expandDiagramButton) {
    const label = expanded ? "Cerrar expansion del modelo" : "Expandir modelo";
    expandDiagramButton.innerHTML = ASPECT_ICON_MARKUP;
    expandDiagramButton.title = label;
    expandDiagramButton.setAttribute("aria-label", label);
  }
  viewportCentered = false;
  requestAnimationFrame(() => {
    updateRelationships();
    centerViewport();
  });
}

// ---------------------------------------------------------------- selection
function refreshSelectionStyles() {
  erCards.forEach((card) => {
    const id = card.dataset.erCard;
    card.classList.toggle("is-selected", id === selectedCardId);
    card.classList.toggle("is-multi-selected", selectedCardIds.has(id));
  });
  groupEls.forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.groupId === selectedGroupId);
  });
  schemaGroupEls.forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.schemaGroupId === selectedGroupId);
  });
  schemaGroupHeaderEls.forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.schemaGroupId === selectedGroupId);
  });
  relationEls.forEach(({ rel, group }) => {
    group.classList.toggle("is-selected", rel.id === selectedRelationId);
  });
  updateColorButton();
  updateGroupButtons();
  updateRelationButtons();
}

function selectCard(tableId) {
  selectedCardIds.clear();
  selectedCardIds.add(tableId);
  selectedCardId = tableId;
  selectedGroupId = null;
  selectedRelationId = null;
  refreshSelectionStyles();
  saveState();
}

function toggleCardSelection(tableId) {
  if (selectedCardIds.has(tableId)) {
    selectedCardIds.delete(tableId);
    selectedCardId = selectedCardIds.size ? Array.from(selectedCardIds).at(-1) : null;
  } else {
    selectedCardIds.add(tableId);
    selectedCardId = tableId;
  }
  selectedGroupId = null;
  selectedRelationId = null;
  refreshSelectionStyles();
}

function clearSelection() {
  selectedCardIds.clear();
  selectedCardId = null;
  selectedGroupId = null;
  selectedRelationId = null;
  refreshSelectionStyles();
}

// -------------------------------------------------------------------- colors
function applyColors(saved) {
  if (saved) {
    Object.entries(saved).forEach(([id, color]) => {
      if (color && !tableById[id]?.headerColor) {
        cardColors[id] = color;
        if (tableById[id]) {
          tableById[id].headerColor = color;
        }
      }
    });
  }
  paintCards();
}

function paintCards() {
  erCards.forEach((card) => {
    const color = cardColors[card.dataset.erCard] || tableById[card.dataset.erCard]?.headerColor;
    card.classList.toggle("is-colored", Boolean(color));
    if (color) {
      card.style.setProperty("--card-color", color);
    } else {
      card.style.removeProperty("--card-color");
    }
  });
}

function normalizeHex(value) {
  const trimmed = String(value).trim();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{6})$/.test(prefixed) ? prefixed.toLowerCase() : null;
}

function activeColorTarget() {
  if (selectedCardId) {
    return { kind: "card", color: cardColors[selectedCardId] || tableById[selectedCardId]?.headerColor || "#ff3b0a" };
  }
  if (selectedGroupId) {
    const group = schemaGroups.find((g) => g.id === selectedGroupId) || groups.find((g) => g.id === selectedGroupId);
    return group ? { kind: "group", color: group.color || "#ff5736" } : null;
  }
  return null;
}

function applyColor(color) {
  if (selectedCardId) {
    cardColors[selectedCardId] = color;
    if (tableById[selectedCardId]) {
      tableById[selectedCardId].headerColor = color;
    }
    paintCards();
    rebuildRelationships();
  } else if (selectedGroupId) {
    const group = schemaGroups.find((g) => g.id === selectedGroupId);
    if (group) {
      group.color = color;
      group.cardIds.forEach((id) => {
        const table = tableById[id];
        if (table) {
          table.dbmlGroupColor = color;
        }
      });
      renderSchemaGroups();
    } else {
      const customGroup = groups.find((g) => g.id === selectedGroupId);
      if (customGroup) {
        customGroup.color = color;
        renderGroups();
      }
    }
  }
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function clearColor() {
  if (selectedCardId) {
    delete cardColors[selectedCardId];
    if (tableById[selectedCardId]) {
      delete tableById[selectedCardId].headerColor;
    }
    paintCards();
    rebuildRelationships();
  } else if (selectedGroupId) {
    const group = schemaGroups.find((g) => g.id === selectedGroupId);
    if (group) {
      group.cardIds.forEach((id) => {
        const table = tableById[id];
        if (table) {
          delete table.dbmlGroupColor;
        }
      });
      buildSchemaGroups();
      renderSchemaGroups();
    } else {
      const customGroup = groups.find((g) => g.id === selectedGroupId);
      if (customGroup) {
        delete customGroup.color;
        renderGroups();
      }
    }
  }
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function updateColorButton() {
  if (!tableColorButton) {
    return;
  }
  const target = activeColorTarget();
  tableColorButton.style.background = "";
  tableColorButton.style.color = "";
  tableColorButton.innerHTML = COLOR_ICON_MARKUP;
  tableColorButton.setAttribute("aria-label", target ? `Color ${target.color}` : "Color");
  tableColorButton.setAttribute("title", target ? `Color ${target.color}` : "Color");
  if (tableColorHexInput) {
    tableColorHexInput.value = target ? target.color : "";
  }
}

function closeColorMenu() {
  if (tableColorMenu) {
    tableColorMenu.hidden = true;
    tableColorButton?.setAttribute("aria-expanded", "false");
  }
}

// -------------------------------------------------------------------- groups
function groupBounds(group) {
  const members = group.cardIds.map(cardEl).filter((card) => card && !card.classList.contains("is-view-hidden"));
  if (!members.length) {
    return null;
  }
  const b = members.reduce(
    (acc, card) => {
      const m = metrics(card);
      return {
        minLeft: Math.min(acc.minLeft, m.left),
        minTop: Math.min(acc.minTop, m.top),
        maxRight: Math.max(acc.maxRight, m.left + m.width),
        maxBottom: Math.max(acc.maxBottom, m.top + m.height),
      };
    },
    { minLeft: Infinity, minTop: Infinity, maxRight: -Infinity, maxBottom: -Infinity }
  );
  const pad = 22;
  return {
    left: b.minLeft - pad,
    top: b.minTop - pad - 34,
    width: b.maxRight - b.minLeft + pad * 2,
    height: b.maxBottom - b.minTop + pad * 2 + 34,
  };
}

function groupHeaderMarkup(group) {
  const collapsed = Boolean(group.collapsed);
  const label = collapsed ? "Mostrar tablas del grupo" : "Ocultar tablas del grupo";
  return `
    <span>${escapeHtml(group.name)}</span>
    <button class="group-collapse-button" type="button" aria-pressed="${collapsed}" aria-label="${label}" title="${label}">
      ${collapsed ? "+" : "-"}
    </button>
  `;
}

function collapsedGroupWidth(group) {
  const nameLength = String(group.name || "Grupo").length;
  return clamp(nameLength * 8 + 64, 150, 340);
}

function updateCollapsedCards() {
  const collapsedCardIds = new Set();
  const activeGroups = groups.filter((group) => (group.viewId || DEFAULT_VIEW_ID) === activeViewId);
  const collapsibleGroups = isDefaultView() ? [...schemaGroups, ...activeGroups] : activeGroups;
  collapsibleGroups.forEach((group) => {
    if (!group.collapsed) {
      return;
    }
    group.cardIds.forEach((id) => collapsedCardIds.add(id));
  });

  erCards.forEach((card) => {
    card.classList.toggle("is-group-collapsed", collapsedCardIds.has(card.dataset.erCard));
  });
}

function isCardGroupCollapsed(tableId) {
  return Boolean(cardEl(tableId)?.classList.contains("is-group-collapsed"));
}

function isCardViewHidden(tableId) {
  return Boolean(cardEl(tableId)?.classList.contains("is-view-hidden"));
}

function toggleGroupCollapsed(group) {
  const bounds = groupBounds(group);
  if (bounds) {
    group.collapsedBounds = bounds;
  }
  group.collapsed = !group.collapsed;
  updateCollapsedCards();
  updateGroups();
  resizeScene();
  updateRelationships();
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function bindGroupCollapseButton(group, header) {
  const button = header?.querySelector(".group-collapse-button");
  if (!button) {
    return;
  }
  button.addEventListener("pointerdown", (event) => event.stopPropagation());
  button.addEventListener("dblclick", (event) => event.stopPropagation());
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleGroupCollapsed(group);
  });
}

function renderSchemaGroups() {
  if (!diagramScene) {
    return;
  }
  schemaGroupEls.splice(0).forEach((el) => el.remove());
  schemaGroupHeaderEls.splice(0).forEach((el) => el.remove());

  schemaGroups.forEach((group) => {
    const el = document.createElement("div");
    el.className = "table-group schema-table-group";
    el.dataset.schemaGroupId = group.id;
    el.innerHTML = `<div class="table-group-body" aria-hidden="true"></div>`;
    el.style.setProperty("--group-color", group.color);

    const header = document.createElement("div");
    header.className = "table-group-header schema-group-drag-header";
    header.dataset.schemaGroupId = group.id;
    header.innerHTML = groupHeaderMarkup(group);
    header.style.setProperty("--group-color", group.color);

    diagramScene.appendChild(el);
    diagramScene.appendChild(header);
    schemaGroupEls.push(el);
    schemaGroupHeaderEls.push(header);
    enableGroupDrag(group, header);
    bindGroupCollapseButton(group, header);
    header.addEventListener("click", (event) => {
      event.stopPropagation();
      selectGroup(group.id);
    });
    header.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (!editModeEnabled || header.dataset.dragMoved === "true") {
        return;
      }
      event.preventDefault();
      selectGroup(group.id);
      renameGroup(group);
    });
  });

  updateCollapsedCards();
  updateSchemaGroups();
}

function updateSchemaGroups() {
  schemaGroupEls.forEach((el) => {
    const group = schemaGroups.find((g) => g.id === el.dataset.schemaGroupId);
    const header = schemaGroupHeaderEls.find((item) => item.dataset.schemaGroupId === el.dataset.schemaGroupId);
    if (!isDefaultView()) {
      el.style.display = "none";
      if (header) {
        header.style.display = "none";
      }
      return;
    }
    const bounds = group && groupBounds(group);
    if (!bounds) {
      el.style.display = "none";
      if (header) {
        header.style.display = "none";
      }
      return;
    }
    const collapsed = Boolean(group.collapsed);
    const collapsedWidth = collapsedGroupWidth(group);
    const visibleWidth = collapsed ? Math.min(bounds.width, collapsedWidth) : bounds.width;
    el.style.display = "";
    el.classList.toggle("is-collapsed", collapsed);
    el.style.left = `${bounds.left}px`;
    el.style.top = `${bounds.top}px`;
    el.style.width = `${visibleWidth}px`;
    el.style.height = `${collapsed ? 34 : bounds.height}px`;
    if (header) {
      header.style.display = "";
      header.classList.toggle("is-collapsed", collapsed);
      header.style.left = `${bounds.left}px`;
      header.style.top = `${bounds.top}px`;
      header.style.width = `${visibleWidth}px`;
      const button = header.querySelector(".group-collapse-button");
      if (button) {
        const label = collapsed ? "Mostrar tablas del grupo" : "Ocultar tablas del grupo";
        button.textContent = collapsed ? "+" : "-";
        button.setAttribute("aria-pressed", String(collapsed));
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
      }
    }
  });
}

function renderGroups() {
  if (!diagramScene) {
    return;
  }
  groupEls.splice(0).forEach((el) => el.remove());

  groups.forEach((group) => {
    const el = document.createElement("div");
    el.className = "table-group";
    el.dataset.groupId = group.id;
    el.innerHTML = `<div class="table-group-header">${groupHeaderMarkup(group)}</div>`;
    if (group.color) {
      el.style.setProperty("--group-color", group.color);
    }
    diagramScene.appendChild(el);
    groupEls.push(el);

    const header = el.querySelector(".table-group-header");
    enableGroupDrag(group, header);
    bindGroupCollapseButton(group, header);
    header.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      if (!editModeEnabled || header.dataset.dragMoved === "true") {
        return;
      }
      event.preventDefault();
      selectGroup(group.id);
      renameGroup(group);
    });
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      selectGroup(group.id);
    });
  });

  updateGroups();
}

function updateGroups() {
  updateSchemaGroups();
  groupEls.forEach((el) => {
    const group = groups.find((g) => g.id === el.dataset.groupId);
    if (!group || (group.viewId || DEFAULT_VIEW_ID) !== activeViewId) {
      el.style.display = "none";
      return;
    }
    const bounds = group && groupBounds(group);
    if (!bounds) {
      el.style.display = "none";
      return;
    }
    const collapsed = Boolean(group.collapsed);
    const collapsedWidth = collapsedGroupWidth(group);
    const visibleWidth = collapsed ? Math.min(bounds.width, collapsedWidth) : bounds.width;
    el.style.display = "";
    el.classList.toggle("is-collapsed", collapsed);
    el.style.left = `${bounds.left}px`;
    el.style.top = `${bounds.top}px`;
    el.style.width = `${visibleWidth}px`;
    el.style.height = `${collapsed ? 34 : bounds.height}px`;
    const button = el.querySelector(".group-collapse-button");
    if (button) {
      const label = collapsed ? "Mostrar tablas del grupo" : "Ocultar tablas del grupo";
      button.textContent = collapsed ? "+" : "-";
      button.setAttribute("aria-pressed", String(collapsed));
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }
  });
}

function enableGroupDrag(group, header) {
  let pointerId = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startPositions = [];
  let startRoutes = {};

  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    header.dataset.dragMoved = "false";
    startPositions = group.cardIds
      .map((id) => {
        const card = cardEl(id);
        return card ? { card, left: metrics(card).left, top: metrics(card).top } : null;
      })
      .filter(Boolean);
    startRoutes = captureIntraRoutes(new Set(group.cardIds));
    header.setPointerCapture(pointerId);
    event.preventDefault();
    event.stopPropagation();
  });

  header.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    moved = moved || Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4;
    const dx = (event.clientX - startX) / zoom;
    const dy = (event.clientY - startY) / zoom;
    startPositions.forEach(({ card, left, top }) => {
      card.style.left = `${Math.max(24, left + dx)}px`;
      card.style.top = `${Math.max(72, top + dy)}px`;
    });
    applyRouteDelta(startRoutes, dx, dy);
    resizeScene();
    updateRelationships();
    updateGroups();
  });

  function stop(event) {
    if (event.pointerId !== pointerId) {
      return;
    }
    if (header.hasPointerCapture(pointerId)) {
      header.releasePointerCapture(pointerId);
    }
    header.dataset.dragMoved = moved ? "true" : "false";
    pointerId = null;
    if (moved && editModeEnabled) {
      captureCurrentPositions();
      saveState();
    }
  }

  header.addEventListener("pointerup", stop);
  header.addEventListener("pointercancel", stop);
}

function selectGroup(groupId) {
  selectedGroupId = groupId;
  selectedCardId = null;
  selectedCardIds.clear();
  selectedRelationId = null;
  refreshSelectionStyles();
}

function selectedSchemaGroup() {
  return schemaGroups.find((group) => group.id === selectedGroupId) || null;
}

function renameGroup(group) {
  const nextName = window.prompt("Nombre del grupo", group.name || "Grupo");
  if (nextName === null) {
    return;
  }
  const trimmed = nextName.trim();
  if (!trimmed || trimmed === group.name) {
    return;
  }
  const isSchemaGroup = schemaGroups.some((item) => item.id === group.id);
  const previousName = group.name;
  group.name = trimmed;
  if (isSchemaGroup) {
    group.cardIds.forEach((id) => {
      const table = tableById[id];
      if (table?.dbmlGroup === previousName) {
        table.dbmlGroup = trimmed;
      }
    });
    buildSchemaGroups();
    const nextGroup = schemaGroups.find((item) => item.name === trimmed);
    renderSchemaGroups();
    if (nextGroup) {
      selectGroup(nextGroup.id);
    }
  } else {
    renderGroups();
    selectGroup(group.id);
  }
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function createGroupFromSelection() {
  if (selectedCardIds.size < 1) {
    return;
  }
  const groupName = `Grupo ${schemaGroups.length + 1}`;
  const groupColor = schemaGroupColor(schemaGroups.length);
  Array.from(selectedCardIds).forEach((id) => {
    const table = tableById[id];
    if (table) {
      table.dbmlGroup = groupName;
      table.dbmlGroupColor = groupColor;
    }
  });
  clearSelection();
  buildSchemaGroups();
  renderSchemaGroups();
  const group = schemaGroups.find((item) => item.name === groupName);
  if (group) {
    selectGroup(group.id);
  }
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function deleteSelectedGroup() {
  if (!selectedGroupId) {
    return;
  }
  const schemaGroup = selectedSchemaGroup();
  if (schemaGroup) {
    schemaGroup.cardIds.forEach((id) => {
      const table = tableById[id];
      if (table) {
        delete table.dbmlGroup;
        delete table.dbmlGroupColor;
      }
    });
    buildSchemaGroups();
    renderSchemaGroups();
  } else {
    const index = groups.findIndex((g) => g.id === selectedGroupId && (g.viewId || DEFAULT_VIEW_ID) === activeViewId);
    if (index !== -1) {
      groups.splice(index, 1);
    }
    renderGroups();
  }
  selectedGroupId = null;
  refreshSelectionStyles();
  updateDbmlEditorFromView();
  saveState();
  scheduleModelFilePersist();
}

function restoreGroups(saved) {
  // Los TableGroup se leen desde model-schema (dbmlGroup/dbmlGroupColor).
  // Se ignoran grupos visuales heredados de model-views para evitar doble fuente de verdad.
  void saved;
  updateCollapsedCards();
  renderGroups();
}

function restoreSchemaGroups(saved) {
  if (!Array.isArray(saved)) {
    return;
  }
  const savedById = new Map(saved.map((group) => [group.id, group]));
  schemaGroups.forEach((group) => {
    const savedGroup = savedById.get(group.id);
    if (!savedGroup) {
      return;
    }
    group.collapsed = Boolean(savedGroup.collapsed);
    group.collapsedBounds = savedGroup.collapsedBounds || null;
  });
}

function updateGroupButtons() {
  if (groupTablesButton) {
    groupTablesButton.disabled = !editModeEnabled || selectedCardIds.size < 1;
  }
  if (deleteGroupButton) {
    deleteGroupButton.disabled = !editModeEnabled || !selectedGroupId;
  }
}

// ----------------------------------------------------------------- edit mode
function updateEditModeUi() {
  editModeButton?.setAttribute("aria-pressed", editModeEnabled ? "true" : "false");
  if (editModeButton) {
    const label = editModeEnabled ? "Desactivar edicion" : "Activar edicion";
    editModeButton.setAttribute("aria-label", label);
    editModeButton.setAttribute("title", label);
  }
  if (colorControls) {
    colorControls.hidden = !editModeEnabled;
  }
  if (groupControls) {
    groupControls.hidden = !editModeEnabled;
  }
  if (relationControls) {
    relationControls.hidden = !editModeEnabled;
  }
  if (!editModeEnabled) {
    closeColorMenu();
    closeViewTableMenu();
    clearSelection();
    setPendingConnector(null);
  }
  renderViewControls();
  updateGroupButtons();
  updateRelationButtons();
  updateConnectorPositions();
  routeHandles.forEach((handle) => {
    handle.hidden = !editModeEnabled;
  });
}

// --------------------------------------------------------------- persistence
function isLocalHost() {
  try {
    const loc = (window.parent && window.parent !== window && window.parent.location) || window.location;
    const host = loc.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "" || host === "::1";
  } catch (_) {
    return false;
  }
}

function storageTargets() {
  if (!isLocalHost()) {
    return [];
  }
  const targets = [];
  try {
    if (window.parent && window.parent !== window && window.parent.localStorage) {
      targets.push(window.parent.localStorage);
    }
  } catch (_) {
    /* Parent storage can be inaccessible in embedded contexts. */
  }
  try {
    if (window.localStorage) {
      targets.push(window.localStorage);
    }
  } catch (_) {
    /* Local iframe storage can be unavailable for srcdoc documents. */
  }
  return Array.from(new Set(targets));
}

function persistState(rawState) {
  storageTargets().forEach((storage) => {
    try {
      storage.setItem(STORAGE_KEY, rawState);
    } catch (error) {
      console.warn("Unable to persist diagram state", error);
    }
  });
}

function readPersistedState() {
  for (const storage of storageTargets()) {
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        return raw;
      }
    } catch (error) {
      console.warn("Unable to read saved diagram state", error);
    }
  }
  return null;
}

// Blob de localStorage con el estado editado por el usuario, separado por vista:
// { version, activeViewId, views: { [viewId]: { positions, colors, ... } } }.
function readLocalBlob() {
  try {
    const raw = readPersistedState();
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    if (!parsed.views || typeof parsed.views !== "object") {
      parsed.views = {};
    }
    return parsed;
  } catch (error) {
    console.warn("Unable to read saved diagram state", error);
    return null;
  }
}

// Carga la semilla de configuracion de una vista desde su archivo
// model-views*.json (posiciones/colores/relaciones/grupos por defecto). Es
// opcional: si no existe, la vista arranca con el layout calculado.
async function loadViewSeed(view) {
  if (Object.prototype.hasOwnProperty.call(viewSeeds, view.id)) {
    return viewSeeds[view.id];
  }
  let seed = null;
  if (view?.viewsFile) {
    try {
      const raw = await fetchModelJson(`assets/data/${view.viewsFile}`);
      seed = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
    } catch (_) {
      seed = null;
    }
  }
  viewSeeds[view.id] = seed;
  return seed;
}

// Estado efectivo de una vista: el ARCHIVO SEMILLA (model-views.<vista>.json)
// tiene prioridad. Solo se recurre a lo guardado en el navegador para las
// claves que el archivo no define, o cuando no existe archivo semilla.
function effectiveViewState(viewId, seed, blob) {
  const localView = blob && blob.views ? blob.views[viewId] : null;
  const hasSeed = seed && typeof seed === "object";
  const base = hasSeed ? seed : {};
  const pick = (key, fallback) => {
    if (hasSeed && base[key] !== undefined) {
      return base[key];
    }
    if (localView && localView[key] !== undefined) {
      return localView[key];
    }
    return fallback;
  };
  const zoomValue = pick("zoom", undefined);
  return {
    positions: pick("positions", {}) || {},
    colors: pick("colors", {}) || {},
    customRelationships: [],
    deletedRelationIds: [],
    relationRoutes: pick("relationRoutes", {}) || {},
    groups: Array.isArray(pick("groups", [])) ? pick("groups", []) : [],
    schemaGroups: Array.isArray(pick("schemaGroups", [])) ? pick("schemaGroups", []) : [],
    zoom: typeof zoomValue === "number" ? zoomValue : undefined,
  };
}

// Configuracion (plana) de la vista activa: posiciones, colores, relaciones,
// grupos y zoom. Es lo que se guarda por vista, tanto en localStorage como en
// el archivo model-views.<vista>.json al usar "Guardar".
function currentViewConfig() {
  return {
    positions: viewPositions[activeViewId] || {},
    colors: {},
    customRelationships: [],
    deletedRelationIds: [],
    relationRoutes: { ...relationRoutes },
    groups: [],
    schemaGroups: schemaGroups.map((group) => ({
      id: group.id,
      collapsed: Boolean(group.collapsed),
      collapsedBounds: group.collapsedBounds || null,
    })),
    zoom,
  };
}

function saveState() {
  if (!diagramScene) {
    return;
  }
  const blob = readLocalBlob() || { version: 8, views: {} };
  blob.version = 8;
  blob.activeViewId = activeViewId;
  blob.views = blob.views || {};
  blob.views[activeViewId] = currentViewConfig();
  persistState(JSON.stringify(blob));
}

async function saveViewToFiles() {
  if (!isLocalHost() || !saveViewButton) {
    return;
  }
  const view = currentView();
  captureCurrentPositions();
  const payload = {
    schemaFile: view.file,
    viewsFile: view.viewsFile || `model-views.${view.id}.json`,
    schema: schemaTablesForSave(),
    views: currentViewConfig(),
  };
  const original = saveViewButton.innerHTML;
  saveViewButton.disabled = true;
  try {
    const response = await fetch("save-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    saveState();
    saveViewButton.textContent = "✓";
  } catch (error) {
    console.error("No se pudo guardar la vista en archivos", error);
    saveViewButton.textContent = "!";
  } finally {
    setTimeout(() => {
      saveViewButton.innerHTML = original || SAVE_ICON_MARKUP;
      saveViewButton.disabled = false;
    }, 2000);
  }
}

function canvasRoundRect(ctx, x, y, width, height, radius = 8) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function canvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((line, index) => {
    const value = index === maxLines - 1 && lines.length > maxLines ? `${line.replace(/\s+\S*$/, "")}...` : line;
    ctx.fillText(value, x, y + index * lineHeight);
  });
  return y + Math.min(lines.length, maxLines) * lineHeight;
}

function canvasElementBox(el) {
  return {
    x: Number.parseFloat(el.style.left || "0"),
    y: Number.parseFloat(el.style.top || "0"),
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function resolvedCustomColor(style, propertyName, fallback) {
  const value = style.getPropertyValue(propertyName).trim();
  if (value && !value.startsWith("var(")) {
    return value;
  }
  const variableName = value.match(/var\((--[^),\s]+)/)?.[1];
  if (variableName) {
    const resolved = style.getPropertyValue(variableName).trim();
    if (resolved && !resolved.startsWith("var(")) {
      return resolved;
    }
  }
  return fallback;
}

function downloadCanvasPng(canvas, filename) {
  return new Promise((resolve, reject) => {
    const clickLink = (href) => {
      const link = document.createElement("a");
      link.download = filename;
      link.href = href;
      document.body.appendChild(link);
      link.click();
      link.remove();
      resolve();
    };
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("No se pudo crear el PNG"));
          return;
        }
        const url = URL.createObjectURL(blob);
        clickLink(url);
        setTimeout(() => URL.revokeObjectURL(url), 1200);
      }, "image/png");
      return;
    }
    clickLink(canvas.toDataURL("image/png"));
  });
}

function drawExportGroups(ctx) {
  document.querySelectorAll(".table-group:not([hidden]), .schema-group-drag-header").forEach((group) => {
    const style = getComputedStyle(group);
    if (style.display === "none" || style.visibility === "hidden") return;
    const { x, y, width, height } = canvasElementBox(group);
    if (!width || !height) return;
    const groupColor = style.getPropertyValue("--group-color").trim() || "#2563eb";
    if (group.classList.contains("table-group")) {
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.fillStyle = groupColor;
      canvasRoundRect(ctx, x, y, width, height, 10);
      ctx.fill();
      ctx.globalAlpha = 0.42;
      ctx.strokeStyle = groupColor;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.fillStyle = groupColor;
    canvasRoundRect(ctx, x, y, width, height, 9);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 11px Inter, Arial, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(group.textContent.trim(), x + 12, y + height / 2);
    ctx.restore();
  });
}

function drawExportRelations(ctx) {
  if (!svg || typeof Path2D === "undefined") return;
  svg.querySelectorAll(".relation").forEach((path) => {
    const d = path.getAttribute("d");
    if (!d) return;
    const style = getComputedStyle(path);
    ctx.save();
    ctx.strokeStyle = style.stroke && style.stroke !== "none" ? style.stroke : "#93a4b8";
    ctx.lineWidth = Number.parseFloat(style.strokeWidth) || 1.75;
    ctx.globalAlpha = Number.parseFloat(style.opacity) || 1;
    const dash = (style.strokeDasharray || "").split(/[,\s]+/).map(Number).filter((value) => Number.isFinite(value) && value > 0);
    if (dash.length) ctx.setLineDash(dash);
    ctx.stroke(new Path2D(d));
    ctx.restore();
  });
  svg.querySelectorAll(".relation-marker").forEach((path) => {
    const d = path.getAttribute("d");
    if (!d) return;
    const group = path.closest(".relation-group");
    const color = group ? getComputedStyle(group).getPropertyValue("--relation-color").trim() : "#93a4b8";
    ctx.save();
    ctx.fillStyle = color || "#93a4b8";
    ctx.fill(new Path2D(d));
    ctx.restore();
  });
}

function drawExportCards(ctx) {
  erCards.forEach((card) => {
    if (card.classList.contains("is-view-hidden") || card.classList.contains("is-group-collapsed")) return;
    const { x, y, width, height } = canvasElementBox(card);
    if (!width || !height) return;
    const style = getComputedStyle(card);
    const accent = resolvedCustomColor(style, "--table-accent", style.getPropertyValue("--card-color").trim() || "#2563eb");
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.09)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = style.backgroundColor || "#ffffff";
    canvasRoundRect(ctx, x, y, width, height, 10);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = style.borderColor || "rgba(203, 213, 225, 0.92)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = accent;
    canvasRoundRect(ctx, x, y, 3, height, 2);
    ctx.fill();

    const title = card.querySelector(".er-card-title");
    const meta = card.querySelector(".er-card-meta");
    const titleHeight = (title?.offsetHeight || 28) + (meta?.offsetHeight || 22);
    ctx.save();
    canvasRoundRect(ctx, x + 3, y, width - 3, titleHeight, 10);
    ctx.clip();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = accent;
    ctx.fillRect(x + 3, y, width - 3, titleHeight);
    ctx.restore();
    ctx.strokeStyle = "rgba(203, 213, 225, 0.70)";
    ctx.beginPath();
    ctx.moveTo(x + 3, y + titleHeight);
    ctx.lineTo(x + width, y + titleHeight);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "850 13px Inter, Arial, sans-serif";
    ctx.textBaseline = "top";
    canvasText(ctx, title?.textContent || "", x + 14, y + 12, width - 28, 15, 2);
    ctx.fillStyle = "#64748b";
    ctx.font = "800 9px Inter, Arial, sans-serif";
    ctx.fillText((meta?.textContent || "").toUpperCase(), x + 14, y + Math.max(32, titleHeight - 17));

    const fields = card.querySelector(".er-card-fields");
    const isFieldCapped = fields?.classList.contains("is-field-capped") && !card.classList.contains("is-expanded");
    const fieldClip = isFieldCapped
      ? {
          top: fields.offsetTop,
          bottom: fields.offsetTop + fields.clientHeight,
          scrollTop: fields.scrollTop,
        }
      : null;
    const rows = Array.from(card.querySelectorAll(".er-row"));
    if (fieldClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 3, y + fieldClip.top, width - 3, fieldClip.bottom - fieldClip.top);
      ctx.clip();
    }
    rows.forEach((row) => {
      const rowTop = row.offsetTop - (fieldClip?.scrollTop || 0);
      const rowHeight = row.offsetHeight || 32;
      if (fieldClip && (rowTop + rowHeight <= fieldClip.top || rowTop >= fieldClip.bottom)) {
        return;
      }
      const rowY = y + rowTop;
      const rowStyle = getComputedStyle(row);
      ctx.fillStyle = rowStyle.backgroundColor || "#ffffff";
      ctx.fillRect(x + 3, rowY, width - 3, rowHeight);
      ctx.strokeStyle = rowStyle.borderBottomColor || "#e8eef6";
      ctx.beginPath();
      ctx.moveTo(x + 3, rowY + rowHeight);
      ctx.lineTo(x + width, rowY + rowHeight);
      ctx.stroke();
      const key = row.querySelector("strong")?.textContent || "";
      const name = row.querySelector("span")?.textContent || "";
      const type = row.querySelector("em")?.textContent || "";
      ctx.textBaseline = "middle";
      ctx.font = "800 8px Inter, Arial, sans-serif";
      ctx.fillStyle = accent;
      if (key) ctx.fillText(key, x + 14, rowY + rowHeight / 2);
      ctx.font = "680 11px Inter, Arial, sans-serif";
      ctx.fillStyle = "#334155";
      const nameX = x + 50;
      const typeWidth = ctx.measureText(type).width;
      ctx.fillText(name, nameX, rowY + rowHeight / 2, Math.max(40, width - 72 - typeWidth));
      ctx.font = "800 8px Inter, Arial, sans-serif";
      ctx.fillStyle = "#7f8da3";
      ctx.fillText(type, x + width - typeWidth - 12, rowY + rowHeight / 2);
    });
    if (fieldClip) {
      ctx.restore();
    }
    ctx.restore();
  });
}

// Exporta el diagrama completo a PNG renderizando directamente en Canvas.
// Evita <foreignObject>, que puede fallar en GitHub Pages al convertir SVG a canvas.
async function exportDiagramPng() {
  if (!diagramScene) {
    return;
  }
  const original = exportPngButton ? exportPngButton.textContent : "";
  if (exportPngButton) {
    exportPngButton.disabled = true;
    exportPngButton.textContent = "Generando...";
  }
  try {
    const width = Math.ceil(Math.max(diagramScene.scrollWidth, Number.parseFloat(diagramScene.style.width) || 0, 800));
    const height = Math.ceil(Math.max(diagramScene.scrollHeight, Number.parseFloat(diagramScene.style.height) || 0, 600));
    const maxPixels = 14000000;
    const scale = Math.min(2, Math.max(0.5, Math.sqrt(maxPixels / Math.max(width * height, 1))));

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas no disponible");
    }
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#fbfdff";
    ctx.fillRect(0, 0, width, height);
    drawExportGroups(ctx);
    drawExportRelations(ctx);
    drawExportCards(ctx);

    await downloadCanvasPng(canvas, `modelo_${activeViewId}.png`);

    if (exportPngButton) exportPngButton.textContent = "PNG ✓";
  } catch (error) {
    console.error("No se pudo exportar el diagrama a PNG", error);
    if (exportPngButton) exportPngButton.textContent = "Error PNG";
  } finally {
    if (exportPngButton) {
      setTimeout(() => {
        exportPngButton.textContent = original || "PNG";
        exportPngButton.disabled = false;
      }, 1800);
    }
  }
}

// -------------------------------------------------------------- toolbar wiring
function bindToolbar() {
  editModeButton?.addEventListener("click", () => {
    editModeEnabled = !editModeEnabled;
    updateEditModeUi();
    clearHighlight();
  });

  dbmlEditorCollapseButton?.addEventListener("click", () => {
    const collapsed = !diagramPanel?.classList.contains("dbml-editor-collapsed");
    diagramPanel?.classList.toggle("dbml-editor-collapsed", collapsed);
    dbmlEditorCollapseButton.textContent = collapsed ? "‹" : "›";
    dbmlEditorCollapseButton.setAttribute("aria-label", collapsed ? "Expandir editor" : "Contraer editor");
    dbmlEditorCollapseButton.title = collapsed ? "Expandir editor" : "Contraer editor";
    setTimeout(() => {
      updateRelationships();
      updateConnectorPositions();
      centerViewport({ force: true });
    }, 180);
  });
  dbmlEditorInput?.addEventListener("input", syncDbmlEditor);
  dbmlEditorInput?.addEventListener("scroll", () => {
    if (dbmlEditorHighlight) {
      dbmlEditorHighlight.scrollTop = dbmlEditorInput.scrollTop;
      dbmlEditorHighlight.scrollLeft = dbmlEditorInput.scrollLeft;
    }
    if (dbmlLineNumbers) dbmlLineNumbers.scrollTop = dbmlEditorInput.scrollTop;
  });
  dbmlRunButton?.addEventListener("click", applyDbmlEditor);

  modelViewSelect?.addEventListener("change", async () => {
    captureCurrentPositions();
    saveState();
    closeViewTableMenu();
    await activateView(modelViewSelect.value || DEFAULT_VIEW_ID);
    saveState();
  });

  resetViewLayoutButton?.addEventListener("click", resetCurrentViewLayout);
  newViewButton?.addEventListener("click", createNewModelView);
  saveViewButton?.addEventListener("click", saveViewToFiles);
  exportPngButton?.addEventListener("click", exportDiagramPng);

  zoomButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.zoomAction;
      if (action === "in") {
        setZoom(zoom + ZOOM_STEP);
      } else if (action === "out") {
        setZoom(zoom - ZOOM_STEP);
      } else {
        setZoom(DEFAULT_ZOOM);
      }
    });
  });

  expandDiagramButton?.addEventListener("click", () => setDiagramExpanded(!diagramExpanded));

  tableColorButton?.addEventListener("click", (event) => {
    if (!editModeEnabled || !activeColorTarget() || !tableColorMenu) {
      return;
    }
    event.stopPropagation();
    tableColorMenu.hidden = !tableColorMenu.hidden;
    tableColorButton.setAttribute("aria-expanded", tableColorMenu.hidden ? "false" : "true");
  });

  colorSwatches.forEach((swatch) => {
    swatch.addEventListener("click", () => {
      if (!editModeEnabled || !activeColorTarget()) {
        return;
      }
      applyColor(swatch.dataset.colorValue);
      updateColorButton();
      closeColorMenu();
    });
  });

  clearColorButton?.addEventListener("click", () => {
    if (!editModeEnabled || !activeColorTarget()) {
      return;
    }
    clearColor();
    updateColorButton();
    closeColorMenu();
  });

  tableColorApplyButton?.addEventListener("click", () => {
    if (!editModeEnabled || !activeColorTarget() || !tableColorHexInput) {
      return;
    }
    const normalized = normalizeHex(tableColorHexInput.value);
    if (!normalized) {
      tableColorHexInput.focus();
      tableColorHexInput.select();
      return;
    }
    applyColor(normalized);
    updateColorButton();
    closeColorMenu();
  });

  tableColorHexInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      tableColorApplyButton?.click();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (viewTableMenu && !viewTableMenu.contains(target) && !viewTableButton?.contains(target)) {
      closeViewTableMenu();
    }
  });

  groupTablesButton?.addEventListener("click", createGroupFromSelection);
  deleteGroupButton?.addEventListener("click", deleteSelectedGroup);
  deleteRelationButton?.addEventListener("click", deleteSelectedRelation);
  relationHighlightButton?.addEventListener("click", () => {
    setRelationHighlightMode(!relationHighlightEnabled);
  });
}

// ---------------------------------------------------------------------- init
async function initializeModeler() {
  if (!diagramScene) {
    return;
  }

  const blob = readLocalBlob();

  const preferredViewId = await loadSchemaManifest();
  activeViewId = blob?.activeViewId && modelViews.some((view) => view.id === blob.activeViewId)
    ? blob.activeViewId
    : preferredViewId;

  const view = currentView();
  const seed = await loadViewSeed(view);
  const state = effectiveViewState(activeViewId, seed, blob);

  try {
    await loadSchemaFile(view.file);
  } catch (error) {
    console.error(error);
    return;
  }

  renderViewSelect();
  renderActiveSchema(state);
  bindToolbar();

  if (!blob) {
    saveState();
  }
}

if (document.readyState === "loading") {
  window.addEventListener("load", initializeModeler, { once: true });
} else {
  initializeModeler();
}

window.addEventListener("resize", () => {
  updateRelationships();
  updateGroups();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && diagramExpanded) {
    setDiagramExpanded(false);
  }
});

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  if (!target.closest(".er-card") && !target.closest(".table-group") && !target.closest(".diagram-toolbar") && !target.closest(".dbml-editor-panel")) {
    clearSelection();
  }

  if (tableColorMenu && !tableColorMenu.contains(target) && !tableColorButton?.contains(target)) {
    closeColorMenu();
  }
});
