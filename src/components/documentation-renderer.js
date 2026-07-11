const app = document.querySelector("#docApp");

const state = {
  groups: [],
  objects: [],
  selectedKey: "",
  query: "",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function label(value, fallback = "Sin dato") {
  return String(value ?? "").trim() || fallback;
}

function objectType(object) {
  const tag = String(object.tag || "").toLowerCase();
  if (tag.includes("fact")) return "Tabla de hechos";
  if (tag.includes("dim")) return "Dimension";
  if (tag.includes("view") || tag.includes("vista")) return "Vista";
  return label(object.tag, "Tabla");
}

function objectIcon(object) {
  const type = objectType(object).toLowerCase();
  if (type.includes("vista")) return "▤";
  if (type.includes("hechos")) return "▦";
  if (type.includes("dimension")) return "▥";
  return "▧";
}

function groupName(entry, table) {
  return label(table.dbmlProject || table.dbmlGroup || entry.name || entry.id, "Objetos");
}

function objectSearchText(object) {
  return [
    object.title,
    object.tag,
    object.description,
    object.groupName,
    ...(object.fields || []).flatMap((field) => [field.name, field.type, field.note, field.key]),
  ]
    .join(" ")
    .toLowerCase();
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}: ${response.status}`);
  return response.json();
}

async function loadDocumentation() {
  const manifest = await fetchJson("assets/data/model-schemas.json");
  const loaded = await Promise.all(
    (manifest.schemas || []).map(async (entry) => ({
      entry,
      tables: await fetchJson(`assets/data/${entry.file}`),
    }))
  );

  const groups = new Map();
  loaded.forEach(({ entry, tables }) => {
    (tables || []).forEach((table, index) => {
      const name = groupName(entry, table);
      const id = slug(name) || entry.id || "objetos";
      const object = {
        ...table,
        key: `${entry.id}:${table.id || index}`,
        schemaEntry: entry,
        groupId: id,
        groupName: name,
      };
      if (!groups.has(id)) {
        groups.set(id, { id, name, open: true, objects: [] });
      }
      groups.get(id).objects.push(object);
    });
  });

  state.groups = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
  state.groups.forEach((group) => group.objects.sort((a, b) => label(a.title).localeCompare(label(b.title))));
  state.objects = state.groups.flatMap((group) => group.objects);
  state.selectedKey = new URLSearchParams(window.location.hash.slice(1)).get("object") || state.objects[0]?.key || "";
}

function selectedObject() {
  return state.objects.find((object) => object.key === state.selectedKey) || state.objects[0] || null;
}

function filteredGroups() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.groups;
  return state.groups
    .map((group) => ({
      ...group,
      objects: group.objects.filter((object) => objectSearchText(object).includes(q)),
    }))
    .filter((group) => group.objects.length);
}

function metaItem(labelText, value) {
  if (!String(value ?? "").trim()) return "";
  return `<div class="doc-meta-item"><span>${escapeHtml(labelText)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function badge(value) {
  if (!String(value || "").trim()) return "";
  return `<span class="doc-badge">${escapeHtml(value)}</span>`;
}

function renderIndex() {
  const groups = filteredGroups();
  return `
    <aside class="doc-index" aria-label="Indice de objetos">
      <div class="doc-index-head">
        <strong>Indice</strong>
        <span>${state.objects.length} objetos</span>
      </div>
      <div class="doc-index-groups">
        ${groups
          .map(
            (group) => `
              <details class="doc-group" data-group-id="${escapeHtml(group.id)}" ${group.open ? "open" : ""}>
                <summary>${escapeHtml(group.name)} <span>${group.objects.length}</span></summary>
                <div class="doc-object-list">
                  ${group.objects
                    .map(
                      (object) => `
                        <button class="doc-object ${object.key === state.selectedKey ? "is-active" : ""}" type="button" data-object-key="${escapeHtml(object.key)}">
                          <span class="doc-object-icon" aria-hidden="true">${objectIcon(object)}</span>
                          <span>${escapeHtml(object.title)}</span>
                        </button>`
                    )
                    .join("")}
                </div>
              </details>`
          )
          .join("")}
      </div>
    </aside>`;
}

function renderOverview(object) {
  const fieldCount = object.fields?.length || 0;
  const relationCount = object.relations?.length || 0;
  return `
    <section class="doc-panel doc-overview">
      <h2>${escapeHtml(object.title)}</h2>
      ${
        object.description
          ? `<p>${escapeHtml(object.description)}</p>`
          : `<p class="doc-muted">No hay descripcion registrada para este objeto.</p>`
      }
      <div class="doc-meta-grid">
        ${metaItem("Tipo", objectType(object))}
        ${metaItem("Esquema", object.groupName)}
        ${metaItem("Columnas", fieldCount)}
        ${metaItem("Relaciones", relationCount)}
      </div>
    </section>`;
}

function renderStructure(object) {
  const fields = object.fields || [];
  return `
    <section class="doc-panel doc-structure">
      <div class="doc-section-head">
        <div>
          <h2>Estructura del objeto</h2>
          <span>${fields.length} columnas</span>
        </div>
        <button class="doc-secondary" type="button" data-export-object>Exportar JSON</button>
      </div>
      <div class="doc-table-wrap">
        <table class="doc-table">
          <thead>
            <tr>
              <th>Columna</th>
              <th>Tipo de dato</th>
              <th>Clave</th>
              <th>Descripcion</th>
            </tr>
          </thead>
          <tbody>
            ${
              fields.length
                ? fields
                    .map(
                      (field) => `
                        <tr>
                          <td><strong>${escapeHtml(field.name)}</strong></td>
                          <td>${escapeHtml(field.type || "-")}</td>
                          <td>${badge(field.key) || '<span class="doc-muted">-</span>'}</td>
                          <td>${escapeHtml(field.note || "-")}</td>
                        </tr>`
                    )
                    .join("")
                : `<tr><td colspan="4" class="doc-empty">No hay columnas registradas.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>`;
}

function render() {
  const object = selectedObject();
  if (!object) {
    app.innerHTML = `<section class="doc-loading">No hay objetos disponibles para documentar.</section>`;
    return;
  }
  state.selectedKey = object.key;
  app.innerHTML = `
    <section class="doc-layout">
      ${renderIndex()}
      <main class="doc-main">
        ${renderOverview(object)}
        ${renderStructure(object)}
      </main>
    </section>`;
  bindEvents(object);
}

function exportObject(object) {
  const blob = new Blob([`${JSON.stringify(object, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `documentacion_${slug(object.title)}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindEvents(object) {
  document.querySelectorAll("[data-object-key]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKey = button.dataset.objectKey || "";
      window.location.hash = new URLSearchParams({ object: state.selectedKey }).toString();
      render();
    });
  });
  document.querySelectorAll(".doc-group").forEach((details) => {
    details.addEventListener("toggle", () => {
      const group = state.groups.find((item) => item.id === details.dataset.groupId);
      if (group) group.open = details.open;
    });
  });
  document.querySelectorAll("[data-export-object]").forEach((button) => {
    button.addEventListener("click", () => exportObject(object));
  });
}

loadDocumentation()
  .then(render)
  .catch((error) => {
    console.error(error);
    app.innerHTML = `<section class="doc-loading">No se pudo cargar la documentacion.</section>`;
  });
