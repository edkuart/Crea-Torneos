# Comparativa: Crea Torneos, Azotea y la competencia

Fecha: 2026-06-25

Este documento es el resultado de revisar los dos proyectos propios (Crea Torneos y el modulo de ajedrez de Azotea Salcaja) y de investigar como funcionan los sistemas lideres del mercado (Swiss-Manager, Vega, SwissSys, ChessManager, ChessPairings.org, CircleChess, Tornelo, Lichess y Chess.com). Sirve como base para decidir que herramientas conviene llevar a Crea Torneos sin romper el principio de simplicidad para un organizador de avanzada edad.

No propone implementacion aqui. El diseno y el plan por fases viven en `11-diseno-y-fases-mejora.md`.

## 1. Punto de partida: que es cada proyecto

### Crea Torneos (este proyecto)

- Aplicacion Next.js 16 enfocada en una sola cosa: crear y administrar un torneo de ajedrez simple.
- Base de datos PostgreSQL via Prisma como fuente de verdad.
- Una sola pantalla publica por torneo (`/torneos/[publicCode]`); el organizador ve la misma pagina con acciones protegidas por PIN/token.
- Pensado para personas mayores: botones grandes, flujo corto, sin restaurante ni panel administrativo.
- Estado actual estimado: 55-60% de un MVP funcional (ver `08-investigacion-y-auditoria-torneos.md`).

### Azotea Salcaja (proyecto origen)

- Aplicacion mas grande que mezcla restaurante, eventos y ajedrez. El ajedrez es solo un modulo (`src/modules/chess`).
- Tiene un motor de torneos mas maduro y varias herramientas alrededor del torneo que Crea Torneos todavia no tiene.
- Su modulo de ajedrez ya resolvio problemas que Crea Torneos va a necesitar: bases/convocatoria, mas desempates, puntajes configurables, historial de torneos, auditoria de pareos y fotos de jugadores.

Crea Torneos nacio como la version enfocada y simple de ese modulo. La pregunta de este documento es: de todo lo que Azotea ya hizo, que vale la pena traer y que conviene dejar fuera para no complicar al organizador.

## 2. Que tiene Azotea que Crea Torneos todavia no

Comparacion de modelo de datos y motor entre `src/modules/chess` (Azotea) y `src/modules/tournaments` (Crea Torneos).

| Herramienta en Azotea | Que aporta | Existe en Crea Torneos | Recomendacion |
| --- | --- | --- | --- |
| Desempate `progressive` (acumulativo) | Suma del puntaje corrido ronda a ronda; premia ir adelante temprano | No | Portar |
| Desempate `median_buchholz` | Buchholz quitando el mejor y el peor rival | No | Portar (opcional) |
| Puntajes configurables (`winPoints`, `drawPoints`, `byePoints`, `forfeitWin/Loss`) | Permite torneos con puntaje distinto al clasico 1 / 0.5 / 0 | No (fijo 1/0.5/0) | Portar como opcion avanzada oculta |
| Bases del torneo (`TournamentBases`) | Convocatoria: premios, categorias de premio, ritmo de juego, cuota, fecha limite de inscripcion, que incluye, instrucciones de pago, adjuntos | No | Portar parcial (lo simple) |
| Fotos de jugador (`photoId`) | Foto opcional por jugador para tabla/podio | No | Evaluar (puede complicar) |
| `withdrawnAfterRound` | Marca exacta de en que ronda se retiro un jugador | Parcial (status) | Portar |
| Auditoria de pareos (`ChessPairingAttempt`) | Guarda entrada, salida y advertencias de cada generacion de ronda; pareo reproducible y explicable | No | Portar |
| Historial / ranking de torneos | Pagina que lista torneos terminados y sus podios | No | Portar (encaja con cierre + podio) |
| Vista en vivo (`torneos/live/[id]`) | Marcador que se actualiza para seguir el torneo en pantalla | Parcial (pagina publica estatica) | Portar idea (auto-refresco) |
| Recap + galeria post-torneo | Narrativa y fotos despues del torneo | No | Dejar fuera del MVP |
| `slug` + `visibility` (draft/published/unlisted/archived) | Control fino de publicacion | No (codigo publico simple) | No portar (rompe simplicidad) |
| Torneos privados por token (`private-tournaments`) | Torneo casual codificado en un link, sin guardar en base | No | No portar (Crea Torneos ya es esto, pero con base real) |
| Inscripciones / clases (`ChessEnrollment`) | Captacion de alumnos para clases | No | No portar (fuera de alcance) |
| Proyeccion Chessitos | Propuesta institucional de programa municipal | No | No portar (no es torneo) |

