export function createViewer(shell) {
  let currentZoom = 1;

  function withEmbedStyles(html) {
    const tag = '<link rel="stylesheet" href="assets/css/embed-overrides.css" />';
    return html.includes("</head>") ? html.replace("</head>", `${tag}</head>`) : `${tag}${html}`;
  }

  async function loadHtml(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`No se pudo cargar ${path}: ${response.status}`);
    return response.text();
  }

  function setZoom(value) {
    currentZoom = Math.max(0.1, Math.min(2.25, value));
    shell.frameWrap.style.transform = `scale(${currentZoom})`;
    shell.frameWrap.style.width = `${100 / currentZoom}%`;
    shell.zoomPct.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  return {
    get zoom() {
      return currentZoom;
    },
    async showPath(path) {
      const html = await loadHtml(path);
      shell.viewer.removeAttribute("src");
      shell.viewer.srcdoc = withEmbedStyles(html);
      setZoom(1);
      shell.scrollArea.scrollTop = 0;
      shell.scrollArea.scrollLeft = 0;
    },
    showHtml(html) {
      shell.viewer.removeAttribute("src");
      shell.viewer.srcdoc = html;
      setZoom(1);
      shell.scrollArea.scrollTop = 0;
      shell.scrollArea.scrollLeft = 0;
    },
    showDocument({ title, body }) {
      shell.viewer.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><link rel="stylesheet" href="assets/css/embed-overrides.css"></head><body class="empty-doc"><main><h1>${title}</h1><p>${body}</p></main></body></html>`;
      setZoom(1);
    },
    setZoom,
    resetZoom() {
      setZoom(1);
    },
    zoomIn() {
      setZoom(currentZoom + 0.1);
    },
    zoomOut() {
      setZoom(currentZoom - 0.1);
    },
    downloadCsv() {
      try {
        const win = shell.viewer.contentWindow;
        if (win && typeof win.downloadLineageCsv === "function") win.downloadLineageCsv();
      } catch (_) {
        /* The iframe may not expose a CSV export for placeholder pages. */
      }
    }
  };
}
