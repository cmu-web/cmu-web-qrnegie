import express from "express";
import path from "node:path";
import { qrImage, GenerateError, LABEL_LIMIT, iconNames } from "./qr";
import { mountMcp } from "./mcp";
import { STYLES, type QrStyle } from "./styles";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.static(path.join(__dirname, "..", "docs")));
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
      const { text, style = "scotty", size = "512", header, footer, icon } = req.query;
      if (
        Object.keys(req.query).some(
          (k) => !["text", "style", "size", "header", "footer", "icon"].includes(k),
        ) ||
        (header !== undefined && typeof header !== "string") ||
        (footer !== undefined && typeof footer !== "string") ||
        (icon !== undefined && typeof icon !== "string") ||
        typeof text !== "string" ||
        typeof style !== "string" ||
        !STYLES.includes(style as QrStyle) ||
        typeof size !== "string" ||
        !/^\d{2,4}$/.test(size)
      )
        throw new GenerateError(
          `Give text once, style=plain, scotty, mosaic, kraus-campo, wean, binary-heart, tilted-square, block-monogram or icon (with icon= a Bootstrap Icons name), a whole-number size and, if you like, a header and a footer of up to ${LABEL_LIMIT} characters each.`,
        );
      const format = req.path.endsWith(".png") ? "png" : "svg";
      const image = await qrImage(text, style as QrStyle, Number(size), format, {
        header,
        footer,
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
