import { createModelDocument } from "../components/model-template.js";

export function createModelPage({ catalog, shell, viewer }) {
  return {
    async show() {
      shell.setActive("modelo");
      shell.setModelExpanded(false);
      shell.pageTitle.textContent = "Modelo de datos";
      shell.targetLabel.textContent = "Coinpro Data Vault - modelo de tablas";
      shell.relMode.textContent = "Vista modelo";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createModelDocument());
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
    }
  };
}
