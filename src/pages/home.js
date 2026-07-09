const cubeMarkup = '<span class="home-cube" aria-hidden="true"><i></i><i></i><i></i></span>';

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function homeVersion(meta) {
  const major = meta?.versionMajor ?? 2;
  const build = meta?.versionBuild ?? 35;
  return `${major}.${build}`;
}

function createHomeDocument(appMeta) {
  const productName = escapeHtml(appMeta?.productName || "Plataforma de Datos");
  const version = escapeHtml(homeVersion(appMeta));
  const updatedAt = escapeHtml(appMeta?.updatedAt || "9 de julio de 2026");
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Plataforma de Datos</title>
  <link rel="stylesheet" href="assets/css/embed-overrides.css" />
</head>
<body class="home-doc">
  <main class="home-stage">
    <div class="home-mark">
      <section class="home-identity" aria-label="${productName}">
        ${cubeMarkup}
        <div class="home-copy">
          <h1>${productName}</h1>
          <p>Version ${version} Fecha de Actualizacion ${updatedAt}</p>
        </div>
      </section>
    </div>
  </main>
</body>
</html>`;
}

export function createHomePage({ shell, viewer, appMeta }) {
  return {
    show() {
      shell.setActive("inicio");
      shell.pageTitle.textContent = appMeta?.productName || "Plataforma de Datos";
      shell.targetLabel.textContent = "Inicio";
      shell.relMode.textContent = "Inicio";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createHomeDocument(appMeta));
    }
  };
}
