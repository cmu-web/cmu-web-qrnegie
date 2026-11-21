# Development

Set up your computer once with
[Working on CMU Web Projects](https://github.com/cmu-web/.github/blob/main/DEVELOPMENT.md);
this page covers this project's own commands.

QRnegie is a TypeScript service built with Express and sharp. It draws each
QR code when it's requested, with no database, image storage or API keys,
and serves an MCP server beside its image addresses. Tests decode the
finished images with jsQR.

## Build It

### In the Devcontainer

Use Docker and the VS Code Dev Containers extension. Open the repository
in VS Code and select **Dev Containers: Reopen in Container** from the
Command Palette.

The devcontainer uses the Dockerfile's `development` stage, with the same
Node and npm as production. The Dockerfile is the source of truth for the
Node version. Dependencies are installed with `npm ci` in a separate volume;
the checkout is mounted at `/app`, and commands run as the `node` user.

In the container terminal:

```bash
npm run dev
```

Open the forwarded address for port 3000 in VS Code's **Ports** panel.
If that port is already in use on the host, VS Code may forward another
local port. Opening the container does not start the server automatically.

`npm run dev` watches `src/` and restarts the service when TypeScript
changes. It also serves `docs/` at `/`; reload the browser after editing
those HTML, JavaScript or image files.

To see an unreleased Web Kilt change here, run `npm run preview:kilt` in a
second terminal and open http://127.0.0.1:4100/. It puts the Web Kilt's
preview proxy in front of the service, with the pages' Kilt links pointed at
the checkout beside this one (`../cmu-web-kilt`, or set `KILT_DIR`). The
service itself still shows the pinned release.

Run `npm ci` after pulling dependency changes. After changing the Dockerfile
or devcontainer configuration, select **Dev Containers: Rebuild Container**.

### Compile and Run

```bash
npm run build
npm start
```

The build compiles TypeScript from `src/` to CommonJS JavaScript in `dist/`.
`npm start` runs `dist/index.js`. Browser scripts in `docs/js/` have no
build step. Runtime settings are listed in
[Deployment](DEPLOYMENT.md#configuration); the service does not load an
`.env` file automatically.

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

## Check a Change

The everyday check is `npm run check`: it needs nothing beyond `npm ci` and
no network access. It checks the Node types version, ESLint, Prettier, link
preview metadata and TypeScript, then runs the tests and compiles the
service.

The Publish Image workflow runs the same check in the Dockerfile's `test`
stage. To run it that way from the host (Podman takes the same command):

```bash
docker build --target test .
```

Tests render every style with several kinds of text, including Unicode and
long URLs, and decode each PNG with jsQR. They also cover the image routes,
option errors and the MCP tools. They don't contact any outside service.

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
gallery entries on the other CMU Web sites. Keep it at 1040 × 656 pixels,
without a decorative browser frame, and publish updates at the same path.
Consumers use the public URL directly. The Open Graph image,
`images/preview.jpg`, is maintained separately.

To make it, capture the published home page with FencePost's gallery
command, from a FencePost checkout. It takes the public page at 1040 × 656,
signed out, with the menu closed:

```bash
npm run gallery -- https://qrnegie.andrew.cmu.edu/ /path/to/cmu-web-qrnegie/docs/images/cmu-web-preview.webp
```

## Update Node

Dependabot proposes Node changes through the Dockerfile's `FROM` line.
Update `@types/node` to the same major in that pull request; the
`check:node` command enforces the match. Rebuild the devcontainer and run
checks with the updated image. Keep the project on an even-numbered Node
release line; close proposals for odd-numbered lines.

## Release

A release publishes a container image to GitHub Container Registry and the
Ruby gem in `packages/ruby/` to RubyGems.org, both at the release's version.

1. Start from an up-to-date `main` with passing CI and a clean working tree.
2. Choose a major version for incompatible URL or option changes, a minor
   version for new features (e.g., a new style) or runtime changes, or a
   patch for fixes and dependency updates.
3. Run `npm version major`, `npm version minor` or `npm version patch` with
   a Conventional Commits release message, e.g.:

   ```bash
   npm version minor -m "chore: release %s"
   ```

   This updates `package.json` and `package-lock.json`, creates a local
   commit and creates an annotated tag named for the version (e.g.,
   `0.2.0`, with no `v`, set in `.npmrc`). Review the commit and
   tag before publishing.

4. Push `main` and the specific new tag together. The version tag starts
   the Publish Image and Publish Gem workflows.
5. Confirm both workflows passed, create the tag's GitHub release with its
   notes and record the image's digest.

Before pushing, correct any release preparation mistake locally and rerun
the checks. After publication, leave the tag in place and fix mistakes in
a new version.

The Publish Gem workflow uses trusted publishing, so there's no API key to
store. RubyGems.org trusts it as: GitHub Actions, owner `cmu-web`, repository
`cmu-web-qrnegie`, workflow `publish-gem.yml` and environment `rubygems`.
Renaming the workflow file stops publishing until that trusted publisher is
changed to match.
