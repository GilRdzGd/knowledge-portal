# Knowledge Portal

Portal modular para explorar el linaje y el modelo de datos de Coinpro.

## Estructura

```text
knowledge-portal/
├─ src/
│  ├─ components/        # Shell, visor iframe y chat local
│  ├─ pages/             # Controladores de secciones
│  ├─ data/              # Catalogo, conteos y schema del modelo en JSON
│  └─ styles/            # CSS principal, modelo y overrides para iframes
├─ public/
│  └─ assets/
│     ├─ data/           # Assets publicos no estructurados
│     └─ images/         # Assets graficos
├─ dist/                 # Build estatico publicable
├─ scripts/              # Build y servidor local sin dependencias
└─ .github/workflows/
```

## Comandos

```bash
npm run build
npm run dev
```

`npm run dev` sirve `dist/` en `http://localhost:4173`.

## Notas de migracion

- El HTML monolitico fue dividido en datos, estilos y modulos JS.
- Cada linaje individual vive en `src/data/lineage/*.json`; el renderer comun esta en `src/components/lineage-renderer.js` y su template en `src/components/lineage-template.js`.
- El catalogo principal vive en `src/data/catalog.json`.
- El modelo ya no vive como `model.html`; su data esta en `src/data/model-schema.json`, su renderer en `src/components/modeler.js` y su CSS en `src/styles/model.css`.
- El chat local no usa backend ni API externa; indexa la metadata JSON en el navegador.
