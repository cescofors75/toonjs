#!/usr/bin/env node
/**
 * Embebe el binario .wasm compilado en un módulo TS como base64, para que el
 * core se cargue de forma universal (Node y navegador) sin fetch ni fs.
 */
const fs = require('fs');
const path = require('path');

const wasmPath = path.join(
  __dirname,
  '..',
  'core',
  'target',
  'wasm32-unknown-unknown',
  'release',
  'toon_core.wasm'
);
const outPath = path.join(__dirname, '..', 'wasm', 'toon-core.wasm.ts');

if (!fs.existsSync(wasmPath)) {
  console.error(`No se encontró el .wasm en ${wasmPath}. Ejecuta "npm run build:wasm:rust" primero.`);
  process.exit(1);
}

const bytes = fs.readFileSync(wasmPath);
const b64 = bytes.toString('base64');

const content = `/* eslint-disable */
// AUTO-GENERADO por scripts/embed-wasm.cjs — no editar a mano.
// Binario WASM del core columnar (Rust) embebido en base64.
export const TOON_CORE_WASM_BASE64 = '${b64}';
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, content);
console.log(`Embebido ${bytes.length} bytes -> ${path.relative(process.cwd(), outPath)}`);
