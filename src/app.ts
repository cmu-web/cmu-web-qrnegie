import express from "express";
import path from "node:path";
import { qrImage, GenerateError, LABEL_LIMIT, iconNames } from "./qr";
import { mountMcp } from "./mcp";
import { STYLES, type QrStyle } from "./styles";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.static(path.join(__dirname, "..", "docs")));
  // Bootstrap Icons' font, the same release the renderer draws, for the
  // builder's icon picker
  app.use(
    "/bootstrap-icons",
    express.static(path.join(require.resolve("bootstrap-icons/package.json"), "..", "font"), {
      maxAge: "1d",
    }),
  );
  // Center Icon's choices, for the builder
  const names = iconNames();
  app.get("/icons.json", (_req, res) => {
    res.set("Cache-Control", "public, max-age=86400").json(names);
  });
  app.get("/healthz", (_req, res) => {
    res.type("text/plain").send("ok\n");
  });
  app.get(["/qr.svg", "/qr.png"], async (req, res) => {
    try {
      const { text, style = "scotty", width = "512", above, below, icon } = req.query;
      if (
        Object.keys(req.query).some(
          (k) => !["text", "style", "width", "above", "below", "icon"].includes(k),
        ) ||
        (above !== undefined && typeof above !== "string") ||
        (below !== undefined && typeof below !== "string") ||
        (icon !== undefined && typeof icon !== "string") ||
        typeof text !== "string" ||
        typeof style !== "string" ||
        !STYLES.includes(style as QrStyle) ||
        typeof width !== "string" ||
        !/^\d{2,4}$/.test(width)
      )
        throw new GenerateError(
          `Give text once, style=plain, scotty, mosaic, kraus-campo, wean, binary-heart, tilted-square, block-monogram or icon (with icon= a Bootstrap Icons name), a whole-number width and, if you like, above and below, lines of text of up to ${LABEL_LIMIT} characters each.`,
        );
      const format = req.path.endsWith(".png") ? "png" : "svg";
      const image = await qrImage(text, style as QrStyle, Number(width), format, {
        above,
        below,
        icon,
      });
      res
        .set({
          // A day in production; never in development, where styles change
          "Cache-Control":
            process.env.NODE_ENV === "production" ? "public, max-age=86400" : "no-store",
          "Content-Security-Policy": "default-src 'none'",
          "X-Content-Type-Options": "nosniff",
        })
        .type(format)
        .send(image);
    } catch (e) {
      res
        .status(e instanceof GenerateError ? e.status : 500)
        .type("text/plain")
        .send(
          e instanceof GenerateError ? e.message : "The QR code wasn't created. Try shorter text.",
        );
    }
  });
  mountMcp(app);
  return app;
}
