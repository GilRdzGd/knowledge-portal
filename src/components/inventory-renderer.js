const state = {
  groups: [],
  objects: [],
  selectedKey: "",
  query: "",
};

let app = null;

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

function viewName(entry) {
  return label(entry.name || entry.id, "Vista");
}

function cssColor(value, fallback = "#2563eb") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function objectSearchText(object) {
  return [
    object.title,
    object.tag,
    object.description,
    object.viewName,
    object.domainName,
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
    const name = viewName(entry);
    const id = entry.id || slug(name) || "vista";
    if (!groups.has(id)) {
      groups.set(id, { id, name, color: "#2563eb", open: false, objects: [] });
    }
    (tables || []).forEach((table, index) => {
      const object = {
        ...table,
        key: `${entry.id}:${table.id || index}`,
        schemaEntry: entry,
        groupId: id,
        viewName: name,
        domainName: label(table.group, ""),
        groupColor: cssColor(table.groupColor, "#2563eb"),
        objectColor: cssColor(table.headerColor, table.groupColor || "#2563eb"),
      };
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
                <summary style="--doc-group-color:${escapeHtml(group.color)}">
                  <i class="doc-group-color" aria-hidden="true"></i>
                  <strong>${escapeHtml(group.name)}</strong>
                  <span>${group.objects.length}</span>
                </summary>
                <div class="doc-object-list">
                  ${group.objects
                    .map(
                      (object) => `
                        <button class="doc-object ${object.key === state.selectedKey ? "is-active" : ""}" type="button" data-object-key="${escapeHtml(object.key)}" style="--doc-object-color:${escapeHtml(object.objectColor)}">
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
  const relationCount = object.modelRelations?.length || 0;
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
        ${metaItem("Vista", object.viewName)}
        ${metaItem("Dominio", object.domainName)}
        ${metaItem("Color", object.headerColor)}
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
        <button class="doc-secondary" type="button" data-export-object>Exportar MD</button>
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

function markdownTableRow(values) {
  return `| ${values.map((value) => String(value ?? "-").replace(/\|/g, "\\|")).join(" | ")} |`;
}

function objectMarkdown(object) {
  const fields = object.fields || [];
  const lines = [
    `# ${object.title}`,
    "",
    object.description || "No hay descripcion registrada para este objeto.",
    "",
    "## Resumen",
    "",
    markdownTableRow(["Campo", "Valor"]),
    markdownTableRow(["---", "---"]),
    markdownTableRow(["Tipo", objectType(object)]),
    markdownTableRow(["Vista", object.viewName]),
    markdownTableRow(["Dominio", object.domainName || "-"]),
    markdownTableRow(["Color", object.headerColor || "-"]),
    markdownTableRow(["Columnas", fields.length]),
    markdownTableRow(["Relaciones", object.modelRelations?.length || 0]),
    "",
    "## Estructura",
    "",
    markdownTableRow(["Columna", "Tipo de dato", "Clave", "Descripcion"]),
    markdownTableRow(["---", "---", "---", "---"]),
    ...fields.map((field) => markdownTableRow([field.name, field.type || "-", field.key || "-", field.note || "-"])),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function exportObject(object) {
  const blob = new Blob([objectMarkdown(object)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `documentacion_${slug(object.title)}.md`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindEvents(object) {
  app.querySelectorAll("[data-object-key]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedKey = button.dataset.objectKey || "";
      window.location.hash = new URLSearchParams({ object: state.selectedKey }).toString();
      render();
    });
  });
  app.querySelectorAll(".doc-group").forEach((details) => {
    details.addEventListener("toggle", () => {
      const group = state.groups.find((item) => item.id === details.dataset.groupId);
      if (group) group.open = details.open;
    });
  });
  app.querySelectorAll("[data-export-object]").forEach((button) => {
    button.addEventListener("click", () => exportObject(object));
  });
}

export async function mountInventory(target) {
  app = target;
  app.classList.add("doc-app");
  app.innerHTML = `<section class="doc-loading">Cargando documentacion...</section>`;
  try {
    await loadDocumentation();
    render();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="doc-loading">No se pudo cargar la documentacion.</section>`;
  }
}

const standaloneApp = document.querySelector("#docApp");
if (standaloneApp) {
  mountInventory(standaloneApp);
}
