export function createDocumentationDocument() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Documentacion</title>
  <link rel="stylesheet" href="assets/css/documentation.css" />
</head>
<body>
  <main class="doc-app" id="docApp">
    <section class="doc-loading">Cargando documentacion...</section>
  </main>
  <script type="module" src="assets/js/components/documentation-renderer.js"><\/script>
</body>
</html>`;
}
