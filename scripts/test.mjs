import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  __assistantEvidenceTest,
  buildGroundedPrompt,
  retrieveEvidenceFromState,
} from "../src/services/assistant-evidence.js";
import { isLiteRtSupported } from "../src/services/litert-engine.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function listFiles(dir) {
  const entries = await readdir(dir);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry);
      const info = await stat(full);
      return info.isDirectory() ? listFiles(full) : full;
    })
  );
  return files.flat();
}

function makeState() {
  return {
    ready: true,
    rows: [
      {
        direction: "upstream",
        source_table: "raw_cliente",
        source_field: "ClienteOperacionId",
        target_table: "h_baz_coinpro_operacion",
        target_field: "ClienteOperacionLnkHashKey",
        transform: "SHA2(ClienteOperacionId)",
        relation_type: "derived",
        lineage_target: "h_baz_coinpro_operacion",
        lineage_page: "h_baz_coinpro_operacion",
      },
      {
        direction: "upstream",
        source_table: "raw_cliente",
        source_field: "ClienteOperacionId",
        target_table: "h_baz_coinpro_operacion",
        target_field: "ClienteOperacionLnkHashKey",
        transform: "SHA2(ClienteOperacionId)",
        relation_type: "derived",
        lineage_target: "h_baz_coinpro_operacion",
        lineage_page: "h_baz_coinpro_operacion",
      },
      {
        direction: "downstream",
        source_table: "h_baz_coinpro_operacion",
        source_field: "ClienteOperacionLnkHashKey",
        target_table: "br_baz_coinpro_cliente_operacion",
        target_field: "ClienteOperacionLnkHashKey",
        transform: "direct",
        relation_type: "direct",
        lineage_target: "br_baz_coinpro_cliente_operacion",
        lineage_page: "br_baz_coinpro_cliente_operacion",
      },
    ],
    fields: ["ClienteOperacionLnkHashKey", "ClienteOperacionId"],
    tables: ["h_baz_coinpro_operacion", "br_baz_coinpro_cliente_operacion", "raw_cliente"],
    rawTables: ["raw_cliente"],
    fieldInfo: new Map(),
  };
}

function testEvidenceRetrieval() {
  const result = retrieveEvidenceFromState(makeState(), "De donde proviene ClienteOperacionLnkHashKey?", {
    maxEvidenceItems: 10,
  });
  assert.equal(result.matchedFields[0], "ClienteOperacionLnkHashKey");
  assert.equal(result.evidence.length, 1, "duplicate upstream rows should be removed");
  assert.equal(result.evidence[0].sourceTable, "raw_cliente");
  assert.match(result.deterministicAnswer, /Origen upstream/);
}

function testEvidenceLimit() {
  const state = makeState();
  state.rows = Array.from({ length: 30 }, (_, index) => ({
    direction: "upstream",
    source_table: `src_${index}`,
    source_field: `field_${index}`,
    target_table: "target",
    target_field: "ClienteOperacionLnkHashKey",
    transform: "direct",
    relation_type: "direct",
  }));
  const result = retrieveEvidenceFromState(state, "De donde proviene ClienteOperacionLnkHashKey?", {
    maxEvidenceItems: 15,
  });
  assert.equal(result.evidence.length, 15);
}

function testPromptUsesOnlyEvidence() {
  const evidence = [
    {
      direction: "upstream",
      sourceTable: "raw_cliente",
      sourceField: "ClienteOperacionId",
      targetTable: "h_baz_coinpro_operacion",
      targetField: "ClienteOperacionLnkHashKey",
      transformation: "SHA2(ClienteOperacionId)",
      relationType: "derived",
      ignoredLargeProperty: "global-lineage-json-should-not-appear",
    },
  ];
  const prompt = buildGroundedPrompt({ question: "origen?", evidence });
  assert.match(prompt.system, /No inventes/);
  assert.match(prompt.user, /<PREGUNTA>/);
  assert.match(prompt.user, /raw_cliente/);
  assert.doesNotMatch(prompt.user, /global-lineage-json-should-not-appear/);
}

function testLiteRtFallbackSupport() {
  const support = isLiteRtSupported();
  assert.equal(typeof support.supported, "boolean");
  if (!globalThis.navigator?.gpu) {
    assert.equal(support.webgpu, false);
  }
}

async function testStaticSafetyChecks() {
  const files = await listFiles(path.join(root, "src"));
  const litertReferences = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (text.includes("@litert-lm/core") || text.includes("litert-community/gemma-4")) {
      litertReferences.push(path.relative(root, file));
    }
  }
  assert.deepEqual(litertReferences.sort(), ["src/services/litert-config.js", "src/services/litert-engine.js"]);

  const chatText = await readFile(path.join(root, "src/pages/chat.js"), "utf8");
  assert.match(chatText, /textContent/);
  assert.doesNotMatch(chatText, /bubble\\.innerHTML/);
  assert.match(chatText, /AbortController/);
  assert.match(chatText, /activeRequestId/);
  assert.doesNotMatch(chatText, /postMessage|srcdoc|createChatDocument/);

  const modelerText = await readFile(path.join(root, "src/components/modeler.js"), "utf8");
  assert.doesNotMatch(modelerText, /closeViewTableMenu|viewTableMenu|viewTableButton|viewTableOptions/);

  const shellText = await readFile(path.join(root, "src/components/shell.js"), "utf8");
  assert.match(shellText, /chatMount/);

  const engineText = await readFile(path.join(root, "src/services/litert-engine.js"), "utf8");
  assert.match(engineText, /generationActive/);
  assert.match(engineText, /cancelLiteRtGeneration/);
  assert.match(engineText, /conversation\?\.(cancel)|conversation\.cancel/);

  const allSourceText = await Promise.all(files.map((file) => readFile(file, "utf8")));
  allSourceText.forEach((text, index) => {
    const file = path.relative(root, files[index]);
    if (!file.endsWith("chat.js") && !file.endsWith("modeler.js")) {
      assert.doesNotMatch(text, /postMessage\([^,]+,\s*"\*"/, `${file} should avoid wildcard postMessage`);
    }
  });
}

async function testBuildArtifacts() {
  const distFiles = await listFiles(path.join(root, "dist"));
  assert.equal(distFiles.some((file) => file.endsWith(".litertlm")), false);
  const main = await readFile(path.join(root, "dist/assets/js/main.js"), "utf8");
  assert.doesNotMatch(main, /@litert-lm\/core/);
  assert.doesNotMatch(main, /\/assets\//, "main bundle should not assume root-relative /assets paths");
}

testEvidenceRetrieval();
testEvidenceLimit();
testPromptUsesOnlyEvidence();
testLiteRtFallbackSupport();
assert.equal(typeof __assistantEvidenceTest.dedupeEvidence, "function");
await testStaticSafetyChecks();
await testBuildArtifacts();
console.log("tests ok");
