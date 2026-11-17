export const STYLES = [
  "plain",
  "scotty",
  "mosaic",
  "kraus-campo",
  "wean",
  "binary-heart",
  "tilted-square",
  "block-monogram",
  "icon",
  "mosaic-dragon",
  "dragon",
  "terminal",
  "punch-card",
  "engineering-paper",
  "minefield",
  "scantron",
] as const;
export type QrStyle = (typeof STYLES)[number];
export const STYLE_NAMES: Record<QrStyle, string> = {
  plain: "Basic Black",
  scotty: "Basic Scotty",
  mosaic: "Mosaic Scotty",
  "kraus-campo": "Kraus Campo",
  wean: "Wean Hall",
  "binary-heart": "Binary Heart",
  "tilted-square": "Tilted Square",
  "block-monogram": "Block Monogram",
  icon: "Center Icon",
  "mosaic-dragon": "Mosaic Dragon",
  dragon: "Basic Dragon",
  terminal: "Terminal",
  "punch-card": "Punch Card",
  "engineering-paper": "Engineering Paper",
  minefield: "Minefield",
  scantron: "Scantron",
};
export const MIN_MODULE: Record<QrStyle, number> = {
  plain: 3,
  scotty: 3,
  mosaic: 6,
  "kraus-campo": 6,
  wean: 5,
  "binary-heart": 6,
  "tilted-square": 3,
  "block-monogram": 3,
  icon: 3,
  "mosaic-dragon": 6,
  dragon: 3,
  terminal: 4,
  "punch-card": 3,
  "engineering-paper": 4,
  minefield: 5,
  scantron: 5,
};
// Shared by the renderer, Builder, reference pages and MCP guidance
export const ERROR_CORRECTION: Record<QrStyle, "M" | "H"> = {
  plain: "M",
  scotty: "H",
  mosaic: "H",
  "kraus-campo": "H",
  wean: "H",
  "binary-heart": "H",
  "tilted-square": "M",
  "block-monogram": "M",
  icon: "H",
  "mosaic-dragon": "H",
  dragon: "H",
  terminal: "M",
  "punch-card": "H",
  "engineering-paper": "H",
  minefield: "H",
  scantron: "H",
};
// The listed styles, by group, in the Builder, Styles and Reference. Styles in
// a collection aren't listed here.
export const STYLE_GROUPS: Record<string, readonly QrStyle[]> = {
  "Scotty Portraits": ["mosaic", "scotty"],
  "Campus Landmarks": ["kraus-campo", "wean"],
  "Carnegie Mellon Marks": ["binary-heart", "block-monogram", "tilted-square"],
  "Simple and Classic": ["plain", "icon"],
};
// Unlisted collections: styles made for one group. They work in image URLs
// and generate_qr for anyone who knows the name, but the Builder, Styles and
// Reference show them only in a browser that opened a page with
// ?collection=<key>. Not a secret: the names are in this public repository.
// A collection has no display name, only its key, which the pages show.
// To add a style to a collection, add it to STYLES and to the collection's
// styles; npm run docs does the rest.
export const COLLECTIONS: Record<string, { styles: readonly QrStyle[] }> = {
  mjs: { styles: ["mosaic-dragon", "dragon", "terminal", "punch-card"] },
  merichar: { styles: ["engineering-paper", "minefield", "scantron"] },
};
// The styles listed for everyone, in STYLES order
export const LISTED_STYLES = STYLES.filter(
  (style) => !Object.values(COLLECTIONS).some((c) => c.styles.includes(style)),
);
export const STYLE_DETAILS: Record<QrStyle, { description: string; example: string }> = {
  mosaic: {
    description:
      "Scotty and his red scarf formed from the QR code's dots. Use a larger image to keep the portrait clear.",
    example: "https://www.cmu.edu/",
  },
  scotty: {
    description:
      "A Scotty portrait inside a QR code made of black squares, with room for the artwork in the center.",
    example: "https://www.cmu.edu/",
  },
  "kraus-campo": {
    description:
      "Numbered tiles inspired by the campus garden, with optional text incorporated into the orange frame.",
    example: "https://www.cmu.edu/public-art",
  },
  wean: {
    description:
      "Wean Hall's brutalist facade, turtle-head entrance and its former orange sculpture.",
    example: "Our Turtle Eating a Cheeto",
  },
  "binary-heart": {
    description:
      "Ones and zeros surrounding the red CMU heart. A detailed design for larger exports.",
    example: "https://www.cmu.edu/leadership/senior-admin/casalegno-bio",
  },
  "block-monogram": {
    description: "The historic Carnegie-Mellon block monogram, with the QR code replacing the M.",
    example: "https://www.cmu.edu/",
  },
  "tilted-square": {
    description:
      "A QR code turned inside a red square outline, echoing the university's tilted-square mark.",
    example: "https://www.cmu.edu/",
  },
  plain: {
    description: "Black squares on white, without added artwork. Good for small spaces.",
    example: "https://www.cmu.edu/",
  },
  "mosaic-dragon": {
    description:
      "The School of Computer Science dragon as a mosaic: red squares form the dragon, and a white center in a square carries the code's light dots.",
    example: "https://www.cs.cmu.edu/",
  },
  dragon: {
    description:
      "The School of Computer Science dragon inside a QR code made of black squares, with room for the artwork in the center.",
    example: "https://www.cs.cmu.edu/",
  },
  terminal: {
    description:
      "Check your baud rate, mind your escape sequences and leave the DIP switches alone. Text above and below prints as lines of output.",
    example: "https://www.cs.cmu.edu/~scsfacts/richards.html",
  },
  "punch-card": {
    description:
      "Eighty columns, one URL and a quiet disregard for Hollerith encoding. Do not fold, spindle or mutilate.",
    example: "https://www.cs.cmu.edu/~mjs/",
  },
  "engineering-paper": {
    description:
      "Cream engineering paper with squares colored in with a fat black marker, a stroke at a time, that happen to make a QR code.",
    example: "https://merichar.org/",
  },
  minefield: {
    description:
      "A tile board from the classic desktop game: the code's dark squares are mines on revealed tiles, with numbered tiles, a mine counter and the face button.",
    example: "https://merichar.org/",
  },
  scantron: {
    description:
      "A machine-scored quiz strip with green bracketed bubbles and timing marks down the edge: the code is made of answers, each dark square a bubble filled in.",
    example: "https://merichar.org/",
  },
  icon: {
    description:
      "A black QR code with a red center icon. Choose an icon in the Builder to match the content.",
    example: "https://www.cmu.edu/",
  },
};
