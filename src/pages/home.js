const cubeMarkup = '<span class="home-cube" aria-hidden="true"><i></i><i></i><i></i></span>';

function createHomeDocument() {
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
    <div class="home-mark">${cubeMarkup}</div>
    <h1>Plataforma de Datos</h1>
  </main>
</body>
</html>`;
}

export function createHomePage({ shell, viewer }) {
  return {
    show() {
      shell.setActive("inicio");
      shell.pageTitle.textContent = "Plataforma de Datos";
      shell.targetLabel.textContent = "Inicio";
      shell.relMode.textContent = "Inicio";
      shell.setCounts({ upstream: 0, downstream: 0, neighborhood: 0 });
      viewer.showHtml(createHomeDocument());
    }
  };
}
