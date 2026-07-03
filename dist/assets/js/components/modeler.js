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
const searchInput = document.querySelector("#table-search");
const detailShell = document.querySelector("[data-detail-shell]");
const detailTitle = document.querySelector("[data-detail-title]");
const diagramPanel = document.querySelector(".diagram-panel");
const diagramViewport = document.querySelector(".diagram-viewport");
const diagramScene = document.querySelector(".diagram-scene");
const zoomButtons = Array.from(document.querySelectorAll("[data-zoom-action]"));
const zoomReadout = document.querySelector(".zoom-readout");
const expandDiagramButton = document.querySelector("#expand-diagram-button");
const editModeButton = document.querySelector("#edit-mode-button");
const relationHighlightButton = document.querySelector("#relation-highlight-button");
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
const MIN_ZOOM = 0.3;
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
const STORAGE_KEY = "data-modeler-state-v7";

// ------------------------------------------------------------------- schema
const schemaTables = await fetch("assets/data/model-schema.json").then((response) => {
  if (!response.ok) throw new Error(`No se pudo cargar model-schema.json: ${response.status}`);
  return response.json();
});
const tableById = {};
const tableByName = {};
schemaTables.forEach((table) => {
  tableById[table.id] = table;
  tableByName[table.title.trim().toLowerCase()] = table;
});

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
const cardColors = {};
let viewportCentered = false;

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

function getCurrentTableId() {
  return new URLSearchParams(window.location.search).get("table") || "";
}

