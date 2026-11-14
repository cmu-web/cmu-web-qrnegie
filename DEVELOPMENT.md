# Development

QRnegie is a TypeScript service built with Express and sharp. It draws each QR code when it's requested, with no database, image storage or API
keys, and serves an MCP server beside its image addresses. Tests decode
the finished images with jsQR.

## Set Up the Devcontainer

Use Docker and the VS Code Dev Containers extension. Open the repository
in VS Code and select **Dev Containers: Reopen in Container** from the
Command Palette.

The devcontainer uses the Dockerfile's `development` stage, with the same
Node and npm as production. The Dockerfile is the source of truth for the
Node version. Dependencies are installed with `npm ci` in a separate volume;
the checkout is mounted at `/app`, and commands run as the `node` user.

In the container terminal:

```bash
npx prek install
npm run dev
```

Open the forwarded address for port 3000 in VS Code's **Ports** panel.
If that port is already in use on the host, VS Code may forward another
local port. Opening the container does not start the server automatically.

`npm run dev` watches `src/` and restarts the service when TypeScript
changes. It also serves `docs/` at `/`; reload the browser after editing
those HTML, JavaScript or image files.

Run `npm ci` after pulling dependency changes. After changing the Dockerfile
or devcontainer configuration, select **Dev Containers: Rebuild Container**.

## Where to Make Changes

| To Change                                    | Start Here                        |
| -------------------------------------------- | --------------------------------- |
| Image URLs, option validation or caching     | `src/app.ts`                      |
| Encoding, sizes and the Simple Scotty mark   | `src/qr.ts`                       |
| Styles and their artwork                     | `src/styles.ts` and `assets/`     |
| MCP tools                                    | `src/mcp.ts`                      |
| Documentation and examples                   | HTML pages in `docs/`             |
| The builder                                  | `docs/js/`                        |
| Service tests                                | `test/`                           |
| The runtime image or development environment | `Dockerfile` and `.devcontainer/` |
| Example images, tooling checks or previews   | `scripts/`                        |

## Update the Style Reference

`src/style-info.ts` supplies style IDs, names, grouping, descriptions,
minimum module sizes and error-correction levels. The renderer uses these
facts, and the documentation generator uses them for the Builder's style
menu, the Styles gallery and the Reference style table.

```bash
npm run docs
```

Edit descriptions in that source and regenerate the marked sections rather
than editing the generated HTML. `npm run check` checks that the output
matches the source. After adding a style or changing its appearance, also
regenerate the example images below. Keep user guidance in Styles,
integration details in Reference and sources and credits in About.

## Update the Example Images

The style examples in `docs/images/` and the home page's hero come from the
renderer itself. After changing a style, regenerate them:

```bash
npm run examples
```

The hero encodes `https://qrnegie.andrew.cmu.edu/`.

## Maintain the CMU Web Preview

`docs/images/cmu-web-preview.webp` is this site's screenshot for cards and
gallery entries on the other CMU Web sites. Keep it at 1040 by 656 pixels,
without a decorative browser frame, and publish updates at the same path.
Consumers use the public URL directly. The Open Graph image,
`images/preview.jpg`, is maintained separately.

## Checks

```bash
npm run check
```

This checks the Node types version, ESLint, Prettier, link preview metadata
and TypeScript, then runs tests and compiles the service. CI runs the same
command in the Dockerfile's `test` stage. To reproduce that from the host:

```bash
podman build --target test .
```

Tests render every style with several kinds of text, including Unicode and
long URLs, and decode each PNG with jsQR. They also cover the image routes,
option errors and the MCP tools. They don't contact any outside service.

### Pre-commit Hooks

Enable hooks once per checkout in the environment where you make commits:

```bash
npx prek install
```

The hooks run linting, formatting and type checking. Relevant tooling
changes also trigger the Node version check. They use the npm dependencies
and Node installation available to Git; run them inside the devcontainer
when committing there.

To run all hooks manually:

```bash
npx prek run --all-files
```

Hooks cover part of the full check. Run `npm run check` before submitting.

### Linting and Formatting

```bash
npm run lint:fix
npm run format
```

