import { createLineageDocument } from "../components/lineage-template.js";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function createLineagePage({ catalog, shell, viewer }) {
  let currentItem = null;
  let inputTimer = null;

  catalog.options.forEach((term) => {
    const option = document.createElement("option");
    option.value = term;
    shell.options.appendChild(option);
  });

  function findItem(query) {
    const q = normalize(query);
    if (!q) return null;
    return catalog.items.find((item) => normalize(item.key) === q || normalize(item.target) === q)
      || catalog.items.find((item) => item.terms.some((term) => normalize(term) === q))
      || catalog.items.find((item) => normalize(item.key).includes(q) || normalize(item.target).includes(q))
      || catalog.items.find((item) => item.terms.some((term) => normalize(term).includes(q)))
      || null;
  }

  async function loadItem(item) {
    if (!item) return;
    currentItem = item;
    shell.setActive("linaje");
    shell.pageTitle.textContent = "Linaje de datos global";
    shell.targetLabel.textContent = "Actualizado: 3 de julio de 2026";
    shell.relMode.textContent = `Vista linaje: ${item.key}`;
    shell.input.value = item.key;
    shell.setCounts(item.counts);
    viewer.showHtml(createLineageDocument(item.dataPath));
  }

  async function showAll() {
    currentItem = null;
    shell.setActive("linaje");
    shell.pageTitle.textContent = "Linaje de datos global";
    shell.targetLabel.textContent = "Actualizado: 3 de julio de 2026";
    shell.relMode.textContent = "Vista global tabla-a-tabla";
    shell.input.value = "";
    shell.setCounts(catalog.overviewCounts);
    viewer.showHtml(createLineageDocument(catalog.pages.globalLineage));
  }

  function loadSearch() {
    if (!normalize(shell.input.value)) {
      showAll();
      return;
    }
    loadItem(findItem(shell.input.value));
  }

  function bindToolbar() {
    shell.input.addEventListener("input", () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(loadSearch, 180);
    });
    shell.input.addEventListener("change", () => {
      clearTimeout(inputTimer);
      loadSearch();
    });
    shell.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        clearTimeout(inputTimer);
        loadSearch();
      }
    });
    shell.clearSearch.addEventListener("click", showAll);
    shell.reset.addEventListener("click", () => (currentItem ? loadItem(currentItem) : showAll()));
    shell.zoomOut.addEventListener("click", () => viewer.zoomOut());
    shell.zoomIn.addEventListener("click", () => viewer.zoomIn());
    shell.downloadCsv.addEventListener("click", () => viewer.downloadCsv());
  }

  return { bindToolbar, showAll, loadItem };
}
