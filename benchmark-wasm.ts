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
  wT.free();
  console.log(`-> WASM pipeline ${(jsPipe / wPipe).toFixed(2)}x\n`);
}

main();
