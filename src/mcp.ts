import type { Express } from "express";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { LABEL_LIMIT, qrImage, xml } from "./qr";
import sharp from "sharp";
import { STYLES } from "./styles";

const version = (
  JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string }
).version;
export function createMcp(base = process.env.PUBLIC_URL || "https://qrnegie.andrew.cmu.edu") {
  const server = new McpServer(
    { name: "qrnegie", title: "QRnegie", version },
    {
      instructions:
        "Scotty, Beam Me There. Create Mosaic Scotty, Basic Scotty, Kraus Campo, Wean Hall, Binary Heart, Tilted Square, Block Monogram or Basic Black QR codes with generate_qr. Preserve the included white quiet zone. Download SVG for print or PNG for everyday use. Text is encoded exactly without fetching the destination. Scotty artwork and CMU marks are for authorized CMU use.",
    },
  );
  server.registerTool(
    "get_guide",
    {
      description: "Get QRnegie's image API and integration guidance.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => ({
      content: [
        {
          type: "text",
          text: `Use ${base}/qr.svg or /qr.png with text, style=plain|scotty|mosaic|kraus-campo|wean|binary-heart|tilted-square|block-monogram|icon (icon=<Bootstrap Icons name>, default link-45deg) and size (default 512, max 2048); optional header and footer, up to 40 characters each, add lines of text (the image grows taller, except Kraus Campo, which letters its orange band). Art styles use H correction, Plain uses M. Artistic styles require larger exports; use 1024 for detailed artwork. The four-module margin is built in. Keep the code square and test printed exports at their final size. Payload limit: 1024 UTF-8 bytes. Maintained by the Office of the Vice Provost for Teaching and Learning Innovation.`,
        },
      ],
    }),
  );
  server.registerTool(
    "generate_qr",
    {
      description:
        "Create a QR image in Mosaic Scotty, Basic Scotty, Kraus Campo, Wean Hall, Binary Heart, Tilted Square, Block Monogram, Center Icon (with icon, a Bootstrap Icons name such as wifi) or Basic Black style, with an optional header and footer of up to 40 characters. Returns a PNG, embeddable image addresses and HTML. No destination fetch, storage or tracking.",
      inputSchema: {
        text: z.string().min(1).max(1024),
        style: z.enum(STYLES).default("scotty"),
        size: z.number().int().min(96).max(2048).default(512),
        header: z.string().max(LABEL_LIMIT).optional(),
        footer: z.string().max(LABEL_LIMIT).optional(),
        icon: z.string().max(60).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ text, style, size, header, footer, icon }) => {
      try {
        const image = await qrImage(text, style, size, "png", { header, footer, icon }),
          query = new URLSearchParams({ text, style, size: String(size) }),
          // A header or footer makes the image taller than it is wide
          { height = size } = await sharp(image).metadata();
        if (header?.trim()) query.set("header", header.trim());
        if (footer?.trim()) query.set("footer", footer.trim());
        if (style === "icon" && icon?.trim()) query.set("icon", icon.trim());
        const svg = `${base}/qr.svg?${query}`,
          png = `${base}/qr.png?${query}`;
        return {
          content: [
            { type: "image", mimeType: "image/png", data: image.toString("base64") },
            {
              type: "text",
              text: JSON.stringify(
                {
                  svg,
                  png,
                  html: `<img src="${xml(svg)}" alt="QR code for ${xml(text)}" width="${size}" height="${height}" />`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: e instanceof Error ? e.message : "The QR code wasn't generated.",
            },
          ],
        };
      }
    },
  );
  return server;
}

export function mountMcp(app: Express) {
  app.post("/mcp", express.json({ limit: "32kb" }), async (req, res) => {
    const server = createMcp(),
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent)
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "MCP request failed." },
          id: null,
        });
    }
  });
  app.all("/mcp", (_req, res) => {
    res.status(405).set("Allow", "POST").json({ error: "Use Streamable HTTP POST." });
  });
}
