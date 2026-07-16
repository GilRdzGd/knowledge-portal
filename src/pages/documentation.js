import { mountDocumentation } from "../components/documentation-renderer.js";

export function createDocumentationPage({ shell }) {
  return {
    show() {
      shell.setActive("documentacion");
      shell.pageTitle.textContent = "Documentacion";
      shell.targetLabel.textContent = "Guias, conceptos y referencia por perfil";
      shell.relMode.textContent = "Documentacion";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
      mountDocumentation(shell.documentacionMount);
      shell.documentacionMount.scrollTop = 0;
      shell.documentacionMount.scrollLeft = 0;
    }
  };
}
