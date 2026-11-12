# Dev container: Linux-consistent headed Cypress runs

This folder is a working [dev container](https://containers.dev/) for this repository and, at the same time, a copy-paste reference for users of `@frsource/cypress-plugin-visual-regression-diff` who want their local baselines to match the ones produced on Linux CI.

## Why

Chrome hands text rasterisation to the operating system (CoreText on macOS, DirectWrite on Windows, FreeType/fontconfig on Linux). Font hinting, anti-aliasing, installed font families, emoji fonts and scrollbar styling all differ, so a screenshot taken on your Mac never matches the same screenshot taken on `ubuntu-latest` byte for byte. Cross-OS determinism inside the browser is not achievable (see [issue #212](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/212)).

The cheapest way around it is to not render on your OS at all: run `cypress open` _inside_ a Linux container, look at the runner through a browser-based VNC client, and approve diffs in the plugin's review UI knowing they are Linux pixels. That is what this container does.

## What's inside

- [`devcontainer.json`](./devcontainer.json): the whole setup, no Dockerfile.
  - Image: `cypress/browsers:node-24.21.0-chrome-153.0.8010.36-1-ff-156.0-edge-153.0.4234.32-1` (Debian trixie, Node 24.21.0 like `.nvmrc`, Chrome, Firefox and Edge preinstalled; multi-arch). Bump the tag together with `.nvmrc`.
  - [`desktop-lite`](https://github.com/devcontainers/features/tree/main/src/desktop-lite) feature: a lightweight Fluxbox desktop, a VNC server on port 5901 and the noVNC web client on port 6080 (password `vscode`). It sets `DISPLAY=:1` for you.
  - `--shm-size=2g`: Chrome and Electron crash on Docker's default 64 MB `/dev/shm`.
  - `postCreateCommand` installs pnpm via corepack, installs dependencies, builds the plugin and runs `cypress verify`.
- The image runs as `root` and has no `node` user (Cypress launches Chrome with `--no-sandbox`, so this works). If you prefer a non-root user, add the `ghcr.io/devcontainers/features/common-utils:2` feature with `"username": "node"` and change `remoteUser`; the Cypress binary cache then moves from `/root/.cache/Cypress` to the new home, so run `npx cypress install` once.
- The image sets `CI=1`; the container config unsets it so interactive tooling behaves normally.

## Open it

- **VS Code**: install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension, open the repository, run "Dev Containers: Reopen in Container". The first start pulls the image (about 1.5 GB) and runs `postCreateCommand`.
- **CLI**: `npm i -g @devcontainers/cli`, then `devcontainer up --workspace-folder .` and `devcontainer exec --workspace-folder . pnpm test:e2e`.
- **GitHub Codespaces**: works out of the box; port 6080 shows up in the Ports panel. Note that `runArgs` (and therefore `--shm-size`) is ignored in Codespaces, see the caveat below.

## Run Cypress headed and look at it

From the repository root inside the container:

```bash
pnpm test:e2e   # starts examples/next and `cypress open --e2e`
pnpm test:ct    # same for component testing
```

Open the forwarded port 6080 in your browser (VS Code offers it automatically), enter the password, and the Cypress app appears on the Fluxbox desktop. Everything the plugin does in headed mode works as usual: the "See comparison" link, the floating Batch Review button and the approve/skip carousel. The examples write their baselines to gitignored `__image_snapshots_local__` folders, so you can experiment freely.

The virtual screen is 1440x768 by default. For a bigger one set `"VNC_RESOLUTION": "1920x1080x24"` in `containerEnv` (read by the desktop-lite start script) and rebuild the container.

## Fonts and the honest parity caveat

The image installs only the libraries Chrome needs plus whatever the browser packages pull in (Chrome depends on `fonts-liberation`). Your CI job most likely runs on `ubuntu-latest`, whose font set is different again (DejaVu, Liberation and several Noto families among others). Two ways to close the gap:

1. Install the same font packages in the container that your CI has, and compare `fc-list | sort` on both sides. A reasonable superset for GitHub-hosted runners:

   ```json
   "postCreateCommand": "apt-get update && apt-get install -y --no-install-recommends fonts-liberation fonts-dejavu-core fonts-noto-color-emoji fonts-noto-cjk && corepack enable && ..."
   ```

2. The only way to get byte-identical output is to run CI in the _same_ image. On GitHub Actions that is a two-line change on the job:

   ```yaml
   jobs:
     test:
       runs-on: ubuntu-latest
       container:
         image: cypress/browsers:node-24.21.0-chrome-153.0.8010.36-1-ff-156.0-edge-153.0.4234.32-1
         options: --shm-size=2g
   ```

   Then the same fonts, the same Chrome build and the same libraries render both sides. This repository's own CI does not do that yet; it is an optional follow-up.

Without step 2 the dev container narrows the drift (same OS family, same rasteriser) but does not remove it, so keep the plugin's `maxDiffThreshold` as your safety net.

## Pairing with per-platform baselines

Baselines produced in this container are Linux baselines and should not be mixed with the ones your teammates produce natively on macOS or Windows. The plugin's `imagesPath` accepts `{platform}`, `{os}` and `{browser}` tokens for exactly this (opt-in, the default layout stays flat): with

```ts
// cypress.config.ts (Cypress 15.10+; use `env` instead of `expose` on Cypress <15.10)
export default defineConfig({
  expose: {
    pluginVisualRegressionImagesPath: '{spec_path}/__image_snapshots__/{platform}',
  },
});
```

screenshots taken in the container land in `linux-electron/` or `linux-chrome/`, the same folders a Linux CI job writes to, while a native macOS run writes to `darwin-*` and never collides. See "Per-platform baselines" in the plugin README for the `.gitignore` recipe that commits only the CI folder. On a plugin version without the tokens, the README's `Commands.overwrite` recipe gives the same effect when you extend it with `Cypress.platform`.

## Where this is heading

This container is the "run the whole runner inside Linux" answer to drift, and it has one property nothing else has: full fidelity. The browser that runs the test takes the picture, so canvas, WebGL, video frames and cross-origin iframes come for free. What it costs is the headed experience (a desktop over noVNC instead of a native window), slow bind mounts on macOS and Windows, and a 1.5 GB image.

The plan for [#212](https://github.com/FRSOURCE/cypress-plugin-visual-regression-diff/issues/212) keeps both options and adds a third:

- A **renderer sidecar**: Cypress stays native and headed, `matchImage` serialises the page's DOM and a small pinned Docker container renders it, so local and CI pixels are identical by construction and the review carousel keeps working in your normal Cypress window. This is the intended default for Cypress; it trades fidelity (canvas, WebGL, video, cross-origin frames) for a native runner.
- A **`run-cypress` helper** in the same CLI that wraps `docker run` with the right mounts, a Linux `node_modules` volume, environment pass-through and `baseUrl` rewriting. That is the scripted version of what this folder does by hand, for canvas- or WebGL-heavy suites and for people who never use the headed GUI.
- This dev container stays as the documentation-only version of the helper, and as the way to _review_ Linux renders headed when you want the full-fidelity path.

The run manifest records where each screenshot was rendered (`renderer`) separately from where the test ran (`platform`), so CI tooling can tell the three apart.

## Docker alternatives on macOS

Anything that speaks the Docker API works: Docker Desktop, [OrbStack](https://orbstack.dev/), [Colima](https://github.com/abiosoft/colima) (`colima start --vm-type=vz --vz-rosetta --cpu 4 --memory 8`) or Podman (`podman machine init && podman machine start`, then set `"dev.containers.dockerPath": "podman"` in VS Code; with a non-root `remoteUser` you may also need `--userns=keep-id` in `runArgs`).

## Apple Silicon

By default you get the native `linux/arm64` image, which is fast. Chrome and Firefox are available on arm64, Edge is not. Renders from the arm64 and amd64 builds of the same Chrome version are usually identical, but that is not guaranteed. For exact parity with an amd64 CI runner force the platform:

```jsonc
"runArgs": ["--platform=linux/amd64", "--shm-size=2g"]
```

Expect the emulated container (Rosetta on Docker Desktop/OrbStack/Colima with `--vz-rosetta`, QEMU elsewhere) to be roughly 2 to 5 times slower. If your runtime does not honour `--platform` in `runArgs`, replace `"image"` with a one-line `Dockerfile` (`FROM --platform=linux/amd64 cypress/browsers:<tag>`) and point `"build": { "dockerfile": "Dockerfile" }` at it.

## Performance

Bind-mounting the repository from macOS or Windows makes file watching and `pnpm install` slow. The usual remedies: "Dev Containers: Clone Repository in Container Volume..." (the repo lives in a Docker volume, the fastest option), or exclude `node_modules` and `.next` from the mount. Both examples keep their build output inside the container anyway.

## Codespaces caveat

Codespaces ignores `runArgs`, so `--shm-size` has no effect there. If Chrome crashes with "Aw, Snap!" or Electron dies mid-run, tell it to stop using `/dev/shm`:

```ts
// cypress.config.ts
setupNodeEvents(on, config) {
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.family === 'chromium') launchOptions.args.push('--disable-dev-shm-usage');
    return launchOptions;
  });
}
```

Remember that Cypress supports one handler per event, so compose this with the plugin's own handler via [`cypress-on-fix`](https://github.com/bahmutov/cypress-on-fix) as described in the README FAQ.

## Cleaning up

`docker volume ls` shows the volumes the dev container created (workspace clone, pnpm store); remove them with `docker volume rm` when you are done. The examples' `__image_snapshots_local__` folders are gitignored, so nothing from a container session leaks into a commit unless you move it into `__image_snapshots__` yourself.
