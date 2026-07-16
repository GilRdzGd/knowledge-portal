import { mountNomenclatura } from "../components/nomenclatura-generator.js";

export function createNomenclaturasPage({ shell }) {
  return {
    show() {
      shell.setActive("nomenclaturas");
      shell.pageTitle.textContent = "Nomenclaturas";
      shell.targetLabel.textContent = "Generador de nombres de objetos de datos";
      shell.relMode.textContent = "Nomenclaturas";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
      mountNomenclatura(shell.nomenclaturasMount);
      shell.nomenclaturasMount.scrollTop = 0;
      shell.nomenclaturasMount.scrollLeft = 0;
    }
  };
}