Review the diff after applying fixes. `npm run lint` and
`npm run format:check` check without changing files. The devcontainer
includes ESLint and Prettier extensions and formats supported files on save.

After changing documentation titles or descriptions, run
`npm run opengraph` to refresh link preview metadata, then format the results.

## Compile and Run

```bash
npm run build
npm start
```

The build compiles TypeScript from `src/` to CommonJS JavaScript in `dist/`.
`npm start` runs `dist/index.js`. Browser scripts in `docs/js/` have no
build step. Runtime settings are listed in
[Deployment](DEPLOYMENT.md#configuration); the service does not load an
`.env` file automatically.

## Update Node

Dependabot proposes Node changes through the Dockerfile's `FROM` line.
Update `@types/node` to the same major in that pull request; the
`check:node` command enforces the match. Rebuild the devcontainer and run
checks with the updated image. Keep the project on an even-numbered Node
release line; close proposals for odd-numbered lines.

## Releasing

A release publishes a container image to GitHub Container Registry and the
Ruby gem in `packages/ruby/` to RubyGems.org, both at the release's version.

1. Start from an up-to-date `main` with passing CI and a clean working tree.
2. Choose a major version for incompatible URL or option changes, a minor
   version for new features (a new style, for example) or runtime changes, or a
   patch for fixes and dependency updates.
3. Run `npm version major`, `npm version minor` or `npm version patch` with
   a Conventional Commits release message. For example:

   ```bash
   npm version minor -m "chore: release %s"
   ```

   This updates `package.json` and `package-lock.json`, creates a local
   commit and creates an annotated tag named for the version, like
   `0.2.0`, with no `v` prefix (set in `.npmrc`). Review the commit and
   tag before publishing.

4. Push `main` and the specific new tag together. The version tag starts
   the publishing workflow.
5. Confirm the workflow passed, add release notes and update deployments
   to the published image digest. See [Deployment](DEPLOYMENT.md#images).

Before pushing, correct any release preparation mistake locally and rerun
the checks. After publication, leave the tag in place and fix mistakes in
a new version.

## How the Service Works

`node-qrcode` encodes the text. Basic Black, Tilted Square and Block Monogram use medium
error correction; the other styles use high, so their artwork can stand in for part of the QR code. The high-correction styles also start at a minimum QR
version, so their artwork has enough modules to show; Mosaic Scotty's
minimum is higher at larger sizes, for a more detailed portrait.

The renderer draws the code as SVG. Function patterns, like the corner squares, are always plain squares; each style draws only the data modules.
Every module gets the same whole number of pixels, and each style has its
own minimum, so a width too small for the text returns an error with the
smallest width that works. Basic Scotty, Wean Hall and Binary Heart place
their marks where they cover no function patterns, shrinking them when a
dense code leaves no room. Mosaic Scotty samples the Scotty artwork once
per QR version to choose each module's color. Tilted Square is laid out on
its own, turned, with all its dark modules in one shape, and scaled to fit,
so its modules don't land on whole pixels. Kraus Campo adds a frame outside
the white margin.

PNGs are the same SVG rendered by sharp. Both Scotty styles use University Communications & Marketing's Scotty portrait. Kraus Campo's numerals are Open Sans ExtraBold outlines.

Center Icon draws icons from the `bootstrap-icons` package (MIT License),
a runtime dependency of plain SVG files. Each icon's file is read the first
time a code uses it, then kept in memory. `/icons.json` lists the names for
the builder.

Text above and below the code is drawn from Open Sans Bold outlines in
`src/glyphs.ts`, so the server and anyone viewing an image need no fonts
installed. `scripts/glyphs.py` writes that file from the font; it takes
Python with fontTools, and only matters when the lettering changes:

    python3 scripts/glyphs.py OpenSans-Bold.ttf src/glyphs.ts

Get `OpenSans-Bold.ttf` from the Open Sans project
(github.com/googlefonts/opensans, `fonts/ttf/`). It covers printable ASCII,
Latin-1 letters, curly quotes, dashes, the bullet, the ellipsis and the
copyright sign; anything else in text above or below the code is an
error.
In production, responses allow browser and proxy caching for one day; in
development they aren't cached, so style changes show on reload. Nothing
is written to disk.
