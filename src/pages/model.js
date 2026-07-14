import { createModelDocument } from "../components/model-template.js";

export function createModelPage({ catalog, shell, viewer, appMeta }) {
  return {
    async show() {
      shell.setActive("modelo");
      shell.setModelExpanded(false);
      shell.pageTitle.textContent = "Modelo de Datos";
      shell.targetLabel.textContent = `Publicado: ${appMeta?.modelPublishedAt || "3 de julio de 2026"}`;
      shell.relMode.textContent = "Vista modelo";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createModelDocument());
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
    }
  };
}
