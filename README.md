# swerve. — Read the crowd.

A maintainable continuation of the original daily social prediction game prototype. The original five prompts, answer aliases, 30-second rounds, 2 Blend / 2 Swerve / 1 Sweet Spot tokens, scoring formulas, reveals, results, sharing and demo replay are preserved.

## Run locally

Use Node **22.18+** (Node 24 recommended).

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. This version uses modules and needs an HTTP server; opening `index.html` directly as a file is no longer supported.

```bash
npm run check       # TypeScript, domain/service tests, production build
npm run test:e2e    # Browser regression tests at three viewport sizes
npm run preview    # Serve dist after building
```

For browser tests, run `npx playwright install chromium` if Chromium is not already installed. Tests automatically use `/usr/bin/chromium` when available; `CHROMIUM_EXECUTABLE_PATH` can override the executable. Node's built-in TypeScript transformation currently prints an experimental-feature notice during unit tests.

`npm run build` writes a static application to `dist/`. Serve that directory over HTTP(S). Assets and fonts are included locally; the game needs no third-party requests in demo mode. Relative asset paths support both repository subpaths and custom domains.

Bundled font licenses are retained under `public/licenses/` and copied into the build. A GitHub Actions workflow runs the same checks when this project is placed in a repository.

## Host on GitHub Pages

The repository includes a manual Pages deployment workflow, so uploading the source does not publish the game. When ready to host, open **Settings → Pages → Build and deployment** in GitHub and select **GitHub Actions** as the source. Run **Actions → Deploy Swerve to GitHub Pages → Run workflow**. The workflow tests and builds the app, then publishes `dist/`. An automatic push trigger can be added once hosting is configured.

The site address is `https://<username>.github.io/<repository>/`. GitHub Pages is available for public repositories on GitHub Free; private-repository Pages requires an eligible paid plan. Pages hosts the playable demo. A future backend must be hosted separately.

## Development milestones

1. **Inspection and regression baseline:** all three original files were audited. The working `index.html` was treated as the source of truth; the stale, syntactically broken duplicate `check.js` was replaced with real tests.
2. **Maintainable application:** typed domain models and rules, one renderer per screen, a UI controller, versioned storage, service/repository interfaces, and separate demo/API clients.
3. **Reliable mobile play:** refresh preserves the active deadline, chosen mode, draft and reveal; help no longer interrupts the clock; submission checks the actual deadline; touch targets, labels, focus, safe-area spacing, reduced motion and readable small-screen scrolling were improved.
4. **Backend preparation:** UTC challenge metadata, stable local guest identity, account-ready player types, a validated HTTP transport, idempotency keys, server clock estimation, and a concrete server contract.

Clipboard failures now offer selectable share text instead of claiming success. Blocked browser storage shows a notice and permits in-memory play. Valid same-day progress from the original prototype migrates automatically when served from the same browser origin.

## Architecture and evidence

- [Original mechanics and file audit](docs/prototype-audit.md)
- [Application architecture and state model](docs/architecture.md)
- [Backend endpoints, account model and production responsibilities](docs/backend-contract.md)
- [Development milestones and validation](docs/milestones.md)

The source is organized under `src/domain`, `src/data`, `src/services`, `src/ui` and `src/styles`. Tests are in `tests/` and `e2e/`. The [GameClient interface](src/services/contracts.ts) is the replacement boundary for a future backend.

## Current scope

This is still an explicitly labeled **playable demo**. The content repeats as #001 each UTC day; percentages are authored fixtures. Unknown answers earn zero. Scores and local guest IDs can be edited by the browser and are not suitable for a public competition. Local guest identity is not an account, and there is no live leaderboard, moderation queue or cross-device sync.

The HTTP client is implemented and tested against mocked responses. No server, database or authentication provider is provisioned. Leave `VITE_SWERVE_API_BASE` unset to play locally. To connect a real server, implement [the contract](docs/backend-contract.md), set `VITE_SWERVE_API_BASE=/api` at build time and rebuild. Browser environment variables are public; keep secrets on the server.

The next production milestone is server-issued guest sessions plus transactional daily attempts and scoring against frozen distributions, followed by verified account linking. Browser tests cover Chromium mobile emulation and desktop; physical mobile keyboards and Safari still need device testing before release.
