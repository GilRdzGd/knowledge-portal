import { createDocumentationDocument } from "../components/documentation-template.js";

export function createDocumentationPage({ shell, viewer }) {
  return {
    show() {
      shell.setActive("documentacion");
      shell.pageTitle.textContent = "Documentacion";
      shell.targetLabel.textContent = "Objetos del modelo de datos";
      shell.relMode.textContent = "Documentacion";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createDocumentationDocument());
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
    }
  };
}
