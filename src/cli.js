#!/usr/bin/env node

import fs from "node:fs";
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
import { Runtime } from "./runtime.js";

const args = process.argv.slice(2);

if (args[0] === "--versi") {
  console.log("XenaXFawn 0.1.0");
  process.exit();
}

if (args[0] === "bantu" || !args.length) {
  console.log(`
XenaXFawn

xena --versi
xena bantu
xena jalankan file.xena
`);
  process.exit();
}

if (args[0] === "jalankan") {
  const file = args[1];

  if (!file) throw new Error("Masukkan file .xena");

  const source = fs.readFileSync(file, "utf8");
  const tokens = lex(source);
  const ast = parse(tokens);

  new Runtime().execute(ast.body);
  process.exit();
}

console.error(`Perintah tidak dikenal: ${args[0]}`);
process.exit(1);
