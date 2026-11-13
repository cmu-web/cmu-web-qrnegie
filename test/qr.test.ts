import { describe, expect, it } from "vitest";
import sharp from "sharp";
import jsQR from "jsqr";
import request from "supertest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { qrImage } from "../src/qr";
import { createApp } from "../src/app";
import { createMcp } from "../src/mcp";
import { STYLES } from "../src/styles";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("QRnegie", () => {
  for (const style of STYLES)
    for (const text of [
      "Hi",
      "https://www.cmu.edu/",
      "こんにちは CMU 🐕",
      "https://cmu.lol/path?utm_source=qr&course=15-112",
      "https://example.com/" + "long-path-".repeat(45),
    ]) {
      it(`decodes the exported ${style} image for ${text.slice(0, 30)}`, async () => {
        const { data, info } = await sharp(await qrImage(text, style, 1024, "png"))
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        expect(decoded?.data).toBe(text);
        const {
          topLeftCorner: tl,
          topRightCorner: tr,
          bottomLeftCorner: bl,
          bottomRightCorner: br,
        } = decoded!.location;
        // Locate the quiet zone from the independently decoded symbol, even
        // when the image has a decorative band outside that margin or the
        // code is turned: from the middle of each edge, two modules straight
        // out from the code, a module measured along that edge.
        const modules = 17 + 4 * decoded!.version,
          middle = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };
        const outside = (a: typeof tl, b: typeof tl) => {
          const length = Math.hypot(b.x - a.x, b.y - a.y),
            mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          // The edge's normal, pointing away from the code's middle
          let nx = -(b.y - a.y) / length,
            ny = (b.x - a.x) / length;
          if (nx * (mid.x - middle.x) + ny * (mid.y - middle.y) < 0) [nx, ny] = [-nx, -ny];
          const step = (2 * length) / modules;
          return [mid.x + nx * step, mid.y + ny * step];
        };
        for (const [x, y] of [outside(tl, bl), outside(tr, br), outside(tl, tr), outside(bl, br)]) {
          const pixel = (Math.floor(y) * info.width + Math.floor(x)) * 4;
          const [r, g, b] = data.subarray(pixel, pixel + 3);
          // Block Monogram's code is inverted: its margin is the dark red of
          // its block. Everywhere else it's light, not necessarily white:
          // Kraus Campo's margin has faint tiles.
          if (style === "block-monogram")
            expect(0.299 * r + 0.587 * g + 0.114 * b).toBeLessThan(120);
          else for (const channel of [r, g, b]) expect(channel).toBeGreaterThanOrEqual(230);
        }
      });
    }
  it("encodes the QRnegie home address in the split hero artwork", async () => {
    const svg = readFileSync(join(__dirname, "..", "docs", "images", "hero.svg"));
    const { data, info } = await sharp(svg)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
      "https://qrnegie.andrew.cmu.edu/",
    );
  });
  it("keeps compact mosaic exports readable", async () => {
    const { data, info } = await sharp(
      await qrImage("https://qrnegie.andrew.cmu.edu/", "mosaic", 512, "png"),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
      "https://qrnegie.andrew.cmu.edu/",
    );
  });
  for (const style of STYLES)
    it(`decodes the ${style} image with text above and below`, async () => {
      const text = "WIFI:T:nopass;S:CMU-GUEST;;",
        labels = { above: "Join CMU-GUEST", below: "Access Code: 7F3K-92QA" };
      for (const size of [512, 2048]) {
        const { data, info } = await sharp(await qrImage(text, style, size, "png", labels))
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        expect(info.width).toBe(size);
        // Kraus Campo's lines go in its band; the others make the image taller
        if (style === "kraus-campo") expect(info.height).toBe(size);
        else expect(info.height).toBeGreaterThan(size);
        expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(text);
      }
    });
  it("draws no text above or below for blank lines and rejects ones it can't letter", async () => {
    const plain = await qrImage("https://www.cmu.edu/", "plain", 512, "svg");
    expect(
      await qrImage("https://www.cmu.edu/", "plain", 512, "svg", { above: " ", below: "" }),
    ).toEqual(plain);
    await expect(
      qrImage("https://www.cmu.edu/", "plain", 512, "svg", { below: "x".repeat(41) }),
    ).rejects.toThrow("40 characters");
    await expect(
      qrImage("https://www.cmu.edu/", "plain", 512, "svg", { above: "Snow \u2603" }),
    ).rejects.toThrow("common punctuation");
  });
  it("rejects excessive payloads and undersized exports", async () => {
    await expect(qrImage("x".repeat(1025), "scotty", 512, "png")).rejects.toThrow("1024");
    await expect(qrImage("https://www.cmu.edu/", "scotty", 20, "png")).rejects.toThrow(
      "Choose a width",
    );
  });
  it("serves the builder, images and stateless MCP", async () => {
    const app = createApp();
    const labelled = await request(app)
      .get("/qr.svg")
      .query({ text: "https://www.cmu.edu/", style: "plain", width: "768", below: "Hello" });
    expect(labelled.status).toBe(200);
    expect(String(labelled.body)).toMatch(/^<svg[^>]*width="768"/);
    const labelledHeight = /height="(\d+)"/.exec(String(labelled.body));
    expect(Number(labelledHeight?.[1])).toBeGreaterThan(768);
    await request(app)
      .get("/qr.svg")
      .query({ text: "https://www.cmu.edu/", size: "768" })
      .expect(400);
    await request(app)
      .get("/qr.svg")
      .query({ text: "https://www.cmu.edu/", width: ["512", "768"] })
      .expect(400);
    expect(
      (
        await request(app)
          .get("/qr.svg")
          .query({ text: "https://www.cmu.edu/", below: ["a", "b"] })
      ).status,
    ).toBe(400);
    await request(app)
      .get("/")
      .expect(200)
      .expect(/Scotty, Beam Me There/);
    await request(app)
      .get("/qr.svg")
      .query({ text: "https://www.cmu.edu/" })
      .expect(200)
      .expect("Content-Type", /svg/);
    await request(app)
      .get("/qr.png")
      .query({ text: "https://www.cmu.edu/" })
      .expect(200)
      .expect("Content-Type", /png/);
    for (const page of ["/builder.html", "/styles.html", "/reference.html", "/about.html"])
      await request(app).get(page).expect(200);
    for (const style of STYLES)
      await request(app)
        .get("/qr.svg")
        .query({ text: "https://www.cmu.edu/", style, width: "1024" })
        .expect(200);
    await request(app).get("/qr.svg").query({ text: "hi", style: "bad" }).expect(400);
    await request(app).get("/mcp").expect(405);
    await request(app)
      .post("/mcp")
      .set("Accept", "application/json, text/event-stream")
      .send({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      })
      .expect(200);
  });
  it("exposes working QR generation through MCP", async () => {
    const server = createMcp(),
      client = new Client({ name: "test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    await client.connect(b);
    try {
      const tools = (await client.listTools()).tools;
      const schema = tools.find((tool) => tool.name === "generate_qr")?.inputSchema;
      expect(schema?.properties).toHaveProperty("width");
      expect(schema?.properties).not.toHaveProperty("size");
      expect(tools.map((t) => t.name)).toEqual(["get_guide", "generate_qr"]);
      const result = await client.callTool({
        name: "generate_qr",
        arguments: { text: "https://www.cmu.edu/", style: "plain", width: 768, below: "Visit CMU" },
      });
      expect(result.isError).not.toBe(true);
      const content = result.content as { type: string; data?: string; text?: string }[];
      const png = content.find((item) => item.type === "image")?.data;
      const metadata = await sharp(Buffer.from(png!, "base64")).metadata();
      expect(metadata.width).toBe(768);
      expect(metadata.height).toBeGreaterThan(768);
      const output = JSON.parse(content.find((item) => item.type === "text")!.text!);
      expect(new URL(output.svg).searchParams.get("width")).toBe("768");
      expect(new URL(output.svg).searchParams.has("size")).toBe(false);
      expect(output.html).toContain('width="768"');
      expect(result.content).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "image", mimeType: "image/png" })]),
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
