# Deployment

QRnegie runs as a container with no database, persistent application data
or outbound connections. The commands below use Podman; Docker can also
build and run the image.

## Images

The [publishing workflow](.github/workflows/publish.yml) runs all checks
and builds the production image. It publishes to
`ghcr.io/cmu-web/cmu-web-qrnegie` for version tags, such as `0.2.0`, and
manual workflow runs. Ordinary branch pushes and pull requests build
without publishing.

| Image Tag      | Meaning                                   |
| -------------- | ----------------------------------------- |
| `latest`       | Most recently published version-tag build |
| `X.Y.Z`        | Build of release tag `X.Y.Z`              |
| `sha-<commit>` | Build identified by its short commit hash |

A manual run publishes the commit image without moving `latest`. The
workflow builds for `linux/amd64`. To create a versioned release, follow
[Development](DEVELOPMENT.md#releasing).

For a deployment, pull the selected release and record its digest:

```bash
podman pull ghcr.io/cmu-web/cmu-web-qrnegie:latest
podman image inspect --format '{{.Digest}}' ghcr.io/cmu-web/cmu-web-qrnegie:latest
```

Use `ghcr.io/cmu-web/cmu-web-qrnegie@sha256:...` to pin that exact image.
Save the previous digest so you can redeploy it if needed.

## Run the Container

```bash
podman run -d --name qrnegie \
  -p 127.0.0.1:3000:3000 \
  -e PUBLIC_URL=https://qrnegie.example.edu \
  ghcr.io/cmu-web/cmu-web-qrnegie:latest
```

For a deployment, replace `:latest` with the recorded digest. The port
binding exposes the service on the host's loopback interface; a reverse
proxy can forward public requests to it. Change the first port number to
use a different host port.

The container serves documentation at `/`, images at `/qr.svg` and
`/qr.png`, the MCP server at `/mcp` and health at `/healthz`. Restarting
loses nothing; there is no state to keep.

## Configuration

Pass settings with `-e NAME=value` or `--env-file PATH`.
[`.env.example`](.env.example) is a starting point for an env file.

| Variable     | Default                          | Purpose                                                     |
| ------------ | -------------------------------- | ----------------------------------------------------------- |
| `PORT`       | `3000`                           | Listening port inside the container                         |
| `HOST`       | `0.0.0.0`                        | Listening address inside the container                      |
| `PUBLIC_URL` | `https://qrnegie.andrew.cmu.edu` | Origin of the image addresses the MCP server's tools return |

Set `PUBLIC_URL` to your own HTTPS origin when running your own instance;
otherwise the MCP server's addresses point at CMU's. If changing `PORT`,
update the container-side port in the mapping too. The image sets
`NODE_ENV=production` for Express.

## Check the Service

```bash
curl --fail --show-error http://127.0.0.1:3000/healthz
curl --fail --show-error 'http://127.0.0.1:3000/qr.png?text=https%3A%2F%2Fwww.cmu.edu%2F' -o /tmp/qrnegie-check.png
```

`/healthz` returns `ok` once the server is listening. It doesn't draw a QR code, so check an image response too.

The Dockerfile's health check requests `/healthz` every 30 seconds, with
a five-second timeout and a 60-second startup grace period. It follows
`PORT`. Where the runtime supports that health check, run it manually with:

```bash
podman healthcheck run qrnegie
```

For OCI images that omit the Dockerfile health check, configure an
equivalent in the container runtime or service definition.

### Investigate Failures

```bash
podman logs --tail 100 qrnegie
podman logs --follow qrnegie
```

A request with a missing or invalid option, or a size too small for its
text, returns 400 with a message saying what to change. Other failures
return 500.

To stop the service:

```bash
podman stop qrnegie
```

## Put the MCP Server Behind a Reverse Proxy

The MCP server answers POST requests at `/mcp` with plain JSON, with no
sessions, so any reverse proxy that forwards the whole site also covers
it. GET and DELETE on `/mcp` return 405; opening it in a browser is not a
health check.

## Build From Source

From the repository root:

```bash
podman build --target test .
podman build --format docker -t localhost/qrnegie:latest .
```

Use `localhost/qrnegie:latest` in the run command. `--format docker`
preserves the Dockerfile's `HEALTHCHECK` when building with Podman; omit
that flag with Docker.

The production image contains compiled TypeScript, production dependencies,
vector artwork and documentation. It runs as the non-root `node` user.
The Dockerfile pins the Node base image by digest and pins npm in the
shared base stage.

## Publish the Ruby Gem

Each version tag also publishes the Ruby gem in `packages/ruby/`,
`cmu-web-qrnegie`, at the same version, through the
[Ruby gem workflow](.github/workflows/rubygems.yml). It uses trusted
publishing, so it needs no API key, but RubyGems.org has to trust it first.
Do this once, before the first tag that should publish the gem:

1. Sign in to RubyGems.org with an account that has multi-factor
   authentication on.
2. Under Trusted Publishers, add a pending trusted publisher for the gem
   `cmu-web-qrnegie`: GitHub Actions, owner `cmu-web`, repository
   `cmu-web-qrnegie`, workflow `rubygems.yml` and environment `rubygems`.

The first successful run creates the gem on RubyGems.org, owned by that
account. Until then, the workflow's publish step fails on each tag; the
image is published as usual.
