// Generador de nomenclatura por etapas.
// Flujo: el usuario elige entorno -> zona -> sub-zona -> objeto (con botones).
// Al llegar a un objeto con `template`, se piden los campos de contexto y se
// generan los nombres/rutas/jobs a partir del catalogo de prefijos.

const state = {
  catalog: null,
  trail: [], // [{ stepId, value, label, title }]
  stepId: "",
  templateId: "",
  values: {},
};

let app = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Normaliza un valor libre a token seguro: minusculas, sin acentos, guion_bajo.
function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function substitute(pattern, tokens) {
  return String(pattern).replace(/\{(\w+)\}/g, (_, key) => (tokens[key] !== undefined ? tokens[key] : `{${key}}`));
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path}: ${response.status}`);
  return response.json();
}

function currentTemplate() {
  return state.templateId ? state.catalog.templates[state.templateId] : null;
}

function buildTokens(template) {
  const tokens = { company: state.catalog.company };
  (template.fields || []).forEach((field) => {
    tokens[field.id] = normalizeToken(state.values[field.id]);
  });
  tokens.name = substitute(template.name, tokens);
  return tokens;
}

function allRequiredFilled(template) {
  return (template.fields || []).every((field) => !field.required || normalizeToken(state.values[field.id]));
}

function reset() {
  state.trail = [];
  state.stepId = state.catalog.start;
  state.templateId = "";
  state.values = {};
}

function selectOption(step, option) {
  state.trail.push({ stepId: state.stepId, value: option.value, label: option.label, title: step.title });
  if (option.template) {
    state.templateId = option.template;
    state.stepId = "";
    state.values = {};
  } else if (option.next) {
    state.stepId = option.next;
    state.templateId = "";
  }
  render();
}

function goBackTo(index) {
  // Regresa el flujo al estado previo al paso `index` del trail.
  const entry = state.trail[index];
  state.trail = state.trail.slice(0, index);
  state.stepId = entry.stepId;
  state.templateId = "";
  state.values = {};
  render();
}

function renderTrail() {
  if (!state.trail.length) return "";
  const chips = state.trail
    .map(
      (entry, index) =>
        `<button class="nom-chip" type="button" data-trail="${index}"><span class="nom-chip-title">${escapeHtml(entry.title)}</span><span class="nom-chip-value">${escapeHtml(entry.label)}</span></button>`
    )
    .join('<span class="nom-chip-sep">›</span>');
  return `<div class="nom-trail">${chips}</div>`;
}

function renderStep() {
  const step = state.catalog.steps[state.stepId];
  if (!step) return "";
  return `
    <div class="nom-step">
      <h3 class="nom-step-title">${escapeHtml(step.title)}</h3>
      ${step.question ? `<p class="nom-step-q">${escapeHtml(step.question)}</p>` : ""}
      <div class="nom-options">
        ${step.options
          .map(
            (option) => `
              <button class="nom-option ${option.disabled ? "is-disabled" : ""}" type="button"
                data-option="${escapeHtml(option.value)}" ${option.disabled ? "disabled" : ""}>
                <span class="nom-option-label">${escapeHtml(option.label)}</span>
                ${option.hint ? `<span class="nom-option-hint">${escapeHtml(option.hint)}</span>` : ""}
              </button>`
          )
          .join("")}
      </div>
    </div>`;
}

function renderTemplate() {
  const template = currentTemplate();
  if (!template) return "";
  const tokens = buildTokens(template);
  const ready = allRequiredFilled(template);
  const fields = (template.fields || [])
    .map(
      (field) => `
        <label class="nom-field">
          <span class="nom-field-label">${escapeHtml(field.label)}${field.required ? ' <em>*</em>' : ""}</span>
          <input class="nom-input" type="text" data-field="${escapeHtml(field.id)}"
            value="${escapeHtml(state.values[field.id] || "")}" placeholder="${escapeHtml(field.placeholder || "")}" autocomplete="off" />
        </label>`
    )
    .join("");

  const outputs = ready
    ? (template.outputs || [])
        .map((output) => {
          const value = substitute(output.pattern, tokens);
          return `
            <div class="nom-output">
              <div class="nom-output-head">
                <span class="nom-output-label">${escapeHtml(output.label)}</span>
                ${output.proposed ? '<span class="nom-badge">propuesta</span>' : ""}
              </div>
              <div class="nom-output-value">
                <code>${escapeHtml(value)}</code>
                <button class="nom-copy" type="button" data-copy="${escapeHtml(value)}" title="Copiar">Copiar</button>
              </div>
            </div>`;
        })
        .join("")
    : `<p class="nom-hint">Completa los campos marcados con <em>*</em> para generar los nombres.</p>`;

  return `
    <div class="nom-generator">
      <div class="nom-form">
        <h3 class="nom-step-title">${escapeHtml(template.label)} — contexto</h3>
        <p class="nom-step-q">Escribe el contexto; se normaliza a minúsculas y guion_bajo automáticamente.</p>
        ${fields}
      </div>
      <div class="nom-results">
        <h3 class="nom-results-title">Resultado</h3>
        ${outputs}
      </div>
    </div>`;
}

function render() {
  app.innerHTML = `
    <section class="nom-shell">
      <header class="nom-header">
        <h2>Generador de nomenclatura</h2>
        <p>Arma el nombre de un objeto de datos por etapas, según el catálogo de prefijos.</p>
        <button class="nom-reset" type="button" data-reset>Empezar de nuevo</button>
      </header>
      ${renderTrail()}
      ${state.templateId ? renderTemplate() : renderStep()}
    </section>`;
  bindEvents();
}

function bindEvents() {
  const step = state.catalog.steps[state.stepId];
  app.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!step) return;
      const option = step.options.find((o) => o.value === button.dataset.option);
      if (option && !option.disabled) selectOption(step, option);
    });
  });
  app.querySelectorAll("[data-trail]").forEach((chip) => {
    chip.addEventListener("click", () => goBackTo(Number(chip.dataset.trail)));
  });
  app.querySelector("[data-reset]")?.addEventListener("click", () => {
    reset();
    render();
  });
  app.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      state.values[input.dataset.field] = input.value;
      updateResultsOnly();
    });
  });
  app.querySelectorAll("[data-copy]").forEach(bindCopy);
}

// Copia al portapapeles con confirmacion verde temporal.
function bindCopy(button) {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      const original = button.textContent;
      button.textContent = "Copiado";
      button.classList.add("is-copied");
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1200);
    } catch (_) {
      /* clipboard no disponible */
    }
  });
}

// Actualiza solo el bloque de resultados (sin perder foco del input).
function updateResultsOnly() {
  const template = currentTemplate();
  if (!template) return;
  const container = app.querySelector(".nom-results");
  if (!container) return;
  const tokens = buildTokens(template);
  const ready = allRequiredFilled(template);
  container.innerHTML = `
    <h3 class="nom-results-title">Resultado</h3>
    ${
      ready
        ? (template.outputs || [])
            .map((output) => {
              const value = substitute(output.pattern, tokens);
              return `
                <div class="nom-output">
                  <div class="nom-output-head">
                    <span class="nom-output-label">${escapeHtml(output.label)}</span>
                    ${output.proposed ? '<span class="nom-badge">propuesta</span>' : ""}
                  </div>
                  <div class="nom-output-value">
                    <code>${escapeHtml(value)}</code>
                    <button class="nom-copy" type="button" data-copy="${escapeHtml(value)}" title="Copiar">Copiar</button>
                  </div>
                </div>`;
            })
            .join("")
        : `<p class="nom-hint">Completa los campos marcados con <em>*</em> para generar los nombres.</p>`
    }`;
  container.querySelectorAll("[data-copy]").forEach(bindCopy);
}

export async function mountNomenclatura(target) {
  app = target;
  app.classList.add("nom-app");
  app.innerHTML = `<section class="nom-loading">Cargando generador...</section>`;
  try {
    if (!state.catalog) {
      state.catalog = await fetchJson("assets/data/nomenclatura/catalog.json");
    }
    if (!state.stepId && !state.templateId) reset();
    render();
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="nom-loading">No se pudo cargar el generador de nomenclatura.</section>`;
  }
}
