// Renderer de la seccion Documentacion.
// Data-driven: lee assets/data/docs/manifest.json y arma:
//  - pestanas por perfil (audiencia)
//  - indice colapsable por categoria
//  - panel de contenido con breadcrumb
// El contenido de cada pagina es Markdown (docs/<perfil>/<pagina>.md).
// Mientras una pagina este en "draft", se muestra un placeholder y NO se pide el .md.

const state = {
  manifest: null,
  profileId: "",
  pageId: "",
  variant: "onprem",
  unitId: "",
  collapsed: new Set(),
  spyId: "",
  spyTarget: null,
  spyHandler: null,
};

let app = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}: ${response.status}`);
  return response.json();
}

function currentProfile() {
  const profiles = state.manifest?.profiles || [];
  return profiles.find((profile) => profile.id === state.profileId) || profiles[0] || null;
}

// Un nodo es "pagina" si tiene archivo; si no, es un grupo contenedor.
function isPage(node) {
  return typeof node.file === "string";
}

// Hijos de un nodo en orden. Soporta `children` (orden mixto pagina/grupo) o
// el par `pages` + `groups` (paginas primero, luego grupos).
function childrenOf(node) {
  if (Array.isArray(node.children)) return node.children;
  return [...(node.pages || []), ...(node.groups || [])];
}

// Recorre un nodo (capa) aplanando sus paginas. Cada pagina se anota con:
//  - trail / idTrail: ruta de nombres e ids ancestros (para eyebrow y apertura)
//  - unitId / unitName: la "unidad" (capa) a la que pertenece. Un documento
//    continuo agrupa todas las paginas con el mismo unitId.
function collectPages(node, trailNames, trailIds, unit, out) {
  if (isPage(node)) {
    out.push({ ...node, trail: trailNames, idTrail: trailIds, unitId: unit.id, unitName: unit.name });
    return;
  }
  const names = [...trailNames, node.name];
  const ids = [...trailIds, node.id];
  childrenOf(node).forEach((child) => collectPages(child, names, ids, unit, out));
}

// El nivel "capa" (unidad de documento) = hijo directo de una categoria.
function allPages(profile) {
  const out = [];
  (profile?.categories || []).forEach((category) => {
    childrenOf(category).forEach((unit) => {
      const unitInfo = { id: unit.id, name: isPage(unit) ? unit.title : unit.name };
      collectPages(unit, [category.name], [category.id], unitInfo, out);
    });
  });
  return out;
}

function findPage(profile, pageId) {
  const pages = allPages(profile);
  return pages.find((page) => page.id === pageId) || pages[0] || null;
}

// Cuenta recursiva de paginas bajo un nodo.
function countPages(node) {
  return childrenOf(node).reduce((sum, child) => sum + (isPage(child) ? 1 : countPages(child)), 0);
}

function readHash() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return { profile: params.get("profile") || "", page: params.get("page") || "" };
}

function writeHash() {
  const params = new URLSearchParams({ profile: state.profileId, page: state.pageId });
  window.location.hash = params.toString();
}

// Markdown ligero: encabezados, listas (orden/desorden), tablas, bloques de
// codigo, citas, reglas, negritas/cursivas, codigo inline y enlaces.
function inlineMd(text) {
  return escapeHtml(text)
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function renderTable(rows) {
  const cells = (line) =>
    line
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim());
  const head = cells(rows[0]);
  const bodyRows = rows.slice(2);
  const thead = `<thead><tr>${head.map((cell) => `<th>${inlineMd(cell)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map((row) => `<tr>${cells(row).map((cell) => `<td>${inlineMd(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<div class="docs-table-wrap"><table class="docs-md-table">${thead}${tbody}</table></div>`;
}

function renderMarkdown(md) {
  const lines = String(md).replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].replace(/\s+$/, "");

    // Bloque de variante On-Premise / Cloud  :::onprem ... :::  /  :::cloud ... :::
    const variantMatch = line.match(/^:::(onprem|cloud)\s*$/);
    if (variantMatch) {
      const variant = variantMatch[1];
      const buffer = [];
      i += 1;
      while (i < lines.length && !/^:::\s*$/.test(lines[i].trim())) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1; // salta el ::: de cierre
      const label = variant === "onprem" ? "On-Premise · Cloudera" : "Cloud · AWS";
      html.push(
        `<div class="docs-variant" data-variant="${variant}"><div class="docs-variant-label">${label}</div>${renderMarkdown(buffer.join("\n"))}</div>`
      );
      continue;
    }

    // Bloque de codigo cercado
    if (/^```/.test(line)) {
      const buffer = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buffer.push(escapeHtml(lines[i]));
        i += 1;
      }
      i += 1;
      html.push(`<pre class="docs-code"><code>${buffer.join("\n")}</code></pre>`);
      continue;
    }

    // Tabla
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
      const rows = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i].trim())) {
        rows.push(lines[i].trim());
        i += 1;
      }
      html.push(renderTable(rows));
      continue;
    }

    // Encabezados
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      html.push(`<h${level}>${inlineMd(line.replace(/^#+\s/, ""))}</h${level}>`);
      i += 1;
      continue;
    }

    // Regla horizontal
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      html.push("<hr />");
      i += 1;
      continue;
    }

    // Cita
    if (/^>\s?/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buffer.push(inlineMd(lines[i].replace(/^>\s?/, "")));
        i += 1;
      }
      html.push(`<blockquote>${buffer.join("<br />")}</blockquote>`);
      continue;
    }

    // Lista ordenada
    if (/^\d+\.\s/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        buffer.push(`<li>${inlineMd(lines[i].replace(/^\d+\.\s/, ""))}</li>`);
        i += 1;
      }
      html.push(`<ol>${buffer.join("")}</ol>`);
      continue;
    }

    // Lista desordenada
    if (/^[-*]\s/.test(line)) {
      const buffer = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        buffer.push(`<li>${inlineMd(lines[i].replace(/^[-*]\s/, ""))}</li>`);
        i += 1;
      }
      html.push(`<ul>${buffer.join("")}</ul>`);
      continue;
    }

    // Linea en blanco
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Parrafo
    html.push(`<p>${inlineMd(line)}</p>`);
    i += 1;
  }
  return html.join("\n");
}

