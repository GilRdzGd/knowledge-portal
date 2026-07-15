const DEFAULT_MAX_EVIDENCE_ITEMS = 15;
const MAX_PROMPT_EVIDENCE_ITEMS = 20;

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function compact(value) {
  return normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function splitFields(value) {
  return String(value || "")
    .split(/[,+|]/)
    .map((part) => part.trim())
    .filter(Boolean);
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

function evidenceKey(item) {
  return [
    item.direction,
    item.sourceTable,
    item.sourceField,
    item.targetTable,
    item.targetField,
    item.transformation,
    item.relationType,
  ]
    .map((value) => String(value || ""))
    .join("\u0007");
}

function rowToEvidence(row) {
  return {
    direction: safe(row.direction, ""),
    sourceTable: safe(row.source_table, ""),
    sourceField: safe(row.source_field, ""),
    targetTable: safe(row.target_table, ""),
    targetField: safe(row.target_field, ""),
    transformation: safe(row.transform, ""),
    relationType: safe(row.relation_type, ""),
    lineageTarget: safe(row.lineage_target, ""),
    lineagePage: safe(row.lineage_page, ""),
  };
}

function dedupeEvidence(rows, limit) {
  const seen = new Set();
  const items = [];
  rows.forEach((row) => {
    const item = rowToEvidence(row);
    const key = evidenceKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  });
  return items.slice(0, Math.max(1, Math.min(Number(limit) || DEFAULT_MAX_EVIDENCE_ITEMS, MAX_PROMPT_EVIDENCE_ITEMS)));
}

function formatRow(row, index, mode) {
  return [
    `${index}. ${safe(row.target_table)}.${safe(row.target_field)}`,
    mode === "downstream"
      ? `   Usa: ${safe(row.source_table)}.${safe(row.source_field)}`
      : `   Proviene de: ${safe(row.source_table)}.${safe(row.source_field)}`,
    `   Transformacion: ${safe(row.transform, "Sin transformacion registrada")}`,
    `   Relacion: ${safe(row.relation_type, "No especificada")} - Direccion: ${safe(row.direction)}`,
    row.lineage_target ? `   Linaje: ${row.lineage_target}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function detectIntent(question, detectField) {
  const q = compact(question);
  if (/\b(raw|origen raw|tabla raw|tablas raw|fuentes raw)\b/.test(q)) return "raw_tables";
  if (/\b(a donde|destino|impacto|downstream|consume|usa|utiliza|dependen|salida|hacia donde)\b/.test(q)) {
    return "downstream";
  }
  if (/\b(transformacion|transforma|calcula|formula|hash|deriva|como se forma|como se genera)\b/.test(q)) {
    return "transform";
  }
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
    const targetOnly = filtered.filter((row) => {
      const target = normalize(row.target_table);
      return target.includes(nt) || nt.includes(target) || normalize(row.lineage_target).includes(nt);
    });
    return targetOnly.length ? targetOnly : filtered;
  }
  return filtered.length ? filtered : rows;
}

function createIndexState() {
  return {
    rows: [],
    fields: [],
    tables: [],
    rawTables: [],
    fieldInfo: new Map(),
    ready: false,
  };
}

function addFieldInfo(state, table, field, meta) {
  if (!table || !field) return;
  const key = `${normalize(table)}\u0007${normalize(field)}`;
  if (!state.fieldInfo.has(key)) state.fieldInfo.set(key, { table, field, ...(meta || {}) });
}

function getFieldInfo(state, table, field) {
  return state.fieldInfo.get(`${normalize(table)}\u0007${normalize(field)}`);
}

async function buildIndex(catalog, { fetcher = fetch } = {}) {
  const state = createIndexState();
  const unique = new Map();
  const fields = new Set();
  const tables = new Set();
  const rawTables = new Set();

  await Promise.all(
    (catalog.items || []).map(async (item) => {
      const response = await fetcher(item.dataPath);
      if (!response.ok) return;
      const data = await response.json();
      (data.nodes || []).forEach((node) => {
        if (node.table) tables.add(node.table);
        if (node.table && normalize(node.role) === "source" && normalize(node.kind).includes("raw")) rawTables.add(node.table);
        (node.fields || []).forEach((field) => {
          if (field.name) {
            fields.add(field.name);
            addFieldInfo(state, node.table, field.name, field);
          }
        });
      });
      (data.all || []).forEach((row) => {
        const enriched = {
          ...row,
          lineage_page: item.key,
          lineage_target: data.target || "",
          lineage_short: data.short || item.key,
        };
        [enriched.source_table, enriched.target_table, enriched.lineage_target].forEach((table) => table && tables.add(table));
        splitFields(enriched.source_field).forEach((field) => fields.add(field));
        if (enriched.target_field) fields.add(enriched.target_field);
        const key = [
          enriched.direction,
          enriched.source_table,
          enriched.source_field,
          enriched.target_table,
          enriched.target_field,
          enriched.transform,
          enriched.relation_type,
        ]
          .map((value) => String(value || ""))
          .join("\u0007");
        if (!unique.has(key)) unique.set(key, enriched);
      });
    })
  );

  state.rows = Array.from(unique.values());
  state.fields = Array.from(fields).filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b));
  state.tables = Array.from(tables).filter(Boolean).sort((a, b) => b.length - a.length || a.localeCompare(b));
  state.rawTables = Array.from(rawTables).filter(Boolean).sort((a, b) => a.localeCompare(b));
  state.ready = true;
  return state;
}

function createDetectors(state) {
  function detectField(question) {
    const q = compact(question);
    return (
      state.fields.find((field) => {
        const f = compact(field);
        return f.length >= 2 && q.includes(f);
      }) || ""
    );
  }

  function detectTable(question) {
    const q = compact(question);
    return (
      state.tables.find((table) => {
        const full = compact(table);
        const short = compact(String(table).split(".").pop());
        return (full && q.includes(full)) || (short.length > 5 && q.includes(short));
      }) || ""
    );
  }

  return { detectField, detectTable };
}

function describeField(state, field, table) {
  const relevant = state.rows.find(
    (row) => fieldEquals(row.target_field, field) && (!table || normalize(row.target_table).includes(normalize(table)))
  );
  const info = relevant ? getFieldInfo(state, relevant.target_table, field) : null;
  return info ? `\nTipo: ${safe(info.type)}\nDescripcion: ${safe(info.description)}\n` : "";
}

function computeRows(state, question) {
  const { detectField, detectTable } = createDetectors(state);
  const field = detectField(question);
  const table = detectTable(question);
  const intent = detectIntent(question, detectField);
  let rows = [];

  if (intent === "raw_tables") {
    return { intent, field, table, rows };
  }
  if (field && intent === "downstream") {
    rows = state.rows.filter(
      (row) => ["downstream", "neighborhood"].includes(normalize(row.direction)) && fieldListContains(row.source_field, field)
    );
    return { intent, field, table, rows: withTableFilter(rows, table, false) };
  }
  if (field && intent === "transform") {
    rows = state.rows.filter((row) => fieldEquals(row.target_field, field) || fieldListContains(row.source_field, field));
    return {
      intent,
      field,
      table,
      rows: withTableFilter(rows, table, false).filter((row) => safe(row.transform, "") !== "-"),
    };
  }
  if (field) {
    rows = state.rows.filter((row) => normalize(row.direction) === "upstream" && fieldEquals(row.target_field, field));
    return { intent, field, table, rows: withTableFilter(rows, table, true) };
  }

  return { intent, field, table, rows: table ? withTableFilter(state.rows, table, false) : state.rows };
}

function answerFromState(state, question) {
  const { intent, field, table, rows } = computeRows(state, question);

  if (intent === "raw_tables") {
    return state.rawTables.length
      ? `Tablas raw detectadas (${state.rawTables.length}):\n\n- ${state.rawTables.join("\n- ")}`
      : "No encontre tablas raw en la metadata indexada.";
  }
  if (field && intent === "downstream") {
    return rows.length
      ? `Impacto downstream para "${field}":\n\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "downstream")).join("\n\n")}`
      : `No encontre impacto downstream directo para "${field}".`;
  }
  if (field && intent === "transform") {
    return rows.length
      ? `Transformaciones relacionadas con "${field}":\n\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "transform")).join("\n\n")}`
      : `No encontre transformacion registrada para "${field}".`;
  }
  if (field) {
    return rows.length
      ? `Origen upstream para "${field}":${describeField(state, field, table)}\n${rows.slice(0, 10).map((row, i) => formatRow(row, i + 1, "upstream")).join("\n\n")}`
      : `No encontre evidencia de origen para el campo "${field}".`;
  }

  const counts = rows.reduce((acc, row) => {
    const direction = safe(row.direction, "sin_direccion");
    acc[direction] = (acc[direction] || 0) + 1;
    return acc;
  }, {});
  return `${table ? `Resumen de linaje para "${table}"` : "Resumen global de linaje"}:\nRelaciones: ${rows.length}\nUpstream: ${counts.upstream || 0} - Downstream: ${counts.downstream || 0} - Neighborhood: ${counts.neighborhood || 0}`;
}

export function retrieveEvidenceFromState(state, question, options = {}) {
  const { field, table, rows, intent } = computeRows(state, question);
  const maxEvidenceItems = options.maxEvidenceItems ?? DEFAULT_MAX_EVIDENCE_ITEMS;
  return {
    evidence: dedupeEvidence(rows, maxEvidenceItems),
    deterministicAnswer: answerFromState(state, question),
    matchedTables: table ? [table] : [],
    matchedFields: field ? [field] : [],
    intent,
  };
}

export function buildGroundedPrompt({ question, evidence, maxEvidenceItems = DEFAULT_MAX_EVIDENCE_ITEMS, maxOutputTokens }) {
  const boundedEvidence = (Array.isArray(evidence) ? evidence : []).slice(0, Math.min(maxEvidenceItems, MAX_PROMPT_EVIDENCE_ITEMS));
  const compactEvidence = boundedEvidence.map((item) => ({
    direction: item.direction,
    sourceTable: item.sourceTable,
    sourceField: item.sourceField,
    targetTable: item.targetTable,
    targetField: item.targetField,
    transformation: item.transformation,
    relationType: item.relationType,
  }));
  const system = [
    "Eres un asistente especializado en linaje de datos.",
    "Responde exclusivamente utilizando la evidencia proporcionada.",
    "No inventes tablas, campos, transformaciones, relaciones, sistemas origen ni sistemas destino.",
    "Si la evidencia es insuficiente o ambigua, indicalo explicitamente.",
    "Responde en español.",
    "Menciona los nombres exactos de las tablas y campos involucrados.",
    "No afirmes que una relacion existe si no aparece en la evidencia.",
    maxOutputTokens ? `Mantén la respuesta en un máximo aproximado de ${maxOutputTokens} tokens.` : "",
  ].filter(Boolean).join("\n");
  const user = `<PREGUNTA>\n${String(question || "").trim()}\n</PREGUNTA>\n\n<EVIDENCIA>\n${JSON.stringify(compactEvidence)}\n</EVIDENCIA>`;
  return { system, user, evidence: compactEvidence };
}

export function createAssistantRetrieval({ catalog, fetcher } = {}) {
  const ready = buildIndex(catalog || { items: [] }, { fetcher });
  let state = null;
  const stateReady = ready.then((nextState) => {
    state = nextState;
    return state;
  });

  return {
    async answerQuestion(question) {
      const current = state || (await stateReady);
      return answerFromState(current, question);
    },
    async retrieveEvidence(question, options) {
      const current = state || (await stateReady);
      return retrieveEvidenceFromState(current, question, options);
    },
    getStatus() {
      if (!state?.ready) return "Indexando metadata...";
      return `${state.rows.length} relaciones - ${state.fields.length} campos - ${state.tables.length} tablas`;
    },
    ready: stateReady,
  };
}

export const __assistantEvidenceTest = {
  buildIndex,
  retrieveEvidenceFromState,
  createIndexState,
  dedupeEvidence,
};
