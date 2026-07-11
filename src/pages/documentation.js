import { mountDocumentation } from "../components/documentation-renderer.js";

export function createDocumentationPage({ shell }) {
  return {
    show() {
      shell.setActive("documentacion");
      shell.pageTitle.textContent = "Documentacion";
      shell.targetLabel.textContent = "Objetos del modelo de datos";
      shell.relMode.textContent = "Documentacion";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
      mountDocumentation(shell.documentationMount);
      shell.documentationMount.scrollTop = 0;
      shell.documentationMount.scrollLeft = 0;
    }
  };
}