function renderTabs() {
  return `
    <div class="docs-tabs" role="tablist" aria-label="Perfiles de documentacion">
      ${(state.manifest.profiles || [])
        .map(
          (profile) => `
            <button class="docs-tab ${profile.id === state.profileId ? "is-active" : ""}" type="button" role="tab" data-profile-id="${escapeHtml(profile.id)}">
              <span class="docs-tab-name">${escapeHtml(profile.name)}</span>
              <span class="docs-tab-audience">${escapeHtml(profile.audience)}</span>
            </button>`
        )
        .join("")}
    </div>`;
}

function renderPageButton(page) {
  return `
    <button class="docs-page ${page.id === state.pageId ? "is-active" : ""}" type="button" data-page-id="${escapeHtml(page.id)}">
      <span class="docs-caret-slot" aria-hidden="true"></span>
      <span class="docs-page-label">${escapeHtml(page.title)}</span>${page.draft ? '<span class="docs-draft">borrador</span>' : ""}
    </button>`;
}

// Render de los hijos de un nodo, en orden: paginas como botones, grupos como <details>.
function renderChildren(node, activePage, depth) {
  return childrenOf(node)
    .map((child) => (isPage(child) ? renderPageButton(child) : renderGroup(child, activePage, depth)))
    .join("");
}

// Render recursivo de un grupo (o categoria) como <details> colapsable.
function renderGroup(node, activePage, depth) {
  // El estado colapsado se preserva entre navegaciones via state.collapsed.
  const isOpen = !state.collapsed.has(node.id);
  return `
    <details class="docs-group" data-depth="${depth}" data-group-id="${escapeHtml(node.id)}" ${isOpen ? "open" : ""}>
      <summary>
        <span class="docs-caret-slot"><span class="docs-caret" aria-hidden="true">▸</span></span>
        <span class="docs-node-head">
          <strong>${escapeHtml(node.name)}</strong>
          ${node.description ? `<span class="docs-node-desc">${escapeHtml(node.description)}</span>` : ""}
        </span>
        <span class="docs-count">${countPages(node)}</span>
      </summary>
      <div class="docs-page-list">
        ${renderChildren(node, activePage, depth + 1)}
      </div>
    </details>`;
}

function renderIndex(profile, activePage) {
  return `
    <aside class="docs-index" aria-label="Indice de la documentacion">
      <div class="docs-index-head">
        <strong>${escapeHtml(profile.name)}</strong>
        <span>${escapeHtml(profile.description || "")}</span>
      </div>
      <div class="docs-index-groups">
        ${(profile.categories || []).map((category) => renderGroup(category, activePage, 0)).join("")}
      </div>
    </aside>`;
}

