# Investigacion y auditoria de creacion de torneos

Fecha: 2026-06-24

Este documento deja por escrito las recomendaciones revisadas antes de tocar la implementacion, y compara el estado actual de `Crea Torneos` contra lo que necesita un creador de torneos para usarlo sin perder informacion.

## Fuentes revisadas

- FIDE Swiss Rules, reglas basicas efectivas desde 2026: https://handbook.fide.com/chapter/C0401202507
- FIDE General handling rules for Swiss tournaments, efectivas desde 2026: https://handbook.fide.com/chapter/GeneralHandlingRulesForSwissTournaments202602
- FIDE Play-Off and Tie-Break Regulations, efectivas desde 2026: https://handbook.fide.com/chapter/TieBreakRegulations032026
- Lichess Swiss tournaments: https://lichess.org/swiss
- MDN localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

## Recomendaciones externas aplicables

### Motor de torneo

- Las rondas deben declararse antes del torneo. FIDE lo exige como regla base para sistemas suizos.
- Dos jugadores no deben enfrentarse mas de una vez en sistema suizo, salvo que no exista alternativa practica y el sistema lo advierta.
- Si hay cantidad impar de jugadores activos, debe asignarse un BYE de forma objetiva. FIDE limita el BYE repetido; Lichess tambien lo trata como caso visible.
- El emparejamiento debe priorizar jugadores con puntajes iguales o cercanos.
- El sistema debe manejar jugadores retirados o ausentes sin seguir emparejandolos automaticamente.
- Las reglas de emparejamiento deben ser explicables. FIDE remarca transparencia y reproducibilidad; para este producto, eso significa mostrar advertencias simples al organizador cuando una regla no se puede cumplir.

### Desempates

- Los desempates deben definirse antes de iniciar o publicar el torneo.
- Para suizo, conviene permitir una lista ordenada. Base recomendada para MVP serio: puntos, Buchholz Cut 1, Buchholz, Sonneborn-Berger, encuentro directo, victorias, victorias con negras, seed/sorteo.
- Para round robin, Sonneborn-Berger y encuentro directo son mas naturales que Buchholz.
- La tabla publica debe mostrar al menos el puntaje y, cuando haya empates, el criterio que resolvio la posicion.

### Experiencia publica y de organizador

- Lichess separa bien la expectativa: en suizo todos juegan el mismo numero maximo de rondas, el pareo espera resultados, los jugadores ven lista/rondas/tabla, y la edicion queda bajo control del creador.
- El link publico debe ser solo lectura: jugadores pueden ver listado, pareos, resultados, tabla y ganadores, pero no modificar.
- El organizador debe ver lo mismo que los jugadores, mas acciones protegidas: generar ronda, registrar resultado, corregir resultado, gestionar jugadores, cerrar torneo.
- Debe existir una ruta clara para recuperar un torneo por codigo corto si se pierde el link.

### Persistencia y seguridad

- La base de datos debe ser la fuente de verdad para torneo, jugadores, rondas, partidas, resultados, standings y auditoria.
- `localStorage` sirve para recordar el ultimo torneo o borradores, pero no para resultados oficiales. MDN confirma que `localStorage` persiste en el navegador, pero tambien depende del origen/politicas del usuario.
- IndexedDB es mejor que `localStorage` si luego se implementa modo offline con cola de acciones, porque soporta datos estructurados.
- El token de organizador debe viajar como cookie httpOnly, no como parametro de URL ni en almacenamiento accesible por JavaScript.
- OWASP recomienda evitar session IDs en URL y preferir cookies con propiedades adecuadas. Para este proyecto: `httpOnly`, `sameSite`, `secure` en produccion, expiracion y rotacion/revocacion de sesiones.
- Las mutaciones deben protegerse contra CSRF. `sameSite=lax` ayuda, pero para acciones sensibles conviene agregar verificacion de origen o token CSRF si la app crece.
- Toda accion sensible debe registrar auditoria: quien/como, antes, despues y fecha.

## Estado actual del proyecto

Verificado localmente:

- `npm run typecheck`: pasa.
- `npm test -- --run`: pasa, 6 tests.
- `npx prisma validate`: pasa.
- `npm run build`: pasa con Next.js 16.2.6.

