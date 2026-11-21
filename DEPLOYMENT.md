# Deployment

## Release Files

Each version tag (e.g., `0.2.0`) publishes:

- **A container image,** `ghcr.io/cmu-web/cmu-web-qrnegie`, built for
  `linux/amd64`, with these tags:

  | Image Tag      | What                                      |
  | -------------- | ----------------------------------------- |
  | `X.Y.Z`        | The build of version tag `X.Y.Z`          |
  | `latest`       | The most recent version-tag build         |
  | `sha-<commit>` | A build identified by its short commit ID |

- **A Ruby gem,** `cmu-web-qrnegie`, at the same version, for building
  QRnegie addresses in Ruby and Rails; see
  [its README](packages/ruby/README.md).

## Install

QRnegie runs as a container with no database, saved data or outbound
connections.

### In a Container

```sh
docker run -d --name qrnegie \
  -p 127.0.0.1:3000:3000 \
  -e PUBLIC_URL=https://qrnegie.example.edu \
  ghcr.io/cmu-web/cmu-web-qrnegie:latest
```

Podman takes the same flags. For a deployment, pin the image by its digest,
so it's explicit, and keep the previous digest for rolling back:

```sh
docker pull ghcr.io/cmu-web/cmu-web-qrnegie:latest
docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/cmu-web/cmu-web-qrnegie:latest
```

Then run `ghcr.io/cmu-web/cmu-web-qrnegie@sha256:...` in place of `:latest`.
The port binding exposes the service on the host's loopback interface, for a
reverse proxy in front of it; change the first port number to use a
different host port.

The container serves the documentation at `/`, images at `/qr.svg` and
`/qr.png`, the MCP server at `/mcp` and its health at `/healthz`. Restarting
loses nothing; there's no state to keep.

### Configuration

Pass settings with `-e NAME=value` or `--env-file PATH`.
[`.env.example`](.env.example) is a starting point for an environment file.

| Variable     | Default                          | Purpose                                                     |
| ------------ | -------------------------------- | ----------------------------------------------------------- |
| `PORT`       | `3000`                           | Listening port inside the container                         |
| `HOST`       | `0.0.0.0`                        | Listening address inside the container                      |
| `PUBLIC_URL` | `https://qrnegie.andrew.cmu.edu` | Origin of the image addresses the MCP server's tools return |

Set `PUBLIC_URL` to your own HTTPS origin when running your own instance;
otherwise the MCP server's addresses point at CMU's. If you change `PORT`,
change the container's side of the port mapping too. The image sets
`NODE_ENV=production` for Express.

### Behind a Reverse Proxy

The MCP server answers POST requests at `/mcp` with plain JSON and no
sessions, so a reverse proxy that forwards the whole site covers it too. GET
and DELETE on `/mcp` return 405, so opening it in a browser isn't a health
check.

### Build From Source

From the repository root:

```sh
docker build --target test .
docker build -t localhost/qrnegie:latest .
```

With Podman, add `--format docker` to the second command, so the image keeps
the Dockerfile's health check. Use `localhost/qrnegie:latest` in the run
command.

The image holds the compiled TypeScript, production dependencies, vector
artwork and documentation, and runs as the non-root `node` user. The
Dockerfile pins the Node base image by digest and pins npm.

### Update

Pull the new release, record its digest and run it in place of the old one,
then check the service (below). If it fails, go back to the previous digest.

## Check the Service

```sh
curl --fail --show-error http://127.0.0.1:3000/healthz
curl --fail --show-error 'http://127.0.0.1:3000/qr.png?text=https%3A%2F%2Fwww.cmu.edu%2F' -o /tmp/qrnegie-check.png
```

`/healthz` returns `ok` once the server is listening. It doesn't draw a QR
code, so check an image too.

The Dockerfile's health check requests `/healthz` every 30 seconds, with a
five-second timeout and a 60-second grace period at startup, and follows
`PORT`. Docker runs it on its own;
`docker inspect --format '{{.State.Health.Status}}' qrnegie` shows the
result. With Podman, `podman healthcheck run qrnegie` runs it. A runtime that
ignores the Dockerfile's health check needs the same check set up itself.

### Investigate Failures

```sh
docker logs --tail 100 qrnegie
docker logs --follow qrnegie
```

A request with a missing or invalid option, or a size too small for its
text, returns 400 with a message saying what to change. Other failures return 500.

To stop the service, run `docker stop qrnegie`.
