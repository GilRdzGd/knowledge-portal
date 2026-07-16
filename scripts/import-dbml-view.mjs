import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputFile = process.argv[2];
const suffix = process.argv[3] || "cobranza_pagos_comercio";
const viewName = process.argv[4] || "Cobranza Pagos y Comercio";

if (!inputFile) {
  throw new Error("Uso: node scripts/import-dbml-view.mjs <archivo.dbml> [sufijo] [nombre]");
}

const colors = {
  hub: "#2169F3",
  link: "#f54337",
  satelite: "#FEC107",
  support: "#94a3b8",
};

const domains = {
  cob: { name: "Cobranza", color: "#0f766e" },
  cre: { name: "Credito", color: "#7c3aed" },
  cdc: { name: "Circulo de Credito", color: "#2563eb" },
  cte: { name: "Cliente", color: "#db2777" },
  ctle: { name: "Cliente", color: "#db2777" },
  cat: { name: "Catalogo", color: "#d97706" },
  div: { name: "Diversos", color: "#0891b2" },
  dig: { name: "Digital", color: "#059669" },
  afo: { name: "Afore", color: "#4f46e5" },
  cah: { name: "Capital Humano", color: "#be123c" },
};

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    return text.slice(1, -1).replace(/\\([\\'\"])/g, "$1");
  }
  return text;
}

function splitSettings(value) {
  const parts = [];
  let current = "";
  let quote = "";
  for (const char of String(value || "")) {
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
  return parts;
}

function parseSettings(value) {
  const settings = {};
  const text = String(value || "").trim().replace(/^\[/, "").replace(/\]$/, "");
  splitSettings(text).forEach((part) => {
    const index = part.indexOf(":");
    if (index < 0) {
      settings[part.toLowerCase()] = true;
      return;
    }
    settings[part.slice(0, index).trim().toLowerCase()] = unquote(part.slice(index + 1));
  });
  return settings;
}

function stripInlineComment(line) {
  let quote = "";
  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index];
    if ((char === "'" || char === '"') && line[index - 1] !== "\\") {
      quote = quote === char ? "" : quote || char;
    }
    if (line[index] === "/" && line[index + 1] === "/" && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function tableClass(title) {
  if (/^h_/.test(title)) return "hub";
  if (/^l_/.test(title)) return "link";
  if (/^s_/.test(title)) return "satelite";
  return "support";
}

function domainFor(title) {
  let value = title.toLowerCase();
  value = value.replace(/^s_(?:ma_|nh_|rt_|st_|cs_)?/, "");
  value = value.replace(/^(?:h_|l_)/, "");
  value = value.replace(/^pit_|^br_|^ref_/, "");
  value = value.replace(/^baz_/, "");
  const code = value.split("_")[0] || "general";
  return domains[code] || { name: code === "general" ? "General" : code, color: "#64748b" };
}

function classifyTag(title) {
  const kind = tableClass(title);
  return kind === "satelite" ? "satelite" : kind;
}

function parseDbml(text) {
  const tables = [];
  const refs = [];
  let current = null;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = stripInlineComment(rawLine).trim();
    if (!line) continue;

    const tableMatch = /^Table\s+((?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[A-Za-z_][A-Za-z0-9_]*))(?:\s+(\[[^\]]*\]))?\s*\{$/i.exec(line);
    if (tableMatch) {
      const title = unquote(tableMatch[1]);
      current = { title, settings: parseSettings(tableMatch[2] || ""), fields: [], note: "" };
      continue;
    }

    const refMatch = /^Ref:\s*([^\.\s]+)\.([^\s]+)\s*>\s*([^\.\s]+)\.([^\s]+)/i.exec(line);
    if (refMatch) {
      refs.push({
        childTable: unquote(refMatch[1]),
        childField: unquote(refMatch[2]),
        parentTable: unquote(refMatch[3]),
        parentField: unquote(refMatch[4]),
      });
      continue;
    }

    if (!current) continue;
    if (line === "}") {
      tables.push(current);
      current = null;
      continue;
    }

    const noteMatch = /^Note:\s*(.+)$/i.exec(line);
    if (noteMatch) {
      current.note = unquote(noteMatch[1]);
      continue;
    }

    const fieldMatch = /^("[^"]+"|'[^']+'|[A-Za-z_][A-Za-z0-9_]*)\s+([^\s\[]+(?:\([^\)]*\))?)\s*(\[[^\]]*\])?/i.exec(line);
    if (!fieldMatch) continue;
    const fieldSettings = parseSettings(fieldMatch[3] || "");
    current.fields.push({
      key: fieldSettings.pk ? "PK" : fieldSettings.unique ? "UK" : "",
      name: unquote(fieldMatch[1]),
      type: fieldMatch[2],
      note: fieldSettings.note || "",
    });
  }

  const domainByTitle = new Map(tables.map((table) => [table.title, domainFor(table.title)]));
  const classByTitle = new Map(tables.map((table) => [table.title, classifyTag(table.title)]));

  const schema = tables.map((table) => {
    const tag = classByTitle.get(table.title);
    const domain = domainByTitle.get(table.title);
    return {
      id: table.title,
      title: table.title,
      tag,
      description: table.note || `${tag} | ${table.title}`,
      fields: table.fields,
      modelRelations: [],
      headerColor: colors[tag],
      group: domain.name,
      groupColor: domain.color,
      relationCount: 0,
    };
  });

  const schemaByTitle = new Map(schema.map((table) => [table.title.toLowerCase(), table]));
  refs.forEach((ref) => {
    const child = schemaByTitle.get(ref.childTable.toLowerCase());
    const parent = schemaByTitle.get(ref.parentTable.toLowerCase());
    if (!child || !parent) return;
    const relation = {
      id: `${child.id}.${ref.childField}__${parent.id}.${ref.parentField}`,
      childId: child.id,
      childField: ref.childField,
      parentId: parent.id,
      parentField: ref.parentField,
      source: "dbml-import",
      group: child.group,
    };
    child.modelRelations.push(relation);
    child.relationCount = child.modelRelations.length;
  });

  return { schema, refs };
}

function tableHeight(table) {
  return 84 + Math.min(table.fields.length, 20) * 28 + 12;
}

function makePositions(schema) {
  const byId = new Map(schema.map((table) => [table.id, table]));
  const groups = new Map();
  schema.forEach((table) => {
    if (!groups.has(table.group)) groups.set(table.group, []);
    groups.get(table.group).push(table);
  });

  const positions = {};
  const groupAnchors = new Map();
  const groupWidth = 4300;
  const groupGapX = 500;
  const groupGapY = 600;
  const groupColumns = 3;
  const groupEntries = [...groups.entries()];
  const rowHeights = [];
  groupEntries.forEach(([, tables], groupIndex) => {
    const row = Math.floor(groupIndex / groupColumns);
    const satelliteStack = tables
      .filter((table) => table.tag === "satelite")
      .reduce((total, table) => total + tableHeight(table) + 54, 0);
    const supportStack = tables
      .filter((table) => table.tag === "support")
      .reduce((total, table) => total + tableHeight(table) + 54, 0);
    const linkStack = 3440 + Math.ceil(tables.filter((table) => table.tag === "link").length / 3) * 720;
    const hubStack = 2550 + Math.max(0, ...tables.filter((table) => table.tag === "hub").map(tableHeight));
    const requiredHeight = Math.max(420 + satelliteStack / 2, 4520 + supportStack / 2, linkStack, hubStack) + 360;
    rowHeights[row] = Math.max(rowHeights[row] || 0, requiredHeight);
  });
  const rowTops = [];
  rowHeights.reduce((top, height, row) => {
    rowTops[row] = top;
    return top + height + groupGapY;
  }, 140);

  // First place every hub. This gives links a stable global anchor even when
  // they connect tables from different domains.
  groupEntries.forEach(([groupName, tables], groupIndex) => {
    const groupColumn = groupIndex % groupColumns;
    const groupRow = Math.floor(groupIndex / groupColumns);
    const baseX = 180 + groupColumn * (groupWidth + groupGapX);
    const baseY = rowTops[groupRow];
    const hubs = tables.filter((table) => table.tag === "hub");
    const centerX = baseX + groupWidth / 2;
    const hubY = baseY + 2550;
    const hubGap = 560;
    const hubStart = centerX - ((hubs.length - 1) * hubGap) / 2;

    hubs.forEach((table, index) => {
      positions[table.id] = {
        left: Math.round(hubStart + index * hubGap),
        top: hubY,
      };
    });
    groupAnchors.set(groupName, { baseX, baseY, centerX, hubY, hubs });
  });

  const parentTables = (table) =>
    [...new Set((table.modelRelations || []).map((relation) => relation.parentId))]
      .map((id) => byId.get(id))
      .filter(Boolean);

  // Links sit in the corridor between the hubs they relate. When a link has
  // cross-domain parents, its local hubs keep the domain block compact.
  [...groups.entries()].forEach(([groupName, tables]) => {
    const anchor = groupAnchors.get(groupName);
    const links = tables.filter((table) => table.tag === "link");
    const localHubs = new Set(anchor.hubs.map((table) => table.id));
    const linkColumns = Math.min(3, Math.max(1, links.length));

    links.forEach((table, index) => {
      const parents = parentTables(table);
      const localParents = parents.filter((parent) => localHubs.has(parent.id));
      const candidates = localParents.length ? localParents : parents.filter((parent) => positions[parent.id]);
      const averageLeft = candidates.length
        ? candidates.reduce((sum, parent) => sum + positions[parent.id].left, 0) / candidates.length
        : anchor.centerX;
      const column = index % linkColumns;
      const row = Math.floor(index / linkColumns);
      const offset = (column - (linkColumns - 1) / 2) * 420;
      positions[table.id] = {
        left: Math.round(Math.max(anchor.baseX + 1250, Math.min(anchor.baseX + 3050, averageLeft + offset))),
        top: Math.round(anchor.baseY + 3440 + row * 720),
      };
    });
  });

  [...groups.entries()].forEach(([groupName, tables]) => {
    const anchor = groupAnchors.get(groupName);
    const satellites = tables.filter((table) => table.tag === "satelite");
    const support = tables.filter((table) => table.tag === "support");
    const satelliteColumns = [
      { left: anchor.baseX + 120, top: anchor.baseY + 420 },
      { left: anchor.baseX + 760, top: anchor.baseY + 420 },
      { left: anchor.baseX + 2830, top: anchor.baseY + 420 },
      { left: anchor.baseX + 3470, top: anchor.baseY + 420 },
    ];
    const satelliteCursors = satelliteColumns.map((column) => column.top);
    const localHubs = new Set(anchor.hubs.map((table) => table.id));

    satellites.forEach((table, index) => {
      const parents = parentTables(table);
      const localParent = parents.find((parent) => localHubs.has(parent.id));
      const preferredColumns = localParent
        ? anchor.hubs.indexOf(localParent) % 2 === 0
          ? [0, 1]
          : [2, 3]
        : index % 2 === 0
          ? [0, 1]
          : [2, 3];
      const candidates = preferredColumns.length ? preferredColumns : [0, 1, 2, 3];
      const column = candidates.reduce((best, candidate) =>
        satelliteCursors[candidate] < satelliteCursors[best] ? candidate : best
      );
      positions[table.id] = {
        left: satelliteColumns[column].left,
        top: Math.round(satelliteCursors[column]),
      };
      satelliteCursors[column] += tableHeight(table) + 54;
    });

    const supportColumns = [anchor.baseX + 1280, anchor.baseX + 2520];
    const supportCursors = supportColumns.map(() => anchor.baseY + 4520);
    support.forEach((table, index) => {
      const column = index % supportColumns.length;
      positions[table.id] = {
        left: supportColumns[column],
        top: Math.round(supportCursors[column]),
      };
      supportCursors[column] += tableHeight(table) + 54;
    });
  });
  return positions;
}

const input = await readFile(inputFile, "utf8");
const { schema, refs } = parseDbml(input);
const positions = makePositions(schema);
const schemaFile = `model-schema.${suffix}.json`;
const viewsFile = `model-views.${suffix}.json`;
await writeFile(path.join(root, "src/data", schemaFile), `${JSON.stringify(schema, null, 2)}\n`);
await writeFile(path.join(root, "src/data", viewsFile), `${JSON.stringify({ name: viewName, positions }, null, 2)}\n`);
console.log(JSON.stringify({ schemaFile, viewsFile, tables: schema.length, relations: refs.length, positions: Object.keys(positions).length }, null, 2));
