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

function fieldSlug(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

function positionModelTooltip(clientX, clientY) {
  const tooltip = ensureModelTooltip();
  const margin = 14;
  const offset = 16;
  const rect = tooltip.getBoundingClientRect();
  let left = clientX + offset;
  let top = clientY + offset;

  if (left + rect.width > window.innerWidth - margin) {
    left = Math.max(margin, clientX - rect.width - offset);
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = Math.max(margin, clientY - rect.height - offset);
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showModelTooltip(target, event) {
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

  const rect = target.getBoundingClientRect();
  const clientX = event?.clientX ?? rect.left + rect.width / 2;
  const clientY = event?.clientY ?? rect.top + Math.min(rect.height, 18);
  positionModelTooltip(clientX, clientY);
}

function hideModelTooltip() {
  document.querySelectorAll(".is-comment-hovered").forEach((target) => target.classList.remove("is-comment-hovered"));
  if (modelTooltip) {
    modelTooltip.hidden = true;
  }
}

function bindCommentTooltips() {
  document.querySelectorAll("[data-model-tooltip]").forEach((target) => {
    target.addEventListener("mouseenter", (event) => showModelTooltip(target, event));
    target.addEventListener("mousemove", (event) => positionModelTooltip(event.clientX, event.clientY));
    target.addEventListener("mouseleave", hideModelTooltip);
    target.addEventListener("focus", (event) => showModelTooltip(target, event));
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
        color: schemaGroupColor(grouped.size),
        locked: true,
      });
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
  if (schemaGroups.length) {
    let groupTop = COLUMN_TOP;
    schemaGroups.forEach((group) => {
      groupTop = layoutStarGroup(group, groupTop, positions);
    });
  } else {
    const columns = { 0: [], 1: [], 2: [], 3: [] };
    schemaTables.forEach((table) => {
      columns[computeColumn(table, satelliteParentTag)].push(table);
    });

    Object.keys(columns).forEach((key) => {
      const column = Number(key);
      let y = COLUMN_TOP;
      columns[column].forEach((table) => {
        positions[table.id] = { left: COLUMN_X[column], top: y };
        y += estimateHeight(table) + CARD_GAP;
      });
    });
  }

  if (savedPositions) {
    Object.entries(savedPositions).forEach(([id, pos]) => {
      if (positions[id] && pos && typeof pos.left === "number" && typeof pos.top === "number") {
        positions[id] = { left: pos.left, top: pos.top };
      }
    });
  }

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
    newViewButton.hidden = true;
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
  return activeViewId === DEFAULT_VIEW_ID ? baseId : `${activeViewId}::${baseId}`;
}

function relationViewId(rel) {
  return rel.viewId || DEFAULT_VIEW_ID;
}

function tableAccentColor(tableId) {
  if (cardColors[tableId]) {
    return cardColors[tableId];
  }
  const table = tableById[tableId];
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
    customRelationships.push({
      id,
      viewId: activeViewId,
      childId: child.id,
      childField: childField.name,
      parentId: parent.id,
      parentField: parentField.name,
      custom: true,
    });
  }

  rebuildRelationships();
  saveState();
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
  const index = customRelationships.findIndex((rel) => rel.id === selectedRelationId);
  if (index !== -1) {
    customRelationships.splice(index, 1);
  }
  selectedRelationId = null;
  rebuildRelationships();
  refreshSelectionStyles();
  saveState();
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
    relationHighlightButton.textContent = enabled ? "Ocultar relaciones" : "Relaciones";
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
    expandDiagramButton.textContent = expanded ? "×" : "⛶";
    expandDiagramButton.title = expanded ? "Cerrar expansion" : "Expandir modelo";
    expandDiagramButton.setAttribute("aria-label", expanded ? "Cerrar expansion del modelo" : "Expandir modelo");
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
      if (color) {
        cardColors[id] = color;
      }
    });
  }
  paintCards();
}

function paintCards() {
  erCards.forEach((card) => {
    const color = cardColors[card.dataset.erCard];
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
    return { kind: "card", color: cardColors[selectedCardId] || "#ff3b0a" };
  }
  if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId);
    return group ? { kind: "group", color: group.color || "#ff5736" } : null;
  }
  return null;
}

function applyColor(color) {
  if (selectedCardId) {
    cardColors[selectedCardId] = color;
    paintCards();
    rebuildRelationships();
  } else if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId);
    if (group) {
      group.color = color;
      renderGroups();
    }
  }
  saveState();
}

function clearColor() {
  if (selectedCardId) {
    delete cardColors[selectedCardId];
    paintCards();
    rebuildRelationships();
  } else if (selectedGroupId) {
    const group = groups.find((g) => g.id === selectedGroupId);
    if (group) {
      delete group.color;
      renderGroups();
    }
  }
  saveState();
}