### Lectura rapida

Lo que conviene traer de Azotea son piezas de motor y de presentacion del torneo, no la complejidad de gestion. En concreto: mas desempates, puntajes configurables ocultos, bases de convocatoria simples, auditoria de pareos, retiro por ronda e historial con podios.

Lo que conviene dejar fuera: visibilidad multi-estado, slugs, torneos por token, inscripciones, recap/galeria y todo lo institucional. Cada una de esas piezas agrega decisiones que el organizador mayor no necesita tomar.

## 3. Estado del motor de pareo en ambos proyectos

Ambos proyectos usan hoy un **emparejamiento suizo voraz simple** (greedy): ordenan por puntos y luego por seed, asignan BYE al ultimo sin BYE previo, y emparejan al primero libre con el primer rival que no haya enfrentado, con una regla basica de color por balance.

Esto NO es el sistema FIDE Dutch real. Funciona para torneos chicos y amistosos, pero no respeta varias reglas oficiales (manejo formal de grupos de puntaje, flotantes, criterios de calidad de color, minimizar diferencias de puntaje al cruzar grupos). Para el publico objetivo de Crea Torneos esto puede estar bien, pero es una decision que hay que tomar a conciencia (ver doc 11, seccion de madurez del motor).

## 4. Como funciona la competencia

### 4.1 Software de escritorio clasico

- **Swiss-Manager** (Heinz Herzog): el estandar de facto, certificado por FIDE, 24 idiomas, +180 federaciones. Soporta suizo hasta 1200 jugadores y 46 rondas, round robin y equipos. Gratis bajo 60 jugadores. Contras: solo Windows, interfaz anticuada, curva de aprendizaje alta.
- **Vega**: alternativa gratuita (Linux gratis; Windows gratis hasta 30 jugadores). Usa el mismo motor de pareo de terceros que Swiss Master, por lo que produce pareos identicos.
- **SwissSys**: software de escritorio para directores de torneo; su complemento ChessRoster agrega inscripcion online, pagos y resultados en vivo.
- **Swiss Perfect**: historico, muy usado en su momento, hoy desplazado por los anteriores y por las apps web. Su valor era justamente lo que pedimos: pareo suizo correcto sin pedir demasiado.

Conclusion: el escritorio gana en correccion FIDE y fiabilidad offline, pero pierde en accesibilidad, movil y experiencia moderna. Justo el hueco donde puede vivir Crea Torneos.

### 4.2 Motor de pareo estandar (FIDE Dutch)

El estandar oficial es el **sistema holandes (Dutch, C.04.3)**. Reglas centrales:

1. **Grupos de puntaje**: los jugadores se agrupan por puntos; se empareja dentro del grupo antes de cruzar a grupos vecinos.
2. **No repetir rival**: restriccion absoluta, aunque obligue a soluciones suboptimas.
3. **Balance de color**: se busca alternar blancas/negras y mantener la diferencia dentro de mas/menos 1; quien tiene +2 recibe preferencia por negras.
4. **Flotantes (floaters)**: cuando un grupo no puede emparejarse solo, alguien baja o sube de grupo respetando la regla de no repetir.
5. **BYE**: para impares, va al jugador peor ubicado del grupo mas bajo que aun no haya recibido BYE.

Existen variantes aprobadas por FIDE: Dutch (estandar), Dubov, Burstein, Lim. Para evento rateado se usa Dutch.

Hay motores open source que lo implementan correctamente, notablemente **bbpPairings** (BSD, implementa Dutch y Burstein 2025/2026) y **JaVaFo**. Apps como ChessManager y ChessPairings.org se apoyan en este tipo de motores. Esto es relevante: si algun dia queremos pareo FIDE real, no hay que escribirlo desde cero.

### 4.3 Apps web modernas (competencia directa de Crea Torneos)

