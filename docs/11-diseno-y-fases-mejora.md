# Diseno y plan por fases para evolucionar Crea Torneos

Fecha: 2026-06-25

Este documento toma las conclusiones de `10-comparativa-azotea-y-competencia.md` y las convierte en un diseno concreto y un plan de trabajo por fases. Continua y no reemplaza el plan de entregas que ya existe en `09-diseno-implementacion-torneos.md` (Entregas 1 a 6); aqui se cierran esas entregas y se agregan las fases nuevas que traen herramientas de Azotea y de la competencia.

Regla de oro de todo este plan: **cada funcion nueva debe poder ignorarse**. Si el organizador no la toca, el flujo simple sigue funcionando igual. Nada de lo que portemos de Azotea puede agregar un paso obligatorio a la creacion del torneo.

## 1. Principios de diseno (reafirmados)

1. La base de datos es la fuente de verdad. El navegador solo recuerda el ultimo torneo y borradores.
2. La pantalla publica y la del organizador son la misma; la diferencia es el PIN/token.
3. Lectura publica jamas modifica.
4. Toda accion sensible queda auditada.
5. Defaults inteligentes: el organizador puede crear un torneo tocando lo minimo.
6. Lo avanzado se esconde detras de "Personalizar" o "Opciones avanzadas", nunca en el camino principal.
7. Texto grande, botones grandes, confirmaciones claras en acciones irreversibles.

## 2. Decisiones de alcance

### Se trae de Azotea

- Desempate progresivo (acumulativo) y, opcional, median Buchholz.
- Puntajes configurables, ocultos tras "Opciones avanzadas".
- Bases del torneo en version simple: ritmo de juego, premios y nota libre. (No portar categorias de premio, cuota, pagos ni adjuntos en el MVP.)
- Auditoria de pareos: guardar entrada/salida/advertencias de cada generacion de ronda.
- Retiro por ronda (`withdrawnAfterRound`) para que el motor sepa desde cuando no emparejar.
- Historial de torneos con podios (clasificacion publica).

### Se toma de la competencia

- Tabla y resultados con auto-refresco (sensacion de "en vivo").
- Reporte de resultado mas a prueba de errores (botones grandes 1-0 / tablas / 0-1, deshacer).
- Lectura movil pulida.

### Se deja fuera (a proposito)

- Pareo FIDE Dutch certificado (ver seccion 4: decision de motor).
- Visibilidad multi-estado y slugs.
- Torneos por token sin base.
- Inscripciones, pagos, cuentas de usuario, ratings oficiales.
- Recap/galeria, integraciones externas.

## 3. Backlog priorizado por herramienta

Orden por valor para el organizador / costo. Las primeras cuatro filas son cierre de lo que ya estaba en marcha (doc 09); el resto es nuevo.

| # | Herramienta | Origen | Valor | Costo | Estado |
| --- | --- | --- | --- | --- | --- |
| 1 | Cierre de torneo + snapshot final + podio | doc 09 (Entrega 5) | Alto | Medio | Hecho (2026-06-25) |
| 2 | Endurecer produccion (cookie secure, rate limit PIN, doble-submit) | doc 09 (Entrega 6) | Alto | Medio | Hecho (2026-06-25) |
| 3 | Snapshot al completar cada ronda | doc 09 | Medio | Bajo | Pendiente (necesita `kind` en snapshot) |
| 4 | Pruebas E2E con DB real | doc 09 | Alto | Medio | Pendiente |
| 5 | Auditoria de pareos (input/output/warnings) | Azotea | Medio | Bajo | Hecho (2026-06-25) |
| 6 | Desempate progresivo + median Buchholz | Azotea | Medio | Bajo | Hecho (2026-06-25) |
| 7 | Tabla/resultados con auto-refresco | Competencia | Alto | Bajo | Nuevo |
| 8 | Historial de torneos con podios | Azotea | Medio | Medio | Nuevo |
| 9 | Bases simples (ritmo, premios, nota) | Azotea | Medio | Bajo | Nuevo |
| 10 | Puntajes configurables (avanzado oculto) | Azotea | Bajo | Medio | Nuevo |
| 11 | Retiro por ronda exacto | Azotea | Bajo | Bajo | Nuevo |
| 12 | Fotos de jugador | Azotea | Bajo | Alto | Evaluar |
| 13 | Exportacion (PDF/CSV) de tabla y pareos | Competencia | Medio | Medio | Nuevo |

## 4. Decision de madurez del motor de pareo

Hoy el motor es un suizo voraz simple (ver doc 10, seccion 3). Hay tres caminos:

- **A. Mantener el voraz y hacerlo explicable.** Agregar advertencias claras y la auditoria de pareos. Barato, suficiente para torneos amistosos. Riesgo: en torneos de 16+ jugadores y muchas rondas puede dar pareos subjetivamente "raros".
- **B. Mejorar el voraz hacia un suizo por grupos de puntaje** con manejo basico de flotantes y mejor regla de color, sin llegar a FIDE Dutch. Costo medio, gran salto de calidad percibida.
- **C. Integrar un motor FIDE real** (bbpPairings via WASM/CLI, o portar JaVaFo). Correccion total, costo alto, complejidad de despliegue, y mas de lo que el publico necesita.

**Recomendacion: A ahora, B como fase mas adelante, C solo si aparece demanda real de torneos rateados.** La auditoria de pareos (item 5) es prerrequisito de B y C porque permite comparar algoritmos contra los mismos datos.

## 5. Deltas de modelo de datos

Cambios sobre el schema actual de Crea Torneos. Todos aditivos y con default, para no romper datos existentes.

