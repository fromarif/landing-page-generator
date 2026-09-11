import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { site } from './src/config/site';

// See docs/prefix.md before changing this.
const siteConfigFile = fileURLToPath(new URL('./src/config/site.ts', import.meta.url));
const prefixPartial = fileURLToPath(new URL('./src/styles/_prefix.scss', import.meta.url));

function writePrefixPartial(prefix: string) {
  const body = `// GENERATED from src/config/site.ts — do not edit.\n$prefix: '${prefix}';\n`;
  if (!fs.existsSync(prefixPartial) || fs.readFileSync(prefixPartial, 'utf8') !== body) {
    fs.writeFileSync(prefixPartial, body);
  }
}

writePrefixPartial(site.prefix);

export default defineConfig({
  build: { format: 'directory' },

  vite: {
    plugins: [
      {
        name: 'sync-scss-prefix-with-site-config',
        handleHotUpdate({ file, server }) {
          if (file === siteConfigFile) {
            const src = fs.readFileSync(siteConfigFile, 'utf8');
            const match = src.match(/prefix:\s*['"]([A-Za-z_][\w-]*)['"]/);
            if (match) writePrefixPartial(match[1]);
            else console.warn('[prefix] site.ts: `prefix` must be a plain string literal.');
            return;
          }

          if (file === prefixPartial) {
            server.hot.send({ type: 'full-reload', path: '*' });
            return [];
          }
        },
      },
    ],
  },
});
