const { Toon } = require('./dist/toon.js');
const { performance } = require('perf_hooks');

// Setup
const ROWS = 100000; // 100k filas
const COLS = 20;
console.log(`Generando datos (${ROWS} filas x ${COLS} cols)...`);

// Generar datos crudos
const rawData = [];
const schema = {};
for(let j=0; j<COLS; j++) schema[`col_${j}`] = 'number';

for(let i=0; i<ROWS; i++) {
  const row = {};
  for(let j=0; j<COLS; j++) {
    row[`col_${j}`] = Math.random() * 100;
  }
  rawData.push(row);
}

console.log('Creando instancia Toon (Arquitectura Columnar)...');
const startInit = performance.now();
const toon = new Toon({
  name: 'benchmark',
  schema: schema,
  rows: rawData
});
const endInit = performance.now();
console.log(`Tiempo de inicialización: ${(endInit - startInit).toFixed(2)} ms`);

// --- BENCHMARK: MultiplyScalar ---
console.log('\n--- Benchmark: MultiplyScalar (x2) ---');
const startMul = performance.now();
toon.multiplyScalar(2);
const endMul = performance.now();
const timeMul = endMul - startMul;
console.log(`Tiempo: ${timeMul.toFixed(2)} ms`);

// --- BENCHMARK: Transpose ---
console.log('\n--- Benchmark: Transpose ---');
const startTrans = performance.now();
toon.transpose();
const endTrans = performance.now();
const timeTrans = endTrans - startTrans;
console.log(`Tiempo: ${timeTrans.toFixed(2)} ms`);

// --- BENCHMARK: Row Access (Regression Test) ---
// Como ahora las filas se reconstruyen on-demand, esto podría ser más lento.
console.log('\n--- Benchmark: Row Access (map) ---');
const startMap = performance.now();
toon.map(row => row['col_0']); // Acceso simple
const endMap = performance.now();
const timeMap = endMap - startMap;
console.log(`Tiempo: ${timeMap.toFixed(2)} ms`);

// --- Comparativa Histórica (Basada en tests anteriores) ---
console.log('\n=== COMPARATIVA DE VELOCIDAD ===');
console.log('Operación       | Antes (Objetos) | Ahora (Float64) | Mejora');
console.log('----------------|-----------------|-----------------|-------');
const oldMul = 197.80; // Dato del benchmark anterior
const oldTrans = 1097.83; // Dato del benchmark anterior

console.log(`multiplyScalar  | ${oldMul.toFixed(2)} ms       | ${timeMul.toFixed(2)} ms       | ${(oldMul/timeMul).toFixed(2)}x 🚀`);
console.log(`transpose       | ${oldTrans.toFixed(2)} ms      | ${timeTrans.toFixed(2)} ms       | ${(oldTrans/timeTrans).toFixed(2)}x ⚡`);
