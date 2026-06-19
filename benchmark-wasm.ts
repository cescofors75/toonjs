import { performance } from 'perf_hooks';
import { ToonFactory } from './factory';
import { initToonWasm, ToonWasm } from './wasm/loader';

function genToon(rows: number): string {
  let s = `big[${rows}]{id,price,qty}:\n`;
  const parts: string[] = [s];
  for (let i = 0; i < rows; i++) {
    parts.push(`  ${i},${(Math.random() * 1000).toFixed(2)},${Math.floor(Math.random() * 100)}\n`);
  }
  return parts.join('');
}

async function main() {
  await initToonWasm();
  const ROWS = 200_000;
  console.log(`Dataset: ${ROWS.toLocaleString()} filas\n`);
  const text = genToon(ROWS);
  console.log(`Tamaño TOON: ${(text.length / 1024 / 1024).toFixed(2)} MB\n`);

  const bench = (label: string, fn: () => void) => {
    fn(); // warmup
    const t0 = performance.now();
    fn();
    const t1 = performance.now();
    console.log(`${label.padEnd(34)} ${(t1 - t0).toFixed(1)} ms`);
    return t1 - t0;
  };

  console.log('--- Parse ---');
  const jsParse = bench('JS   parse', () => { ToonFactory.from(text); });
  const wParse = bench('WASM parse', () => { ToonWasm.from(text).free(); });
  console.log(`-> WASM parse ${(jsParse / wParse).toFixed(2)}x\n`);

  console.log('--- Pipeline: filterRange + stats ---');
  const jsT = ToonFactory.from(text);
  const jsPipe = bench('JS   filterRange+stats', () => {
    jsT.filterRange('price', 200, 800).stats('qty');
  });
  const wT = ToonWasm.from(text);
  const wPipe = bench('WASM filterRange+stats', () => {
    const f = wT.filterRange('price', 200, 800);
    f.stats('qty');
    f.free();
  });
  console.log(`-> WASM pipeline ${(jsPipe / wPipe).toFixed(2)}x\n`);

  // --- Heavy compute: matriz de correlación de un dataset ancho ---
  console.log('--- correlationMatrix (cómputo pesado, todo en WASM) ---');
  const COLS = 30;
  const RR = 20_000;
  const fieldsList = Array.from({ length: COLS }, (_, i) => `c${i}`);
  let wide = `w[${RR}]{${fieldsList.join(',')}}:\n`;
  const wparts: string[] = [wide];
  for (let i = 0; i < RR; i++) {
    const row: number[] = [];
    for (let j = 0; j < COLS; j++) row.push(Math.round(Math.random() * 1000) / 10);
    wparts.push('  ' + row.join(',') + '\n');
  }
  wide = wparts.join('');

  const jsW = ToonFactory.from(wide);
  const jsCorr = bench('JS   correlationMatrix', () => { jsW.correlationMatrix(fieldsList); });
  const wW = ToonWasm.from(wide);
  const wCorr = bench('WASM correlationMatrix', () => { wW.correlationMatrix(); });
  console.log(`-> WASM correlationMatrix ${(jsCorr / wCorr).toFixed(2)}x\n`);

  // --- Kernel elementwise (SIMD f64x2) ---
  console.log('--- multiplyScalar (kernel elementwise, SIMD f64x2) ---');
  const jsMul = bench('JS   multiplyScalar', () => { jsW.multiplyScalar(2.0, fieldsList); });
  const wMul = bench('WASM multiplyScalar (SIMD)', () => { wW.multiplyScalar(2.0).free(); });
  console.log(`-> WASM multiplyScalar ${(jsMul / wMul).toFixed(2)}x\n`);

  wT.free();
  wW.free();
}

main();