function seeAlsoLinks(page) {
  if (!page.seeAlso?.length) return "";
  const items = page.seeAlso
    .map((ref) => {
      const [profileId, pageId] = String(ref).split("/");
      const profile = (state.manifest.profiles || []).find((p) => p.id === profileId);
      const target = profile ? findPage(profile, pageId) : null;
      if (!profile || !target) return "";
      return `<li><a href="#" data-goto-profile="${escapeHtml(profileId)}" data-goto-page="${escapeHtml(pageId)}">${escapeHtml(profile.name)} › ${escapeHtml(target.title)}</a></li>`;
    })
    .filter(Boolean)
    .join("");
  return items ? `<div class="docs-seealso"><h3>Ver tambien</h3><ul>${items}</ul></div>` : "";
}

// Construye una <section> del documento continuo para una pagina.
async function buildSection(page) {
  const tags = (page.tags || []).map((tag) => `<span class="docs-tag">${escapeHtml(tag)}</span>`).join("");
  const eyebrow = (page.trail || []).map((name) => escapeHtml(name)).join(" › ");
  let body;
  let hasVariants = false;
  if (page.draft) {
    body = `
      <div class="docs-placeholder">
        <p>Esta pagina aun no tiene contenido.</p>
        <p class="docs-placeholder-hint">El contenido vivira en <code>${escapeHtml(page.file)}</code> (Markdown) y se mostrara aqui automaticamente.</p>
      </div>`;
  } else {
    try {
      const response = await fetch(`assets/data/${page.file}`);
      if (!response.ok) throw new Error(String(response.status));
      const raw = await response.text();
      // El titulo ya se muestra en el encabezado de la seccion; quitamos el H1 inicial del Markdown.
      const withoutTitle = raw.replace(/^\uFEFF?\s*#\s+[^\n]*\n+/, "");
      hasVariants = /^:::(onprem|cloud)\s*$/m.test(withoutTitle);
      body = `<div class="docs-markdown">${renderMarkdown(withoutTitle)}</div>`;
    } catch (_) {
      body = `<div class="docs-placeholder"><p>No se pudo cargar el contenido de <code>${escapeHtml(page.file)}</code>.</p></div>`;
    }
  }
  const html = `
    <section class="docs-section" id="sec-${escapeHtml(page.id)}" data-page-id="${escapeHtml(page.id)}">
      ${eyebrow ? `<div class="docs-eyebrow">${eyebrow}</div>` : ""}
      <h2 class="docs-section-title">${escapeHtml(page.title)}</h2>
      ${tags ? `<div class="docs-tags">${tags}</div>` : ""}
      ${body}
      ${seeAlsoLinks(page)}
    </section>`;
  return { html, hasVariants };
}

async function render() {
  const profile = currentProfile();
  if (!profile) {
    app.innerHTML = `<section class="docs-loading">No hay documentacion disponible.</section>`;
    return;
  }
  state.profileId = profile.id;
  const allProfilePages = allPages(profile);
  const activePage = findPage(profile, state.pageId);
  state.pageId = activePage?.id || allProfilePages[0]?.id || "";
  state.unitId = activePage?.unitId || allProfilePages[0]?.unitId || "";
  // Asegura visible la rama de la pagina activa, preservando el resto del estado.
  (activePage?.idTrail || []).forEach((id) => state.collapsed.delete(id));
  applyVariant();

  app.innerHTML = `
    <section class="docs-shell">
      ${renderTabs()}
      <div class="docs-layout">
        ${renderIndex(profile, activePage)}
        <main class="docs-main" id="docsMain"><div class="docs-loading">Cargando contenido...</div></main>
      </div>
    </section>`;
  bindShellEvents();

  // Documento continuo por CAPA: solo las paginas de la unidad activa.
  const pages = allProfilePages.filter((p) => p.unitId === state.unitId);
  const built = await Promise.all(pages.map((p) => buildSection(p)));
  const hasVariants = built.some((b) => b.hasVariants);
  const main = app.querySelector("#docsMain");
  if (!main) return;
  main.innerHTML = `
    ${
      hasVariants
        ? `<div class="docs-toolbar">
             <span class="docs-toolbar-label">Entorno</span>
             <div class="docs-variant-toggle" role="group" aria-label="Entorno tecnologico">
               <button type="button" data-variant-btn="onprem" class="${state.variant === "onprem" ? "is-active" : ""}">On-Premise</button>
               <button type="button" data-variant-btn="cloud" class="${state.variant === "cloud" ? "is-active" : ""}">Cloud</button>
             </div>
           </div>`
        : ""
    }
    ${built.map((b) => b.html).join("") || `<div class="docs-placeholder"><p>Este perfil aun no tiene paginas.</p></div>`}`;
  bindContentEvents();
  setupScrollSpy();
  // Posiciona en la seccion indicada por el hash (sin animacion en la carga inicial).
  scrollToPage(state.pageId, false);
}

function applyVariant() {
  if (!app) return;
  app.classList.toggle("variant-cloud", state.variant === "cloud");
  app.classList.toggle("variant-onprem", state.variant === "onprem");
}

function goTo(profileId, pageId) {
  state.profileId = profileId;
  state.pageId = pageId || "";
  writeHash();
  render();
}

// Eventos del cascaron (pestanas de perfil e indice como tabla de contenidos).
function bindShellEvents() {
  app.querySelectorAll("[data-profile-id]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const profile = (state.manifest.profiles || []).find((p) => p.id === tab.dataset.profileId);
      goTo(tab.dataset.profileId, allPages(profile)[0]?.id || "");
    });
  });
  app.querySelectorAll(".docs-index [data-page-id]").forEach((button) => {
    button.addEventListener("click", () => goToPage(button.dataset.pageId));
  });
  // Persistencia del estado colapsado/expandido de cada grupo.
  app.querySelectorAll(".docs-index details.docs-group").forEach((details) => {
    details.addEventListener("toggle", () => {
      const id = details.dataset.groupId;
      if (!id) return;
      if (details.open) state.collapsed.delete(id);
      else state.collapsed.add(id);
    });
  });
}

