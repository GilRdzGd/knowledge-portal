import { mountInventory } from "../components/inventory-renderer.js";

export function createInventoryPage({ shell }) {
  return {
    show() {
      shell.setActive("inventario");
      shell.pageTitle.textContent = "Inventario de Objetos";
      shell.targetLabel.textContent = "Objetos del modelo de datos";
      shell.relMode.textContent = "Inventario de Objetos";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
      mountInventory(shell.inventarioMount);
      shell.inventarioMount.scrollTop = 0;
      shell.inventarioMount.scrollLeft = 0;
    }
  };
}
