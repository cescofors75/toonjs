# 📊 Logging Benchmarks - ToonJS

Comparación de rendimiento entre `console.log` estándar y `Pino.js` logger.

## 🧪 Resultados de Benchmarks

### Modo Desarrollo (con pino-pretty)

```
📈 RESULTADOS - 5 iteraciones cada uno

┌─────────────────────────┬──────────────┬──────────────┐
│ Métrica                 │ Console.log  │  Pino.js     │
├─────────────────────────┼──────────────┼──────────────┤
│ Promedio                │    187.60 ms │    256.15 ms │
│ Mediana                 │    188.64 ms │    243.86 ms │
│ Desviación estándar     │      6.61 ms │     25.57 ms │
└─────────────────────────┴──────────────┴──────────────┘

Resultado: Console.log 1.37x más rápido (Pino +36% overhead por pretty-printing)
```

### Modo Producción (JSON puro)

```
📈 RESULTADOS - 5 iteraciones cada uno

┌─────────────────────────┬──────────────┬──────────────┐
│ Métrica                 │ Console.log  │  Pino.js     │
├─────────────────────────┼──────────────┼──────────────┤
│ Promedio                │    193.68 ms │    222.04 ms │
│ Mediana                 │    189.04 ms │    222.84 ms │
│ Desviación estándar     │     10.28 ms │      4.56 ms │
└─────────────────────────┴──────────────┴──────────────┘

Resultado: Console.log 1.15x más rápido (Pino +14.6% overhead)
```

## 🔍 Análisis

### Por qué console.log es más rápido en este caso

Este benchmark es un **caso extremo** que hace **200+ logs por ejecución**:
- Múltiples tablas formateadas
- Estadísticas detalladas
- Reportes de rendimiento
- Resúmenes ejecutivos

En este escenario de **alto volumen de logs**, console.log es más rápido porque:
1. Es síncrono - escribe directamente a stdout
2. No tiene overhead de serialización JSON
3. No usa buffers ni procesamiento asíncrono

### Cuándo usar Pino.js (ventajas que justifican el trade-off)

#### ✅ Ventajas críticas de Pino.js:

1. **No bloquea el event loop**
   - Console.log es síncrono y puede bloquear I/O
   - Pino.js usa buffers asíncronos
   - Crítico en aplicaciones de alto tráfico

2. **Logging estructurado (JSON)**
   - Parseable automáticamente
   - Compatible con herramientas profesionales: ELK, Datadog, Splunk, Grafana
   - Fácil búsqueda y análisis

3. **Niveles de log configurables**
   - `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`
   - Control granular de qué se registra

4. **Producción-ready**
   - Timestamps automáticos
   - Contexto adicional (hostname, PID, etc.)
   - Serialización segura de objetos circulares
   - Rotación de logs integrable

5. **Mejor en aplicaciones reales**
   - Este benchmark es extremo (200+ logs)
   - Aplicaciones típicas: 10-50 logs por request
   - En ese rango, el overhead es negligible (<5ms)

## 📊 Ejecutar los Benchmarks

```bash
# Modo desarrollo (con colores y formateo)
npm run benchmark:logging

# Modo producción (JSON puro)
npm run benchmark:logging:prod

# Ver ambas versiones del análisis
npm run analyze          # Con Pino.js
npm run analyze:console  # Con console.log
```

## 🎯 Recomendaciones

### Usa Console.log cuando:
- Scripts simples de una sola ejecución
- Debugging rápido local
- Prototipos y pruebas
- No necesitas parsear los logs

### Usa Pino.js cuando:
- Aplicaciones en producción
- APIs y servicios web
- Necesitas análisis de logs
- Alto tráfico / concurrencia
- Integración con herramientas de monitoreo
- Logs estructurados para búsqueda

## 💡 Conclusión

El **overhead de Pino.js (~14-36%)** es un **trade-off válido** por:
- No bloquear el event loop
- Logging estructurado y parseable
- Integración con herramientas profesionales
- Mejor comportamiento en aplicaciones reales

En aplicaciones típicas (no 200+ logs por request), el impacto es **< 5-10ms** y las ventajas superan ampliamente el costo.