// Navega a una pagina: si es de otra capa cambia de documento; si es de la
// capa actual solo hace scroll a su seccion.
function goToPage(pageId) {
  const profile = currentProfile();
  const page = allPages(profile).find((p) => p.id === pageId);
  if (!page) return;
  if (page.unitId !== state.unitId) {
    state.pageId = pageId;
    render();
  } else {
    const btn = app.querySelector(`.docs-index [data-page-id="${pageId}"]`);
    if (btn) openAncestors(btn);
    scrollToPage(pageId, true);
  }
}

// Eventos del contenido (toggle de variante y enlaces "ver tambien").
function bindContentEvents() {
  app.querySelectorAll("[data-variant-btn]").forEach((button) => {
    button.addEventListener("click", () => {
      state.variant = button.dataset.variantBtn;
      applyVariant();
      app
        .querySelectorAll("[data-variant-btn]")
        .forEach((b) => b.classList.toggle("is-active", b.dataset.variantBtn === state.variant));
    });
  });
  app.querySelectorAll("[data-goto-page]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const profileId = link.dataset.gotoProfile;
      const pageId = link.dataset.gotoPage;
      if (profileId === state.profileId) {
        goToPage(pageId);
      } else {
        goTo(profileId, pageId);
      }
    });
  });
}

// Abre todos los <details> ancestros de un elemento del indice.
function openAncestors(el) {
  let details = el.closest("details");
  while (details) {
    details.open = true;
    details = details.parentElement ? details.parentElement.closest("details") : null;
  }
}

function setActiveNav(pageId) {
  app
    .querySelectorAll(".docs-index [data-page-id]")
    .forEach((b) => b.classList.toggle("is-active", b.dataset.pageId === pageId));
}

function scrollToPage(pageId, smooth) {
  if (!pageId) return;
  const section = app.querySelector(`.docs-section[data-page-id="${pageId}"]`);
  if (!section) return;
  section.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  setActiveNav(pageId);
  state.pageId = pageId;
  writeHash();
}

// Encuentra el ancestro con scroll; si no hay, usa la ventana.
function getScrollParent(node) {
  let el = node ? node.parentElement : null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return window;
}

// Resalta en el indice la seccion visible mas cercana al tope al desplazarse.
function setupScrollSpy() {
  if (state.spyTarget && state.spyHandler) {
    state.spyTarget.removeEventListener("scroll", state.spyHandler);
  }
  const target = getScrollParent(app.querySelector("#docsMain"));
  const handler = () => {
    const sections = Array.from(app.querySelectorAll(".docs-section"));
    if (!sections.length) return;
    let currentId = sections[0].dataset.pageId;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 120) currentId = section.dataset.pageId;
      else break;
    }
    if (currentId && currentId !== state.spyId) {
      state.spyId = currentId;
      state.pageId = currentId;
      setActiveNav(currentId);
    }
  };
  target.addEventListener("scroll", handler, { passive: true });
  state.spyTarget = target;
  state.spyHandler = handler;
  handler();
}

export async function mountDocumentation(target) {
  app = target;
  app.classList.add("docs-app");
  app.innerHTML = `<section class="docs-loading">Cargando documentacion...</section>`;
  try {
    if (!state.manifest) {
      state.manifest = await fetchJson("assets/data/docs/manifest.json");
    }
    const hash = readHash();
    state.profileId = hash.profile || state.manifest.profiles?.[0]?.id || "";
    state.pageId = hash.page || "";
    await render();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="docs-loading">No se pudo cargar la documentacion.</section>`;
  }
}
