# JSON Validator

Validate JSON with precise error locations and optional JSON Schema
validation — fast, free, and 100% client-side. Your input is never sent
over the network; everything runs in your browser.

**Live:** https://techshield-tech.github.io/json-validator/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- Strict JSON validation using the browser's own `JSON.parse` by default.
- Precise error line/column, computed from the position `JSON.parse`
  reports (or reported directly by the lenient parser — see below), shown
  alongside a highlighted excerpt of the offending line with a caret marker
  under the exact column.
- Optional "Allow lenient JSON (JSON5-ish)" mode (off by default) that
  accepts trailing commas, `//` and `/* */` comments, single-quoted
  strings, and unquoted object keys — the common leniencies people reach
  for when hand-editing JSON, not a full JSON5 implementation.
- Optional JSON Schema validation against a second document, supporting
  both draft-07 and 2020-12 — the dialect is auto-detected from the
  schema's `$schema` field (defaulting to draft-07 when unspecified).
  Errors are listed with their `instancePath` and `message`.
- Stats for valid JSON: root value type, key count (objects) or element
  count (arrays), max nesting depth, and byte size (UTF-8 byte length of
  the input, not character count).
- "Load sample" buttons for both the JSON data and JSON Schema fields.
- Responsive down to 360px viewport width.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="json-validator"
  src="https://techshield-tech.github.io/json-validator/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="JSON Validator"
></iframe>

<script>
  const iframe = document.getElementById('json-validator');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'json-validator') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'json-validator') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'json-validator'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'json-validator', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