### Lo que ya esta bien encaminado

- Persistencia real modelada en PostgreSQL con Prisma: torneos, jugadores, rondas, partidas, sesiones de organizador, snapshots y auditoria.
- Creacion de torneo con codigo publico `CT-XXXXX`.
- PIN de organizador hasheado con `scrypt`.
- Token de organizador guardado en cookie httpOnly.
- Recuperacion de control con PIN desde otro navegador/dispositivo.
- Ruta publica `/torneos/[publicCode]`.
- Vista publica sin botones de edicion cuando no hay token valido.
- Generacion de rondas suizas y round robin.
- BYE automatico para campos impares.
- Bloqueo de siguiente ronda si hay resultados pendientes.
- Registro y correccion de resultados basicos.
- Tabla de posiciones calculada desde datos guardados.
- Audit log para creacion, desbloqueo, rondas y resultados.

### Brechas contra el requisito actual

1. Nombre automatico del torneo: resuelto en la Entrega 1. El formulario permite dejar el nombre vacio y el sistema genera nombres como `Torneo 001`, `Torneo 002`, etc.
2. Desempates configurables: resuelto para MVP en Entrega 2. Ya se guardan los desempates elegidos, se calculan Buchholz, Buchholz Cut 1, Sonneborn-Berger y encuentro directo, y la tabla se ordena por la lista configurada.
3. Gestion de jugadores durante el torneo: resuelta para MVP en Entrega 3. El organizador puede agregar, editar, retirar, ausentar, reactivar y eliminar solo jugadores sin partidas.
4. Listado publico de jugadores: resuelto en Entrega 3. La pagina del torneo muestra jugadores, estado, seed y puntaje.
5. Ganadores 1, 2 y 3: no esta listo como cierre de torneo. La tabla ordena posiciones, pero falta accion de cerrar torneo, congelar standings finales y destacar podio.
6. Compartir torneo: resuelto para MVP en Entrega 4. La pagina tiene copiar enlace y compartir por WhatsApp.
7. Produccion de datos: parcial. El modelo es correcto, pero falta DB real conectada, migracion aplicada en proveedor, backups/exportacion, pruebas E2E y control de concurrencia para evitar doble generacion de ronda con doble click o dos dispositivos.
8. Seguridad de produccion: parcial. La cookie es httpOnly y sameSite, pero falta asegurar `secure: true` en produccion, revisar CSRF/origin, expiracion/revocacion de sesiones, rate limit para PIN y mensajes de error sin fuga de informacion.
9. Snapshots de tabla: el modelo existe, pero no se esta creando snapshot al completar rondas o cerrar torneo.
10. Estado de torneo cerrado: el enum existe, pero no hay accion para cerrar/cancelar ni bloqueo de ediciones posteriores.

## Nivel estimado de preparacion

- Motor MVP local: 70%.
- Persistencia y recuperacion: 65%, bloqueada por conexion real a PostgreSQL/hosting.
- Flujo de creador en UI: 45%.
- Vista publica para jugadores: 55%.
- Produccion/seguridad robusta: 40%.

Estimacion global actual: 55-60% para un MVP funcional, pero todavia no al nivel de produccion que pide el flujo completo.

## Prioridad recomendada de implementacion

1. Quitar obligatoriedad del nombre y generar nombre correlativo.
2. Agregar campo/configuracion de desempates en el modelo y en la creacion.
3. Implementar calculo real de desempates y mostrar columnas resumidas en tabla.
4. Agregar gestion de jugadores protegida por organizador: agregar, editar, retirar, reactivar; borrar solo si no tiene partidas.
5. Agregar seccion publica de jugadores y boton compartir.
6. Agregar cierre de torneo, snapshot final y podio 1-2-3.
7. Endurecer produccion: cookie secure, rate limit PIN, CSRF/origin, doble-submit/doble-click, backups/exportacion.
8. Probar end-to-end con PostgreSQL real y navegador: crear, recargar, cerrar, recuperar por codigo/PIN, generar rondas, corregir resultados y cerrar torneo.
