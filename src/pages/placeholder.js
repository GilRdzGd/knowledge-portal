// Pagina generica tipo "placeholder" para secciones que aun no tienen datos.
// Reutilizable: cada seccion pasa su view, titulo, subtitulo, mount y descripcion.
export function createPlaceholderPage({ shell, view, title, subtitle, mount, description }) {
  return {
    show() {
      shell.setActive(view);
      shell.pageTitle.textContent = title;
      shell.targetLabel.textContent = subtitle;
      shell.relMode.textContent = title;
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      shell.frameWrap.style.transform = "none";
      shell.frameWrap.style.width = "100%";
      mount.innerHTML = `
        <section class="placeholder-page">
          <h2>${title}</h2>
          <p>${description}</p>
          <p class="placeholder-hint">Esta seccion ya esta conectada en la navegacion y lista para recibir su contenido.</p>
        </section>`;
      mount.scrollTop = 0;
      mount.scrollLeft = 0;
    }
  };
}
