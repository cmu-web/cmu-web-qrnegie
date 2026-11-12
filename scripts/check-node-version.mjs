// Fails when @types/node's major version differs from the Dockerfile's Node
import { readFileSync } from "node:fs";

const dockerfile = readFileSync("Dockerfile", "utf8");
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

const node = dockerfile.match(/node:(\d+)/)?.[1];
const types = pkg.devDependencies["@types/node"]?.match(/\d+/)?.[0];

if (!node || !types || node !== types) {
  console.error(`Dockerfile uses Node ${node ?? "?"}, but @types/node is ${types ?? "?"}`);
  process.exit(1);
}
