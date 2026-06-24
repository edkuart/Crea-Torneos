# Registro de avance

## 2026-06-22 - Fase 1 iniciada y base creada

Estado: completada como base tecnica inicial.

Se creo:

- Proyecto Next.js App Router con `src/`.
- TypeScript estricto.
- Tailwind CSS 4.
- ESLint con `eslint .`, siguiendo Next.js 16.
- Prisma preparado con `prisma/schema.prisma`.
- `.env.example` para futura conexion PostgreSQL.
- Primera pantalla de producto para crear/buscar torneos.
- Documentacion conservada en `docs/`.

Verificaciones:

- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npm run build`: pasa.

Decision tecnica:

- `npm run build` compila solo Next.js.
- `npm run build:with-prisma` queda reservado para cuando exista `DATABASE_URL`.

Siguiente fase:

- Fase 2: modelo de torneos con PostgreSQL, codigo publico, PIN de organizador y persistencia real.

## 2026-06-22 - Fase 2 implementada en codigo base

Estado: implementada en codigo, pendiente de conectar una base PostgreSQL real.

Se creo:

- Schema Prisma relacional para torneos, jugadores, rondas, partidas, snapshots y audit log.
- Capa `src/lib/db.ts` para Prisma 7 con adapter PostgreSQL.
- Hashing de PIN/token de organizador en `src/lib/security.ts`.
- Validaciones Zod para crear y buscar torneo.
- Generacion de codigos publicos `CT-XXXXX`.
- Server actions para crear torneo y buscar por codigo.
- Ruta publica `/torneos/[publicCode]`.
- Cookie httpOnly de organizador para conservar control en el mismo navegador.
- Pantallas amigables de error y torneo no encontrado.

Verificaciones:

- `npx prisma generate`: pasa.
- `npm run lint`: pasa.
- `npm run typecheck`: pasa.
- `npm run build`: pasa.
- `npm run build:with-prisma`: pasa.

Pendiente externo:

- Crear base PostgreSQL en Neon, Railway u otro proveedor.
- Copiar `DATABASE_URL` a `.env`.
- Ejecutar `npx prisma migrate dev --name init`.
- Probar creacion real de torneo desde la interfaz.

Siguiente fase tecnica:

- Fase 3: motor de pareos inicial, generacion de primera ronda, byes y tabla basica.

## 2026-06-22 - Fase 3 implementada en codigo base

Estado: implementada y verificada con pruebas unitarias. Pendiente prueba end-to-end con PostgreSQL real.

Se creo:

- Motor de puntuacion en `src/modules/tournaments/scoring.ts`.
- Motor de standings en `src/modules/tournaments/standings.ts`.
- Motor de pareos en `src/modules/tournaments/pairings.ts`.
- Adaptador Prisma -> motor en `src/modules/tournaments/adapters.ts`.
- Tests unitarios de suizo, round robin, byes, bloqueo por resultados pendientes y standings.
- Server action para generar siguiente ronda.
- Server action para registrar resultados.
- Vista de torneo con tabla, rondas, partidas y botones de resultado para organizador.

Reglas implementadas:

- No se genera otra ronda si quedan partidas pendientes.
- Se asigna BYE automatico con 1 punto si hay jugadores impares.
- Sistema suizo evita repetir rivales cuando puede.
- Round robin genera calendario por rotacion.
- La tabla ordena por puntos, victorias, victorias con negras y seed.
- La edicion exige token de organizador guardado en cookie httpOnly.

Verificaciones:

- `npm test -- --run`: pasa.
- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npm run build:with-prisma`: pasa.

Pendiente externo:

- Conectar `DATABASE_URL`.
- Ejecutar migracion inicial.
- Crear torneo desde UI.
- Generar ronda real y registrar resultados en base de datos.

Siguiente fase recomendada:

- Fase 4: conectar base real y probar flujo completo desde navegador; despues pulir accesibilidad del organizador.

## 2026-06-22 - Recuperacion de control y migracion inicial

Estado: implementado en codigo y verificado.

Se creo:

- Modelo `OrganizerSession` para permitir varios dispositivos de organizador por torneo.
- Accion `unlockOrganizerAction` para recuperar permisos con PIN.
- Formulario de PIN en la pagina publica del torneo cuando el navegador no tiene permisos.
- Verificacion de permisos por token de sesion, no solo por el token inicial.
- Migracion SQL inicial en `prisma/migrations/20260622163000_init/migration.sql`.

Por que importa:

- Si el organizador refresca la pagina, conserva control por cookie.
- Si abre desde otro dispositivo, puede recuperar control con el PIN.
- Un nuevo desbloqueo no invalida otros dispositivos del organizador.
- La estructura de base ya esta lista para aplicar en PostgreSQL.

Verificaciones:

