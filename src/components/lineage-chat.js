const state = { rows: [], fields: [], tables: [], rawTables: [], fieldInfo: new Map(), ready: false };

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}
function compact(value) {
  return normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function splitFields(value) {
  return String(value || "").split(/[,+|]/).map((part) => part.trim()).filter(Boolean);
}
function fieldEquals(a, b) {
  return normalize(a) === normalize(b);
}
function fieldListContains(listValue, field) {
  return splitFields(listValue).some((part) => fieldEquals(part, field));
}
function safe(value, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}
function addFieldInfo(table, field, meta) {
  if (!table || !field) return;
  const key = `${normalize(table)}\u0007${normalize(field)}`;
  if (!state.fieldInfo.has(key)) state.fieldInfo.set(key, { table, field, ...(meta || {}) });
}
function getFieldInfo(table, field) {
  return state.fieldInfo.get(`${normalize(table)}\u0007${normalize(field)}`);
}

async function buildIndex(catalog) {
  const unique = new Map();
  const fields = new Set();
  const tables = new Set();
  const rawTables = new Set();

  await Promise.all(catalog.items.map(async (item) => {
    const response = await fetch(item.dataPath);
    if (!response.ok) return;
    const data = await response.json();
    (data.nodes || []).forEach((node) => {
      if (node.table) tables.add(node.table);
      if (node.table && normalize(node.role) === "source" && normalize(node.kind).includes("raw")) rawTables.add(node.table);
      (node.fields || []).forEach((field) => {
        if (field.name) {
          fields.add(field.name);
          addFieldInfo(node.table, field.name, field);
        }
      });
    });
    (data.all || []).forEach((row) => {
      const enriched = { ...row, lineage_page: item.key, lineage_target: data.target || "", lineage_short: data.short || item.key };
      [enriched.source_table, enriched.target_table, enriched.lineage_target].forEach((table) => table && tables.add(table));
      splitFields(enriched.source_field).forEach((field) => fields.add(field));
      if (enriched.target_field) fields.add(enriched.target_field);
      const key = [enriched.direction, enriched.source_table, enriched.source_field, enriched.target_table, enriched.target_field, enriched.transform, enriched.relation_type].map((value) => String(value || "")).join("\u0007");
      if (!unique.has(key)) unique.set(key, enriched);
    });
  }));

  state.rows = Array.from(unique.values());
  state.fields = Array.from(fields).filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b));
  state.tables = Array.from(tables).filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b));
  state.rawTables = Array.from(rawTables).filter(Boolean).sort((a, b) => a.localeCompare(b));
  state.ready = true;
}

