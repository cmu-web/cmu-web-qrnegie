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
};
export const STYLE_GROUPS: Record<string, readonly QrStyle[]> = {
  "Scotty Portraits": ["mosaic", "scotty"],
  "Campus Landmarks": ["kraus-campo", "wean"],
  "Carnegie Mellon Marks": ["binary-heart", "block-monogram", "tilted-square"],
  "Simple and Classic": ["plain", "icon"],
};
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
  icon: {
    description:
      "A black QR code with a red center icon. Choose an icon in the Builder to match the content.",
    example: "https://www.cmu.edu/",
  },
};
