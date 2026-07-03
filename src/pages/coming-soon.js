export function showComingSoon({ shell, viewer, view, title }) {
  shell.setActive(view);
  shell.pageTitle.textContent = title;
  shell.targetLabel.textContent = "Seccion del portal";
  shell.relMode.textContent = "Pendiente";
  shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
  viewer.showDocument({
    title,
    body: "Esta seccion ya esta separada en la navegacion y lista para conectar sus datos/componentes."
  });
}