### Tournament
- `scoring` (Json) con `win/draw/loss/bye/forfeitWin/forfeitLoss`, default `1/0.5/0/1/1/0`. Solo se edita en avanzado.
- `timeControl` (String?), `prizesJson` (Json?), `notes` (String?) para bases simples.
- (Ya existen `tiebreaks`, `closedAt` se agrega en Entrega 5, `status`.)

### Player
- `withdrawnAfterRound` (Int?).
- `photoId` o `photoUrl` (String?) solo si se aprueba el item 12.

### PairingAttempt (tabla nueva)
- `tournamentId`, `roundNumber`, `algorithm`, `inputJson`, `outputJson`, `warningsJson`, `createdAt`.

### Tiebreaks
- Ampliar el set de codigos con `progressive` y `median_buchholz` (ya implementados en Azotea, portar calculo y label).

### Historial
- No requiere tabla nueva: la clasificacion se arma leyendo torneos cerrados y sus snapshots finales.

## 6. Plan por fases

Cada fase tiene criterio de salida verificable. Las fases 1-6 son las del doc 09 (se mantienen); las fases 7+ son nuevas. Se listan resumidas para dar continuidad.

### Fases 1-6 (continuidad, ver doc 09)
- Fase 1: creacion limpia (nombre opcional, desempates). **Hecho.**
- Fase 2: standings reales con desempates. **Hecho.**
- Fase 3: gestion de jugadores. **Hecho.**
- Fase 4: compartir y vista publica. **Hecho.**
- Fase 5: cierre + snapshot final + podio. **Hecho (2026-06-25).**
- Fase 6: robustez de produccion + E2E. **Parcial (2026-06-25): cookie secure, rate limit PIN y guarda doble-submit hechos; faltan snapshot por ronda y E2E.**

### Fase 7: pareo explicable y auditado **(Hecho 2026-06-25)**
- Guardar `PairingAttempt` en cada generacion de ronda (entrada, salida, advertencias).
- Mostrar al organizador un panel corto: "Por que se hicieron asi los pareos" (BYE asignado, repeticiones permitidas, jugadores retirados omitidos).
- Portar desempates `progressive` y `median_buchholz` desde Azotea.
- Criterio de salida: cada ronda generada queda con su registro reproducible; el organizador puede leer en lenguaje simple por que se emparejo asi.

### Fase 8: sensacion de torneo en vivo
- Auto-refresco de la tabla y de la ronda actual en la pagina publica (revalidacion periodica o polling suave).
- Reporte de resultado a prueba de errores: botones grandes, deshacer ultimo resultado, confirmacion al corregir ronda completada.
- Criterio de salida: un espectador deja la pagina abierta y ve avanzar resultados sin recargar; el organizador registra resultados sin miedo a equivocarse.

### Fase 9: bases simples del torneo
- Campos opcionales: ritmo de juego, premios (lista corta libre), nota/observaciones.
- Se muestran en la pagina publica solo si tienen contenido.
- Criterio de salida: el organizador puede (si quiere) publicar premios y ritmo; si no llena nada, la pagina se ve igual que hoy.

### Fase 10: historial y clasificacion
- Pagina publica que lista torneos cerrados con su podio 1-2-3.
- Estadisticas simples agregadas (torneos jugados, partidas).
- Criterio de salida: desde la portada se llega al historial y se ven los podios de torneos terminados.

### Fase 11: opciones avanzadas y exportacion
- Puntajes configurables tras "Opciones avanzadas".
- Retiro por ronda exacto.
- Exportacion de tabla y pareos a PDF/CSV para imprimir o compartir.
- Criterio de salida: un usuario avanzado puede ajustar puntaje y exportar; el usuario simple nunca ve esa complejidad.

### Fase 12 (opcional, condicionada a demanda): motor por grupos de puntaje
- Pasar del voraz al suizo por grupos con flotantes basicos y mejor color (camino B de la seccion 4).
- Usar la auditoria de la Fase 7 para comparar pareos viejos vs nuevos sobre torneos reales.
- Criterio de salida: en torneos de 16+ jugadores los pareos mejoran sin introducir repeticiones ni BYE injustos, validado contra casos guardados.

## 7. Riesgos y mitigaciones

- **Complejidad creciente vs simplicidad**: mitigar con la regla de oro (todo lo nuevo es ignorable) y manteniendo el camino de creacion corto.
- **Pareos "raros" del motor voraz**: mitigar con auditoria + advertencias (Fase 7) antes de invertir en motor (Fase 12).
- **Perdida de datos**: ya cubierto por el principio de DB como fuente de verdad; reforzar con snapshots por ronda y E2E (Fases 5-6).
- **Fotos de jugador (item 12)**: alto costo (subida, almacenamiento, moderacion) para bajo valor; queda en "evaluar", probablemente fuera del MVP.

## 8. Definicion de listo (global)

El sistema cumple su objetivo cuando, ademas de los criterios del doc 09:

- Cada ronda generada tiene registro de pareo legible.
- La tabla se siente viva sin que el organizador haga nada.
- El organizador puede cerrar el torneo y queda un historial con podios.
- Las opciones avanzadas existen pero nunca estorban al flujo simple.
- Build, typecheck, pruebas unitarias, Prisma validate y E2E pasan.

## 9. Que sigue

Este documento es el cierre de la etapa de investigacion y diseno pedida. La implementacion deberia empezar por la Fase 5 (cierre + podio), que es la pieza que falta para tener un torneo completo de principio a fin, y solo despues abordar las herramientas portadas de Azotea en el orden del backlog.
</content>
