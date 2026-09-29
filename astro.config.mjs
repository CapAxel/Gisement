// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// URL publique du site (canonique, Open Graph, sitemap).
// À définir dans l'environnement de déploiement : SITE_URL=https://www.votre-domaine.fr
const site = process.env.SITE_URL ?? 'https://example.com';

export default defineConfig({
  site,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