function buildTablePageHref(tableId) {
  return `./table.html?table=${tableId}`;
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

// -------------------------------------------------------------- sidebar / nav
function renderSidebar() {
  const nav = document.querySelector(".table-nav");
  if (!nav) {
    return;
  }

  nav.innerHTML = schemaTables
    .map(
      (table) =>
        `<a href="${buildTablePageHref(table.id)}" data-table-link>${escapeHtml(table.title)}</a>`
    )
    .join("");
}

function setActiveLink() {
  const currentTableId = getCurrentTableId();
  document.querySelectorAll("[data-table-link]").forEach((link) => {
    const href = link.getAttribute("href") || "";
    const matches = currentTableId && href.includes(`table=${currentTableId}`);
    link.classList.toggle("active", Boolean(matches));
  });
}

// ---------------------------------------------------------------- detail page
function renderDetail() {
  if (!detailShell) {
    return;
  }

  const table = tableById[getCurrentTableId()] || schemaTables[0];
  if (!table) {
    detailShell.innerHTML = "";
    return;
  }

  if (detailTitle) {
    detailTitle.textContent = table.title;
  }
  document.title = `${table.title} · Coinpro Data Vault`;

  detailShell.innerHTML = `
    <article class="table-card detail-table-card" id="${escapeHtml(table.id)}">
      <div class="table-card-header">
        <div>
          <span class="table-tag">${escapeHtml(table.tag)}</span>
          <h4>${escapeHtml(table.title)}</h4>
        </div>
        <span class="row-count">${table.fields.length} columns</span>
      </div>
      <p class="table-description">${escapeHtml(table.description)}</p>
      <table>
        <thead><tr><th>Field</th><th>Type</th><th>Notes</th></tr></thead>
        <tbody>
          ${table.fields
            .map(
              (field) => `
                <tr>
                  <td>${field.key ? `<strong>${escapeHtml(field.name)}</strong>` : escapeHtml(field.name)}</td>
                  <td>${escapeHtml(field.type)}</td>
                  <td>${escapeHtml(field.note)}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>
      <div class="relation-list">
        ${(table.relations || []).map((relation) => `<span>${escapeHtml(relation)}</span>`).join("")}
      </div>
    </article>
  `;
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

function resizeScene() {
  if (!diagramScene) {
    return;
  }

  let maxRight = 1800;
  let maxBottom = 1200;
  erCards.forEach((card) => {
    const m = metrics(card);
    maxRight = Math.max(maxRight, m.left + m.width + SCENE_PADDING);
    maxBottom = Math.max(maxBottom, m.top + m.height + SCENE_PADDING);
  });

  diagramScene.style.width = `${maxRight}px`;
  diagramScene.style.height = `${maxBottom}px`;
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

// Merge schema-derived relationships with user-created ones, dropping deleted.
function currentRelationships() {
  const merged = [...schemaRelationships, ...customRelationships];
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
    if (rel.custom) {
      group.dataset.custom = "true";
    }

    const hit = createSvg("path");
    hit.setAttribute("class", "relation-hit");

    const path = createSvg("path");
    path.setAttribute("class", "relation");

    const marker = createSvg("path");
    marker.setAttribute("class", "relation-marker");

    group.appendChild(hit);
    group.appendChild(path);
    group.appendChild(marker);
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
    relationEls.push({ rel, group, hit, path, marker, handle });
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

  relationEls.forEach(({ rel, hit, path, marker, handle }) => {
    const childCard = cardEl(rel.childId);
    const parentCard = cardEl(rel.parentId);
    if (!childCard || !parentCard) {
      hit.setAttribute("d", "");
      path.setAttribute("d", "");
      marker.setAttribute("d", "");
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
      if (handle) handle.hidden = true;
      return;
    }

    const routed = computeRoute(childAnchor, childSide, parentAnchor, parentSide, waypoint);
    const connectorPath = roundedPath(routed.points);
    hit.setAttribute("d", connectorPath);
    path.setAttribute("d", connectorPath);
    marker.setAttribute("d", buildMarkerPath(childAnchor, childSide, parentAnchor, parentSide));

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
    if (!card || !row) {
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

  const id = `${child.id}.${childField.name}__${parent.id}.${parentField.name}`;
  deletedRelationIds.delete(id);

  const exists = [...schemaRelationships, ...customRelationships].some((rel) => rel.id === id);
  if (!exists) {
    customRelationships.push({
      id,
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
  relationEls.forEach(({ group }) => group.classList.remove("is-active"));
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

function highlightTable(tableId) {
  diagramPanel?.classList.remove("is-relation-highlight-mode");
  clearHighlight();
  diagramPanel?.classList.add("is-focused");
  cardEl(tableId)?.classList.add("is-active");

  relationEls.forEach(({ rel, group }) => {
    const touches = rel.childId === tableId || rel.parentId === tableId;
    if (!touches) {
      return;
    }
    group.classList.add("is-active");
    cardEl(rel.childId)?.classList.add("is-active");
    cardEl(rel.parentId)?.classList.add("is-active");
    markRow(rel.childId, rel.childField, true);
    markRow(rel.parentId, rel.parentField, true);
  });
}

function applyRelationHighlightMode() {
  diagramPanel?.classList.toggle("is-relation-highlight-mode", relationHighlightEnabled);
  relationEls.forEach(({ group }) => group.classList.toggle("is-active", relationHighlightEnabled));
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
    relationEls.forEach(({ group }) => group.classList.remove("is-active"));
    document.querySelectorAll(".er-row.is-linked").forEach((row) => row.classList.remove("is-linked"));
    return;
  }
  applyRelationHighlightMode();
}

// ------------------------------------------------------------------ dragging
function enableDragging(card) {
  let pointerId = null;
  let moved = false;
  let startLeft = 0;
  let startTop = 0;
  let startX = 0;
  let startY = 0;

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    pointerId = event.pointerId;
    startLeft = Number.parseFloat(card.style.left || "0");
    startTop = Number.parseFloat(card.style.top || "0");
    startX = event.clientX;
    startY = event.clientY;
    moved = false;
    card.classList.add("is-dragging");
    card.setPointerCapture(pointerId);
    event.preventDefault();
  });

  card.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    moved = moved || Math.abs(event.clientX - startX) > 4 || Math.abs(event.clientY - startY) > 4;

    const nextLeft = Math.max(24, startLeft + (event.clientX - startX) / zoom);
    const nextTop = Math.max(72, startTop + (event.clientY - startY) / zoom);
    card.style.left = `${nextLeft}px`;
    card.style.top = `${nextTop}px`;

    resizeScene();
    updateRelationships();
    updateGroups();
  });

  function stop(event) {
    if (event.pointerId !== pointerId) {
      return;
    }
    card.classList.remove("is-dragging");
    card.dataset.dragMoved = moved ? "true" : "false";
    if (card.hasPointerCapture(pointerId)) {
      card.releasePointerCapture(pointerId);
    }
    pointerId = null;
    saveState();
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

    card.addEventListener("dblclick", () => {
      /* navegacion a table.html deshabilitada en el archivo unico */
    });

    const fields = card.querySelector(".er-card-fields.is-field-capped");
    if (fields) {
      fields.addEventListener("scroll", () => updateRelationships(), { passive: true });
    }

    enableDragging(card);
  });
}

// ------------------------------------------------------------- zoom / expand
function applyZoom() {
  if (!diagramScene || !zoomReadout) {
    return;
  }
  diagramScene.style.transform = `scale(${zoom})`;
  diagramScene.style.transformOrigin = "top left";
  zoomReadout.textContent = `${Math.round(zoom * 100)}%`;
}

function setZoom(next) {
  zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);
  applyZoom();
  updateRelationships();
  saveState();
}

function centerViewport() {
  if (!diagramViewport || !diagramScene || viewportCentered || !erCards.length) {
    return;
  }

  const bounds = erCards.reduce(
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

  const centerX = (bounds.minLeft + bounds.maxRight) / 2;
  const centerY = (bounds.minTop + bounds.maxBottom) / 2;
  diagramViewport.scrollLeft = Math.max(0, centerX * zoom - diagramViewport.clientWidth / 2);
  diagramViewport.scrollTop = Math.max(0, centerY * zoom - diagramViewport.clientHeight / 2);
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
  tableColorButton.textContent = target ? "Color" : "Select";
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
  const members = group.cardIds.map(cardEl).filter(Boolean);
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

function renderSchemaGroups() {
  if (!diagramScene) {
    return;
  }
  schemaGroupEls.splice(0).forEach((el) => el.remove());

  schemaGroups.forEach((group) => {
    const el = document.createElement("div");
    el.className = "table-group schema-table-group";
    el.dataset.schemaGroupId = group.id;
    el.innerHTML = `<div class="table-group-header"><span>${escapeHtml(group.name)}</span></div>`;
    el.style.setProperty("--group-color", group.color);
    diagramScene.appendChild(el);
    schemaGroupEls.push(el);
    enableGroupDrag(group, el.querySelector(".table-group-header"));
  });

  updateSchemaGroups();
}

function updateSchemaGroups() {
  schemaGroupEls.forEach((el) => {
    const group = schemaGroups.find((g) => g.id === el.dataset.schemaGroupId);
    const bounds = group && groupBounds(group);
    if (!bounds) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${bounds.left}px`;
    el.style.top = `${bounds.top}px`;
    el.style.width = `${bounds.width}px`;
    el.style.height = `${bounds.height}px`;
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
    el.innerHTML = `<div class="table-group-header"><span>${escapeHtml(group.name)}</span></div>`;
    if (group.color) {
      el.style.setProperty("--group-color", group.color);
    }
    diagramScene.appendChild(el);
    groupEls.push(el);

    const header = el.querySelector(".table-group-header");
    enableGroupDrag(group, header);
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
    const bounds = group && groupBounds(group);
    if (!bounds) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${bounds.left}px`;
    el.style.top = `${bounds.top}px`;
    el.style.width = `${bounds.width}px`;
    el.style.height = `${bounds.height}px`;
  });
}

function enableGroupDrag(group, header) {
  let pointerId = null;
  let moved = false;
  let startX = 0;
  let startY = 0;
  let startPositions = [];

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
    saveState();
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
  const index = groups.findIndex((g) => g.id === selectedGroupId);
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
      });
    }
  });
  renderGroups();
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
    clearSelection();
    setPendingConnector(null);
  }
  updateGroupButtons();
  updateRelationButtons();
  updateConnectorPositions();
  routeHandles.forEach((handle) => {
    handle.hidden = !editModeEnabled;
  });
}

// -------------------------------------------------------------------- search
function filterTables(query) {
  const normalized = query.trim().toLowerCase();

  document.querySelectorAll("[data-table-link]").forEach((link) => {
    const matches = !normalized || link.textContent.toLowerCase().includes(normalized);
    link.style.display = matches ? "" : "none";
  });

  erCards.forEach((card) => {
    const table = tableById[card.dataset.erCard];
    const matches = !normalized || (table && table.title.toLowerCase().includes(normalized));
    card.classList.toggle("is-dimmed", Boolean(normalized) && !matches);
  });
}

// --------------------------------------------------------------- persistence
function saveState() {
  if (!diagramScene) {
    return;
  }
  const positions = {};
  erCards.forEach((card) => {
    positions[card.dataset.erCard] = {
      left: Number.parseFloat(card.style.left || "0"),
      top: Number.parseFloat(card.style.top || "0"),
    };
  });

  const state = {
    version: 5,
    zoom,
    positions,
    colors: cardColors,
    customRelationships: customRelationships.map((rel) => ({
      id: rel.id,
      childId: rel.childId,
      childField: rel.childField,
      parentId: rel.parentId,
      parentField: rel.parentField,
      custom: true,
    })),
    deletedRelationIds: Array.from(deletedRelationIds),
    relationRoutes,
    groups: groups.map((group) => ({
      id: group.id,
      name: group.name,
      cardIds: group.cardIds,
      color: group.color,
    })),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to persist diagram state", error);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Unable to read saved diagram state", error);
    return null;
  }
}

// -------------------------------------------------------------- toolbar wiring
function bindToolbar() {
  searchInput?.addEventListener("input", (event) => {
    filterTables(event.target.value);
    setActiveLink();
  });

  editModeButton?.addEventListener("click", () => {
    editModeEnabled = !editModeEnabled;
    updateEditModeUi();
    clearHighlight();
  });

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

  groupTablesButton?.addEventListener("click", createGroupFromSelection);
  deleteGroupButton?.addEventListener("click", deleteSelectedGroup);
  deleteRelationButton?.addEventListener("click", deleteSelectedRelation);
  relationHighlightButton?.addEventListener("click", () => {
    setRelationHighlightMode(!relationHighlightEnabled);
  });
}

// ---------------------------------------------------------------------- init
function initializeModeler() {
  renderSidebar();

  if (detailShell) {
    renderDetail();
    setActiveLink();
    return;
  }

  if (!diagramScene) {
    setActiveLink();
    return;
  }

  schemaRelationships = deriveRelationships();
  buildSchemaGroups();
  const state = loadState();

  if (Array.isArray(state?.customRelationships)) {
    customRelationships = state.customRelationships.filter(
      (rel) => rel && tableById[rel.childId] && tableById[rel.parentId]
    );
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
  renderCards(state?.positions);
  applyColors(state?.colors);
  createFieldConnectors();
  rebuildRelationships();
  bindCards();
  bindCommentTooltips();
  bindToolbar();
  renderSchemaGroups();
  restoreGroups(state?.groups);

  if (typeof state?.zoom === "number") {
    zoom = clamp(state.zoom, MIN_ZOOM, MAX_ZOOM);
  }

  resizeScene();
  applyZoom();
  updateRelationships();
  updateGroups();
  updateEditModeUi();
  centerViewport();
  setActiveLink();

  if (!state) {
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
