# Fourie van Rooyen — Aerospace Engineering Portfolio

A static Astro and Three.js portfolio built for `https://fourievanrooyen.github.io/`.

## Local preview

1. Install Node.js 22 and pnpm.
2. Run `pnpm install`.
3. Run `pnpm dev` and open the printed local address.

## Validation and production build

- `pnpm test` validates content and document references.
- `pnpm check` validates Astro and TypeScript.
- `pnpm build` creates and verifies the deployable site in `dist/`.

## GitHub Pages

The included `.github/workflows/deploy.yml` publishes `dist/` when changes reach the `main` branch. In the repository settings, choose **GitHub Actions** as the Pages source.

## Content and assets

- Site content is maintained in `src/data/site.ts`.
- Public images and responsive AVIF/WebP variants are in `public/images/`.
- Résumé, reports, recommendations, and project documents are in `public/docs/`.
- Buttons for code, demos, or videos are intentionally absent until verified URLs are added.

## Pre-publication disclosure review

The approved public build includes a personal phone number, signed recommendation letters, and supplied RTX/Coyote program wording. Review those items against personal privacy preferences and employer, NDA, and export-control obligations before deployment.