- **ChessManager**, **ChessPairings.org**, **CircleChess**, **Tornelo**, **SWIPS**, **Arena (MindMentorz)**: apps web que combinan gestion y participacion.
- Caracteristicas que las distinguen del escritorio:
  - Inscripcion online con limites de cupo y deteccion de duplicados.
  - Pagos integrados (Stripe).
  - Resultados y tabla en vivo que se actualizan tras cada ronda.
  - Acceso movil / responsive; gestion desde el telefono.
  - Auto-servicio: los jugadores reportan su propio resultado.
  - Integraciones: WhatsApp, Lichess, hibrido online/presencial.
  - Multiples desempates configurables (Buchholz, SB, ARO, directo, progresivo).

### 4.4 Plataformas de juego (Lichess y Chess.com)

- **Lichess Swiss**: solo lo crean lideres de equipo y lo juegan miembros del equipo. Puntos 1/0.5/0. Todos juegan cada ronda salvo impar. BYE de 1 punto cuando no hay pareo posible; medio punto al unirse tarde. No se puede acordar tablas antes de 30 jugadas. Desempate 1: Sonneborn-Berger; desempate 2: performance del torneo (`PERF = RO - 500 + 1000 * RATIO`).
- **Chess.com**: ofrece torneos Arena (entras y sales libremente) y Swiss (no puedes reingresar). Pareo automatico por puntaje similar.

Estas plataformas son para juego online, no para administrar un torneo presencial. Su aporte para nosotros es de UX y de reglas claras (como tratan BYE, tablas y desempates), no de funcionalidad a copiar.

## 5. Que aprendemos para un organizador mayor

1. **El estandar correcto es el Dutch, pero la correccion FIDE total no es el objetivo de este producto.** Nadie va a ratear estos torneos. El objetivo es que el pareo sea razonable, explicable y sin errores groseros (no repetir rival, BYE justo, colores balanceados).
2. **Lo que la competencia moderna hace bien y nosotros podemos copiar barato**: tabla y resultados en vivo, compartir por link/WhatsApp, lectura movil, y que el jugador solo lea sin poder editar. Crea Torneos ya va en esa direccion.
3. **Lo que la competencia hace y nosotros NO debemos copiar (por ahora)**: inscripcion con pagos, cuentas de usuario, integraciones, multi-evento, ratings oficiales. Cada una agrega friccion para el organizador.
4. **Desempates**: alcanza con un set fijo recomendado y la opcion de personalizar escondida. Buchholz Cut 1, Buchholz, Sonneborn-Berger, directo, victorias y victorias con negras cubren el 99% de los casos; progresivo es un extra barato heredado de Azotea.
5. **El diferenciador real de Crea Torneos** no es tener mas funciones que Swiss-Manager, sino ser la unica herramienta que un señor mayor puede usar solo, desde el telefono, sin manual, y que no pierde datos.

## 6. Fuentes revisadas

- FIDE Dutch system y variantes: https://chesspairings.org/en/guide/swiss-system-explained/
- bbpPairings (motor open source Dutch/Burstein): https://github.com/BieremaBoyzProgramming/bbpPairings
- ChessManager, sistema suizo: https://www.chessmanager.com/en-us/blog/swiss-system
- Comparativa de software de torneos: https://circlechess.com/blog/chess-tournament-management-software-comparison-circlechess-alternatives/
- Lichess Swiss: https://lichess.org/swiss
- Chess.com torneos en vivo: https://support.chess.com/article/621-how-do-live-tournaments-work-where-can-i-join-one
- Desempates en sistema suizo: https://en.wikipedia.org/wiki/Tie-breaking_in_Swiss-system_tournaments
- Sistema suizo (Wikipedia): https://en.wikipedia.org/wiki/Swiss-system_tournament
- SwissSys: https://swisssys.com/
- Tutorial Vega (Chess.com): https://www.chess.com/blog/SamCopeland/tutorial---the-free-td-software-vega

Fuentes propias:
- `src/modules/chess` (Azotea Salcaja).
- `src/modules/tournaments` (Crea Torneos).
- `docs/08-investigacion-y-auditoria-torneos.md` y `docs/09-diseno-implementacion-torneos.md`.
</content>
</invoke>
