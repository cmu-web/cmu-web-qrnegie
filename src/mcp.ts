import type { Express } from "express";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { qrImage, xml } from "./qr";
import { STYLES } from "./styles";

const version = (
  JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")) as { version: string }
).version;
export function createMcp(base = process.env.PUBLIC_URL || "https://qrnegie.andrew.cmu.edu") {
  const server = new McpServer(
    { name: "qrnegie", title: "QRnegie", version },
    {
      instructions:
        "Scotty, Beam Me There. Create Scotty (Mosaic), Scotty (Simple), Kraus Campo, Wean Hall, Binary Heart, Tilted Square or Basic Black QR codes with generate_qr. Preserve the included white quiet zone. Download SVG for print or PNG for everyday use. Text is encoded exactly without fetching the destination. Scotty artwork and CMU marks are for authorized CMU use.",
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
          text: `Use ${base}/qr.svg or /qr.png with text, style=plain|scotty|mosaic|kraus-campo|wean|binary-heart|tilted-square and size (default 512, max 2048). Art styles use H correction, Plain uses M. Artistic styles require larger exports; use 1024 for detailed artwork. The four-module margin is built in. Keep the code square and test printed exports at their final size. Payload limit: 1024 UTF-8 bytes. Maintained by the Office of the Vice Provost for Teaching and Learning Innovation.`,
        },
      ],
    }),
  );
  server.registerTool(
    "generate_qr",
    {
      description:
        "Create a QR image in Scotty (Mosaic), Scotty (Simple), Kraus Campo, Wean Hall, Binary Heart, Tilted Square or Basic Black style. Returns a PNG, embeddable image addresses and HTML. No destination fetch, storage or tracking.",
      inputSchema: {
        text: z.string().min(1).max(1024),
        style: z.enum(STYLES).default("scotty"),
        size: z.number().int().min(96).max(2048).default(512),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ text, style, size }) => {
      try {
        const image = await qrImage(text, style, size, "png"),
          query = new URLSearchParams({ text, style, size: String(size) });
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
                  html: `<img src="${xml(svg)}" alt="QR code for ${xml(text)}" width="${size}" height="${size}" />`,
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