function updateColorButton() {
  if (!tableColorButton) {
    return;
  }
  const target = activeColorTarget();
  tableColorButton.style.background = target ? target.color : "#ffffff";
  tableColorButton.style.color = target ? "#ffffff" : "var(--text)";
  tableColorButton.textContent = "Color";
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
  saveState();
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

function renameGroup(group) {
  const nextName = window.prompt("Nombre del grupo", group.name || "Grupo");
  if (nextName === null) {
    return;
  }
  const trimmed = nextName.trim();
  if (!trimmed || trimmed === group.name) {
    return;
  }
  group.name = trimmed;
  renderGroups();
  selectGroup(group.id);
  saveState();
}

function createGroupFromSelection() {
  if (selectedCardIds.size < 1) {
    return;
  }
  const group = {
    id: `group-${Date.now()}`,
    name: "Grupo",
    cardIds: Array.from(selectedCardIds),
    color: "#ff5736",
    viewId: activeViewId,
  };
  groups.push(group);
  clearSelection();
  renderGroups();
  selectGroup(group.id);
  saveState();
}

function deleteSelectedGroup() {
  if (!selectedGroupId) {
    return;
  }
  const index = groups.findIndex((g) => g.id === selectedGroupId && (g.viewId || DEFAULT_VIEW_ID) === activeViewId);
  if (index !== -1) {
    groups.splice(index, 1);
  }
  selectedGroupId = null;
  renderGroups();
  refreshSelectionStyles();
  saveState();
}

function restoreGroups(saved) {
  if (!Array.isArray(saved)) {
    return;
  }
  saved.forEach((group) => {
    const cardIds = (group.cardIds || []).filter((id) => tableById[id]);
    if (cardIds.length) {
      groups.push({
        id: group.id || `group-${Date.now()}-${Math.random()}`,
        name: group.name || "Grupo",
        cardIds,
        color: group.color || "#ff5736",
        viewId: activeViewId,
        collapsed: Boolean(group.collapsed),
        collapsedBounds: group.collapsedBounds || null,
      });
    }
  });
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
    customRelationships: Array.isArray(pick("customRelationships", [])) ? pick("customRelationships", []) : [],
    deletedRelationIds: Array.isArray(pick("deletedRelationIds", [])) ? pick("deletedRelationIds", []) : [],
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
    colors: { ...cardColors },
    customRelationships: customRelationships.map((rel) => ({
      id: rel.id,
      viewId: activeViewId,
      childId: rel.childId,
      childField: rel.childField,
      parentId: rel.parentId,
      parentField: rel.parentField,
      custom: true,
    })),
    deletedRelationIds: Array.from(deletedRelationIds),
    relationRoutes: { ...relationRoutes },
    groups: groups
      .filter((group) => (group.viewId || DEFAULT_VIEW_ID) === activeViewId)
      .map((group) => ({
        id: group.id,
        name: group.name,
        cardIds: group.cardIds,
        color: group.color,
        collapsed: Boolean(group.collapsed),
        collapsedBounds: group.collapsedBounds || null,
      })),
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
    schema: schemaTables,
    views: currentViewConfig(),
  };
  const original = saveViewButton.textContent;
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
    saveViewButton.textContent = "Guardado ✓";
  } catch (error) {
    console.error("No se pudo guardar la vista en archivos", error);
    saveViewButton.textContent = "Error al guardar";
  } finally {
    setTimeout(() => {
      saveViewButton.textContent = original || "Guardar";
      saveViewButton.disabled = false;
    }, 2000);
  }
}

// Exporta el diagrama completo (a tamano natural, sin importar zoom/scroll) a
// una imagen PNG. Serializa la escena a un SVG con <foreignObject> incrustando
// el CSS, lo dibuja en un canvas y descarga el resultado. Sin dependencias.
async function exportDiagramPng() {
  if (!diagramScene) {
    return;
  }
  const original = exportPngButton ? exportPngButton.textContent : "";
  if (exportPngButton) {
    exportPngButton.disabled = true;
    exportPngButton.textContent = "Generando...";
  }
  let svgUrl = null;
  try {
    const width = Math.ceil(Math.max(diagramScene.scrollWidth, Number.parseFloat(diagramScene.style.width) || 0, 800));
    const height = Math.ceil(Math.max(diagramScene.scrollHeight, Number.parseFloat(diagramScene.style.height) || 0, 600));

    const clone = diagramScene.cloneNode(true);
    clone.style.transform = "none";
    clone.style.transformOrigin = "top left";
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.margin = "0";
    // Los tiradores de ruta son controles de edicion; no van en la imagen.
    clone.querySelectorAll(".relation-handle").forEach((el) => el.remove());

    const css = await fetch("assets/css/model.css")
      .then((response) => (response.ok ? response.text() : ""))
      .catch(() => "");

    const serialized = new XMLSerializer().serializeToString(clone);
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#ffffff;">` +
      `<style>${css}</style>${serialized}</div>` +
      `</foreignObject></svg>`;

    svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

    const scale = 2; // mayor nitidez
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("No se pudo renderizar el SVG"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(image, 0, 0);

    const link = document.createElement("a");
    link.download = `modelo_${activeViewId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();

    if (exportPngButton) exportPngButton.textContent = "PNG ✓";
  } catch (error) {
    console.error("No se pudo exportar el diagrama a PNG", error);
    if (exportPngButton) exportPngButton.textContent = "Error PNG";
  } finally {
    if (svgUrl) URL.revokeObjectURL(svgUrl);
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

  modelViewSelect?.addEventListener("change", async () => {
    captureCurrentPositions();
    saveState();
    closeViewTableMenu();
    await activateView(modelViewSelect.value || DEFAULT_VIEW_ID);
    saveState();
  });

  resetViewLayoutButton?.addEventListener("click", resetCurrentViewLayout);
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

  if (!target.closest(".er-card") && !target.closest(".table-group") && !target.closest(".diagram-toolbar")) {
    clearSelection();
  }

  if (tableColorMenu && !tableColorMenu.contains(target) && !tableColorButton?.contains(target)) {
    closeColorMenu();
  }
});
