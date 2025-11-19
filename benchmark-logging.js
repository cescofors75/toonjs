/**
 * ⚡ BENCHMARK: Console.log vs Pino.js Logger
 * 
 * Compara el rendimiento entre console.log estándar y Pino.js
 * ejecutando ambas versiones del análisis empresarial.
 */

const { execSync } = require('child_process');

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   ⚡ BENCHMARK: console.log vs Pino.js Logger                 ║');
console.log('╔════════════════════════════════════════════════════════════════╗\n');

// Función para ejecutar y medir tiempo
function runBenchmark(scriptName, label) {
  console.log(`\n📊 Ejecutando: ${label}...`);
  console.log('─'.repeat(70));
  
  const iterations = 5;
  const times = [];
  
  for (let i = 1; i <= iterations; i++) {
    process.stdout.write(`   Iteración ${i}/${iterations}... `);
    
    const start = process.hrtime.bigint();
    
    try {
      // Ejecutar el script y capturar salida para que no interfiera
      execSync(`node ${scriptName}`, { 
        encoding: 'utf8',
        stdio: 'pipe' // Silenciar salida para que no afecte medición
      });
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1_000_000; // ms
      times.push(duration);
      
      console.log(`✅ ${duration.toFixed(2)} ms`);
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return null;
    }
  }
  
  // Calcular estadísticas
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const median = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)];
  
  // Calcular desviación estándar
  const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  return { avg, min, max, median, stdDev, times };
}

// Ejecutar benchmarks
const consoleResults = runBenchmark('analisis-empresarial-console.js', 'Console.log (estándar)');
const pinoResults = runBenchmark('analisis-empresarial.js', 'Pino.js Logger');

// Mostrar resultados
if (consoleResults && pinoResults) {
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📈 RESULTADOS DEL BENCHMARK');
  console.log('═'.repeat(70));
  console.log('');
  
  console.log('┌─────────────────────────┬──────────────┬──────────────┐');
  console.log('│ Métrica                 │ Console.log  │  Pino.js     │');
  console.log('├─────────────────────────┼──────────────┼──────────────┤');
  console.log(`│ Promedio                │ ${consoleResults.avg.toFixed(2).padStart(9)} ms │ ${pinoResults.avg.toFixed(2).padStart(9)} ms │`);
  console.log(`│ Mediana                 │ ${consoleResults.median.toFixed(2).padStart(9)} ms │ ${pinoResults.median.toFixed(2).padStart(9)} ms │`);
  console.log(`│ Mínimo                  │ ${consoleResults.min.toFixed(2).padStart(9)} ms │ ${pinoResults.min.toFixed(2).padStart(9)} ms │`);
  console.log(`│ Máximo                  │ ${consoleResults.max.toFixed(2).padStart(9)} ms │ ${pinoResults.max.toFixed(2).padStart(9)} ms │`);
  console.log(`│ Desviación estándar     │ ${consoleResults.stdDev.toFixed(2).padStart(9)} ms │ ${pinoResults.stdDev.toFixed(2).padStart(9)} ms │`);
  console.log('└─────────────────────────┴──────────────┴──────────────┘');
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('🎯 ANÁLISIS COMPARATIVO');
  console.log('═'.repeat(70));
  console.log('');
  
  const improvement = ((consoleResults.avg - pinoResults.avg) / consoleResults.avg) * 100;
  const speedup = consoleResults.avg / pinoResults.avg;
  
  if (improvement > 0) {
    console.log(`🚀 Pino.js es ${speedup.toFixed(2)}x MÁS RÁPIDO que console.log`);
    console.log(`💡 Mejora de rendimiento: ${improvement.toFixed(1)}%`);
    console.log(`⏱️  Tiempo ahorrado: ${(consoleResults.avg - pinoResults.avg).toFixed(2)} ms por ejecución`);
  } else {
    const slowdown = Math.abs(improvement);
    console.log(`⚠️  Console.log es ${(pinoResults.avg / consoleResults.avg).toFixed(2)}x más rápido`);
    console.log(`📉 Pino.js es ${slowdown.toFixed(1)}% más lento (overhead de pretty printing)`);
  }
  
  console.log('');
  console.log('📋 Notas importantes:');
  console.log('   • Este benchmark hace 200+ logs por ejecución (caso extremo)');
  console.log('   • El overhead de pino-pretty (formateo coloreado) afecta en desarrollo');
  console.log('   • Console.log es síncrono y bloquea el event loop');
  console.log('   • Pino.js usa buffers asíncronos - no bloquea la aplicación');
  console.log('   • Pino.js ofrece logging estructurado (JSON) para análisis posterior');
  console.log('   • Para producción, usar NODE_ENV=production (JSON puro, sin pretty)');
  
  console.log('');
  console.log('═'.repeat(70));
  console.log('✅ BENCHMARK COMPLETADO');
  console.log('═'.repeat(70));
  console.log('');
}