- `npx prisma generate`: pasa.
- `npm test -- --run`: pasa.
- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npm run build:with-prisma`: pasa.

Siguiente paso bloqueado por decision externa:

- Crear la base PostgreSQL en Neon o Railway.
- Poner `DATABASE_URL` en `.env`.
- Ejecutar `npx prisma migrate dev`.
- Probar el flujo real creando un torneo desde la interfaz.

## 2026-06-22 - Preparacion Railway

Estado: configurado localmente. Pendiente reautenticacion Railway.

Se creo:

- `railway.json` con Railpack, build command, predeploy migration, start command y healthcheck.
- Script `npm run prisma:migrate:deploy`.
- Script `npm run railway:deploy`.
- Guia operativa `docs/07-railway-setup.md`.

Decision:

- Usar Railway PostgreSQL como base principal.
- Ejecutar `prisma migrate deploy` antes de arrancar la app en Railway.
- Mantener `DATABASE_URL` fuera del repositorio.

Hallazgo:

- Railway CLI esta instalado: `railway 4.66.0`.
- La sesion local esta vencida con `invalid_grant`.
- `railway login --browserless` no funciona en esta terminal porque requiere entorno interactivo.
- No hay `RAILWAY_TOKEN` ni `RAILWAY_API_TOKEN` en el entorno.

Verificaciones:

- `npm run typecheck`: pasa.
- `npm run lint`: pasa.
- `npm run build:with-prisma`: pasa.

Siguiente paso:

- Ejecutar `railway login` en una terminal interactiva o configurar `RAILWAY_TOKEN`.
- Luego correr `railway init --name crea-torneos` o `railway link`.
- Agregar Postgres con `railway add --database postgres`.
- Configurar `DATABASE_URL` en el servicio web.
- Desplegar con `npm run railway:deploy`.

## 2026-06-24 - Diseno e inicio de Entrega 1

Estado: documentado e implementado en codigo base.

Se documento:

- Investigacion y auditoria en `docs/08-investigacion-y-auditoria-torneos.md`.
- Diseno completo de implementacion en `docs/09-diseno-implementacion-torneos.md`.
- Flujo objetivo: nombre opcional, desempates, gestion de jugadores, vista publica, cierre, podio y robustez.

Se implemento:

- Campo `sequenceNumber` en `Tournament` para nombres automaticos correlativos.
- Campo JSON `tiebreaks` en `Tournament` para guardar desempates elegidos.
- Migracion `20260624105000_add_tournament_sequence_and_tiebreaks`.
- Helper `src/modules/tournaments/tiebreaks.ts`.
- Creacion de torneo sin nombre obligatorio.
- Generacion automatica de nombres `Torneo 001`, `Torneo 002`, etc.
- Selector de desempates en la pantalla de creacion.
- Persistencia de desempates en la base.
- Visualizacion de desempates guardados en la pagina del torneo.

Verificaciones:

- `npx prisma generate`: pasa.
- `npx prisma validate`: pasa.
- `npm run typecheck`: pasa.
- `npm test -- --run`: pasa.
- `npm run lint`: pasa.
- `npm run build`: pasa.

Siguiente paso recomendado:

- Entrega 2: standings reales con Buchholz, Buchholz Cut 1, Sonneborn-Berger, encuentro directo y ordenamiento por desempates elegidos.

## 2026-06-24 - Entrega 2 standings y desempates reales

Estado: implementado y verificado.

Se implemento:

- Calculo de Buchholz por jugador.
- Calculo de Buchholz Cut 1 por jugador.
- Calculo de Sonneborn-Berger por jugador.
- Calculo comparativo de encuentro directo para jugadores empatados.
- Ordenamiento de tabla por puntos y por la lista de desempates elegida en el torneo.
- Valores de desempate guardados en `PlayerStanding`.
- Visualizacion del desempate principal en la tabla publica.
- Texto de tabla indicando el criterio principal usado.
- Pruebas unitarias para Buchholz, Buchholz Cut 1, Sonneborn-Berger y encuentro directo.

Verificaciones:

- `npm run typecheck`: pasa.
- `npm test -- --run`: pasa, 9 tests.
- `npm run lint`: pasa.
- `npm run build`: pasa.

Nota:

- El encuentro directo esta implementado como comparacion entre dos jugadores empatados que ya se enfrentaron. Si mas adelante se necesita resolver grupos complejos de tres o mas jugadores empatados con todos contra todos interno, conviene ampliar el algoritmo de desempate por subgrupos.

Siguiente paso recomendado:

- Entrega 3: gestion de jugadores desde la pagina del torneo: agregar, editar, retirar, reactivar y eliminar solo si no tiene partidas.

## 2026-06-24 - Entrega 3 gestion de jugadores

Estado: implementado y verificado.

Se implemento:

- Seccion publica de jugadores en la pagina del torneo.
- Puntaje, seed y estado visible por jugador.
- Accion protegida para agregar jugador.
- Accion protegida para editar nombre.
- Accion protegida para marcar jugador como retirado.
- Accion protegida para marcar jugador como ausente.
- Accion protegida para reactivar jugador.
- Accion protegida para eliminar jugador solo si no tiene partidas.
- Bloqueo de gestion de jugadores si el torneo esta cerrado o cancelado.
- Audit log para agregar, actualizar, retirar, ausentar, reactivar y eliminar.
- Prueba unitaria para confirmar que retirados y ausentes no se emparejan.

Verificaciones:

- `npm run typecheck`: pasa.
- `npm test -- --run`: pasa, 10 tests.
- `npm run lint`: pasa.
- `npm run build`: pasa.

Siguiente paso recomendado:

- Entrega 4: compartir torneo y mejorar vista publica: copiar enlace, WhatsApp, lectura movil y separacion clara entre publico/organizador.

## 2026-06-24 - Entrega 4 compartir y vista publica

Estado: implementado y verificado.

Se implemento:

- Componente cliente `ShareTournamentActions` para acciones de navegador.
- Boton para copiar enlace publico del torneo.
- Boton para compartir por WhatsApp.
- Texto de acceso mas claro para diferenciar vista publica y modo organizador.
- Texto de rondas ajustado para explicar que pareos/resultados son visibles para todos.
- Texto de jugadores ajustado como lista publica con estado y puntaje.
- La pagina principal del torneo sigue siendo Server Component; solo los botones de compartir usan Client Component.

Verificaciones:

- `npm run typecheck`: pasa.
- `npm test -- --run`: pasa, 10 tests.
- `npm run lint`: pasa.
- `npm run build`: pasa.

Siguiente paso recomendado:

- Entrega 5: cierre del torneo, snapshot final y podio 1, 2 y 3.
