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
import { COLLECTIONS, LISTED_STYLES, STYLE_DETAILS, STYLE_GROUPS } from "../src/style-info";
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
          // its block. Terminal's margin is lit green phosphor, Punch Card's
          // cream card, Engineering Paper's pale green paper, Minefield's
          // revealed tiles, Scantron's sheet, Go Board's wood, Sea Battle's sea and Tic-Tac-Toe's paper: light but not
          // pale. Everywhere else it's light, not necessarily white: Kraus
          // Campo's margin has faint tiles.
          const light = 0.299 * r + 0.587 * g + 0.114 * b;
          if (style === "block-monogram") expect(light).toBeLessThan(120);
          else if (
            [
              "terminal",
              "punch-card",
              "engineering-paper",
              "minefield",
              "scantron",
              "go-board",
              "sea-battle",
              "tic-tac-toe",
            ].includes(style)
          )
            expect(light).toBeGreaterThan(150);
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
        // Kraus Campo's lines go in its band, and the framed styles' inside
        // their designs; the others make the image taller
        if (
          [
            "kraus-campo",
            "terminal",
            "punch-card",
            "engineering-paper",
            "minefield",
            "scantron",
            "go-board",
            "sea-battle",
            "tic-tac-toe",
          ].includes(style)
        )
          expect(info.height).toBe(size);
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
      .expect(/Scotty, beam me there/);
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

describe("unlisted collections", () => {
  const unlisted = Object.values(COLLECTIONS).flatMap(({ styles }) => styles);
  const decode = async (image: Buffer) => {
    const { data, info } = await sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data;
  };

  it("keeps every collection's styles out of the listed groups", () => {
    const grouped = Object.values(STYLE_GROUPS).flat();
    expect(unlisted.length).toBeGreaterThan(0);
    for (const style of unlisted) {
      expect(STYLES).toContain(style);
      expect(grouped).not.toContain(style);
      expect(LISTED_STYLES).not.toContain(style);
    }
    expect([...LISTED_STYLES].sort()).toEqual([...grouped].sort());
  });

  for (const style of unlisted)
    it(`decodes ${style} at its minimum width`, async () => {
      const text = STYLE_DETAILS[style].example;
      // The renderer's own error names the smallest width this code allows
      const tooSmall = await qrImage(text, style, 96, "png").then(
        () => "",
        (e: Error) => e.message,
      );
      const minimum = Number(/from (\d+) to/.exec(tooSmall)?.[1]);
      expect(minimum).toBeGreaterThan(96);
      expect(await decode(await qrImage(text, style, minimum, "png"))).toBe(text);
      await expect(qrImage(text, style, minimum - 1, "png")).rejects.toThrow(/Choose a width/);
    });

  for (const style of [
    "terminal",
    "punch-card",
    "engineering-paper",
    "minefield",
    "scantron",
    "go-board",
    "sea-battle",
    "tic-tac-toe",
  ] as const)
    it(`letters ${style}'s lines inside its design and keeps the image square`, async () => {
      const text = STYLE_DETAILS[style].example;
      const image = await qrImage(text, style, 1024, "png", {
        above: "cd www.cs.cmu.edu",
        below: "Welcome to SCS",
      });
      const { width, height } = await sharp(image).metadata();
      expect([width, height]).toEqual([1024, 1024]);
      expect(await decode(image)).toBe(text);
    });

  it("keeps the punch card the same size whatever the text's length", async () => {
    // The box around everything that isn't the white background
    const cardBox = async (image: Buffer) => {
      const { data, info } = await sharp(image)
        .greyscale()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let [left, top, right, bottom] = [info.width, info.height, -1, -1];
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++)
          if (data[y * info.width + x] < 250) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      return [left, top, right, bottom];
    };
    for (const lines of [{}, { above: "cd www.cs.cmu.edu", below: "Welcome to SCS" }]) {
      const boxes = new Set<string>();
      for (const length of [1, 10, 24, 27, 50, 100, 200, 500])
        boxes.add(
          String(
            await cardBox(await qrImage("a".repeat(length), "punch-card", 1024, "png", lines)),
          ),
        );
      expect([...boxes]).toHaveLength(1);
    }
  });

  it("renders unlisted styles by name in image URLs but lists only public ones", async () => {
    const app = createApp();
    const image = await request(app)
      .get("/qr.png")
      .query({ text: "https://www.cs.cmu.edu/", style: "mosaic-dragon", width: "1024" })
      .expect(200);
    expect(await decode(image.body)).toBe("https://www.cs.cmu.edu/");
    const error = await request(app)
      .get("/qr.png")
      .query({ text: "Hi", style: "no-such-style" })
      .expect(400);
    for (const style of unlisted) expect(error.text).not.toContain(style);
  });

  it("accepts unlisted styles in generate_qr without listing them", async () => {
    const server = createMcp(),
      client = new Client({ name: "test", version: "1" });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    await client.connect(b);
    try {
      const tools = JSON.stringify((await client.listTools()).tools);
      const guide = JSON.stringify(await client.callTool({ name: "get_guide", arguments: {} }));
      for (const style of unlisted) {
        expect(tools).not.toContain(style);
        expect(guide).not.toContain(style);
      }
      const result = await client.callTool({
        name: "generate_qr",
        arguments: { text: "https://www.cs.cmu.edu/", style: "dragon", width: 512 },
      });
      expect(result.isError).not.toBe(true);
      const png = (result.content as { type: string; data?: string }[]).find(
        (item) => item.type === "image",
      )?.data;
      expect(await decode(Buffer.from(png!, "base64"))).toBe("https://www.cs.cmu.edu/");
      const bad = await client.callTool({
        name: "generate_qr",
        arguments: { text: "Hi", style: "no-such-style" },
      });
      expect(bad.isError).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("puts each collection's styles in templates on the Builder, Styles and Reference", () => {
    for (const page of ["builder", "styles", "reference"]) {
      const html = readFileSync(join(__dirname, "..", "docs", `${page}.html`), "utf8");
      for (const [key, { styles }] of Object.entries(COLLECTIONS)) {
        const template = new RegExp(
          `<template data-collection="${key}"[^>]*>([\\s\\S]*?)</template\\s*>`,
        ).exec(html);
        expect(template, `${page} has a ${key} template`).not.toBeNull();
        const outside = html.replace(template![0], "");
        for (const style of styles) {
          expect(template![1]).toContain(style);
          expect(outside).not.toContain(`"${style}"`);
          expect(outside).not.toContain(`style-${style}"`);
        }
      }
      // The link script runs before the Google tag; the page script before qr.js
      expect(html.indexOf("js/collection-link.js")).toBeLessThan(html.indexOf("googletagmanager"));
      expect(html).toContain('<script src="js/collections.js"></script>');
    }
    const script = readFileSync(join(__dirname, "..", "docs", "js", "collections.js"), "utf8");
    // Keys only: a collection has no display name to give it away
    // As the generator writes it, through Prettier: a space after each comma
    expect(script).toContain(
      `const COLLECTIONS = [${Object.keys(COLLECTIONS)
        .map((key) => JSON.stringify(key))
        .join(", ")}];`,
    );
  });
});