function detectField(question) {
  const q = compact(question);
  return state.fields.find((field) => {
    const f = compact(field);
    return f.length >= 2 && q.includes(f);
  }) || "";
}
function detectTable(question) {
  const q = compact(question);
  return state.tables.find((table) => {
    const full = compact(table);
    const short = compact(String(table).split(".").pop());
    return (full && q.includes(full)) || (short.length > 5 && q.includes(short));
  }) || "";
}
function detectIntent(question) {
  const q = compact(question);
  if (/\b(raw|origen raw|tabla raw|tablas raw|fuentes raw)\b/.test(q)) return "raw_tables";
  if (/\b(a donde|destino|impacto|downstream|consume|usa|utiliza|dependen|salida|hacia donde)\b/.test(q)) return "downstream";
  if (/\b(transformacion|transforma|calcula|formula|hash|deriva|como se forma|como se genera)\b/.test(q)) return "transform";
  if (/\b(resumen|tabla|cuantos|conteo|campos|relaciones)\b/.test(q) && !detectField(question)) return "summary";
  return "upstream";
}
function withTableFilter(rows, table, preferTarget) {
  if (!table) return rows;
  const nt = normalize(table);
  const filtered = rows.filter((row) => {
    const target = normalize(row.target_table);
    const source = normalize(row.source_table);
    const lineage = normalize(row.lineage_target);
    return target.includes(nt) || source.includes(nt) || lineage.includes(nt) || nt.includes(target) || nt.includes(source);
  });
  if (preferTarget) {
    const targetOnly = filtered.filter((row) => normalize(row.target_table).includes(nt) || nt.includes(normalize(row.target_table)) || normalize(row.lineage_target).includes(nt));
    return targetOnly.length ? targetOnly : filtered;
  }
  return filtered.length ? filtered : rows;
}
function formatRow(row, index, mode) {
  return [
    `${index}. ${safe(row.target_table)}.${safe(row.target_field)}`,
    mode === "downstream" ? `   Usa: ${safe(row.source_table)}.${safe(row.source_field)}` : `   Proviene de: ${safe(row.source_table)}.${safe(row.source_field)}`,
    `   Transformacion: ${safe(row.transform, "Sin transformacion registrada")}`,
    `   Relacion: ${safe(row.relation_type, "No especificada")} - Direccion: ${safe(row.direction)}`,
    row.lineage_target ? `   Linaje: ${row.lineage_target}` : ""
  ].filter(Boolean).join("\n");
}
function describeField(field, table) {
  const relevant = state.rows.find((row) => fieldEquals(row.target_field, field) && (!table || normalize(row.target_table).includes(normalize(table))));
  const info = relevant ? getFieldInfo(relevant.target_table, field) : null;
  return info ? `\nTipo: ${safe(info.type)}\nDescripcion: ${safe(info.description)}\n` : "";
}
function answerQuestion(question) {
  const field = detectField(question);
  const table = detectTable(question);
  const intent = detectIntent(question);

  if (intent === "raw_tables") {
    return state.rawTables.length ? `Tablas raw detectadas (${state.rawTables.length}):\n\n- ${state.rawTables.join("\n- ")}` : "No encontre tablas raw en la metadata indexada.";
  }
  if (field && intent === "downstream") {
    let rows = state.rows.filter((row) => ["downstream", "neighborhood"].includes(normalize(row.direction)) && fieldListContains(row.source_field, field));
    rows = withTableFilter(rows, table, false);
    return rows.length ? `Impacto downstream para "${field}":\n\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "downstream")).join("\n\n")}` : `No encontre impacto downstream directo para "${field}".`;
  }
  if (field && intent === "transform") {
    let rows = state.rows.filter((row) => fieldEquals(row.target_field, field) || fieldListContains(row.source_field, field));
    rows = withTableFilter(rows, table, false).filter((row) => safe(row.transform, "") !== "-");
    return rows.length ? `Transformaciones relacionadas con "${field}":\n\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "transform")).join("\n\n")}` : `No encontre transformacion registrada para "${field}".`;
  }
  if (field) {
    let rows = state.rows.filter((row) => normalize(row.direction) === "upstream" && fieldEquals(row.target_field, field));
    rows = withTableFilter(rows, table, true);
    return rows.length ? `Origen upstream para "${field}":${describeField(field, table)}\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "upstream")).join("\n\n")}` : `No encontre evidencia de origen para el campo "${field}".`;
  }

  const rows = table ? withTableFilter(state.rows, table, false) : state.rows;
  const counts = rows.reduce((acc, row) => {
    const d = safe(row.direction, "sin_direccion");
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  return `${table ? `Resumen de linaje para "${table}"` : "Resumen global de linaje"}:\nRelaciones: ${rows.length}\nUpstream: ${counts.upstream || 0} - Downstream: ${counts.downstream || 0} - Neighborhood: ${counts.neighborhood || 0}`;
}

export function createLineageChat({ catalog }) {
  const ready = buildIndex(catalog);
  const panel = document.createElement("aside");
  panel.id = "lineageLocalChat";
  panel.className = "llc-collapsed llc-hidden";
  panel.innerHTML = `
    <div class="llc-head">
      <div class="llc-title">
        <span class="nav-icon" aria-hidden="true">✦</span>
        <div><strong>Asistente</strong></div>
      </div>
      <button class="llc-icon-btn" id="llcMinimize" title="Minimizar">+</button>
    </div>
    <div class="llc-body">
      <div class="llc-examples" id="llcExamples"></div>
      <textarea id="llcQuestion" placeholder="Ej. De donde proviene ClienteOperacionLnkHashKey?"></textarea>
      <div class="llc-toolbar"><button id="llcAsk">Preguntar</button><button id="llcCopy">Copiar</button><button id="llcClear">Limpiar</button></div>
      <div id="llcAnswer">Haz una pregunta sobre origen, destino o transformacion de un campo.</div>
      <div class="llc-foot">Consulta local sobre los JSON extraidos. No usa backend ni API externa.</div>
    </div>`;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector(`#${id}`);
  const examples = [
    "De donde proviene ClienteOperacionLnkHashKey?",
    "Cuales son las tablas raw?",
    "A donde impacta rd_baz_bdclientes.rd_cripto_trans?"
  ];

  async function askMiniChat(question) {
    const text = String(question || "").trim();
    if (!text) return;
    $("llcAnswer").textContent = "Analizando metadata...";
    $("llcAnswer").textContent = await ready.then(() => answerQuestion(text));
  }

  examples.forEach((text) => {
    const button = document.createElement("button");
    button.className = "llc-chip";
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", () => {
      $("llcQuestion").value = text;
      askMiniChat(text);
    });
    $("llcExamples").appendChild(button);
  });

  $("llcAsk").addEventListener("click", () => askMiniChat($("llcQuestion").value));
  $("llcQuestion").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askMiniChat($("llcQuestion").value);
    }
  });
  $("llcClear").addEventListener("click", () => {
    $("llcQuestion").value = "";
    $("llcAnswer").textContent = "Haz una pregunta sobre origen, destino o transformacion de un campo.";
  });
  $("llcCopy").addEventListener("click", async () => navigator.clipboard?.writeText($("llcAnswer").textContent || ""));
  $("llcMinimize").addEventListener("click", () => {
    panel.classList.toggle("llc-collapsed");
    $("llcMinimize").textContent = panel.classList.contains("llc-collapsed") ? "+" : "-";
  });

  return {
    async ask(question) {
      await ready;
      return answerQuestion(question);
    },
    getStatus() {
      return state.ready
        ? `${state.rows.length} relaciones - ${state.fields.length} campos - ${state.tables.length} tablas`
        : "Indexando metadata...";
    },
    setVisible(visible) {
      panel.classList.toggle("llc-hidden", !visible);
    },
    ready
  };
}
