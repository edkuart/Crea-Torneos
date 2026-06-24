# Diseno de implementacion del sistema de torneos

Fecha: 2026-06-24

Este documento convierte la investigacion y auditoria en un diseno concreto para las siguientes implementaciones. La prioridad es que el organizador pueda crear, recuperar, administrar, compartir y cerrar un torneo real sin perder informacion y sin pedir datos innecesarios.

## Principio de diseno

Crea Torneos debe sentirse como una hoja de torneo digital, no como un panel tecnico. La pantalla publica y la pantalla del organizador son la misma pagina; la diferencia es que el organizador ve acciones protegidas por PIN/token.

Reglas base:

- El nombre del torneo es opcional. Si se deja vacio, el sistema asigna un nombre automatico correlativo.
- La base de datos es la fuente de verdad.
- La lectura publica nunca permite modificar.
- Toda accion sensible queda auditada.
- Los cambios visibles para jugadores deben ser simples: jugadores, rondas, resultados, tabla y podio.
- Las reglas complejas se explican con mensajes cortos cuando afectan al torneo.

## Flujo completo objetivo

1. El organizador entra a la pagina principal.
2. Elige sistema, rondas, desempates, PIN y jugadores.
3. Puede dejar el nombre vacio.
4. El sistema crea el torneo, asigna codigo publico y token de organizador.
5. La pagina muestra enlace publico, boton copiar y boton WhatsApp.
6. El organizador genera la primera ronda.
7. La pagina publica muestra pareos y lista de jugadores.
8. El organizador registra resultados.
9. La tabla se recalcula con puntos y desempates.
10. El organizador puede agregar, editar, retirar o reactivar jugadores segun reglas del estado actual.
11. Al terminar las rondas, el organizador cierra el torneo.
12. El sistema congela snapshot final y muestra ganadores 1, 2 y 3.
13. Si el navegador se cierra o recarga, el torneo se recupera por link, codigo, cookie de organizador o PIN.

## Pantalla de inicio y creacion

### Informacion solicitada

Obligatoria:

- Sistema: suizo o todos contra todos.
- Numero de rondas.
- Desempates.
- PIN de organizador.
- Lista inicial de jugadores.

Opcional:

- Nombre del torneo.

No pedir en el flujo principal:

- Lugar.
- Fecha.
- Descripcion.
- Arbitro.
- Rating oficial.
- Datos personales de jugadores.

Estos campos pueden quedar para una seccion avanzada posterior, no para el MVP.

### Nombre automatico

Si el nombre viene vacio:

- Crear `Torneo 001`, `Torneo 002`, etc.
- El correlativo debe calcularse en servidor.
- Debe ser unico por base de datos, no por navegador.
- El titulo puede editarse despues por el organizador.

### Desempates en creacion

Mostrar opciones preseleccionadas segun sistema:

Suizo recomendado:

- Buchholz Cut 1.
- Buchholz.
- Sonneborn-Berger.
- Encuentro directo.
- Victorias.
- Victorias con negras.

Round robin recomendado:

- Sonneborn-Berger.
- Encuentro directo.
- Victorias.
- Victorias con negras.

Para no complicar a usuarios mayores, la UI debe decir "Desempate recomendado" por defecto y permitir "Personalizar" en una zona compacta.

## Pagina de torneo

La pagina se divide en cinco zonas claras.

### 1. Encabezado de torneo

Visible para todos:

- Codigo publico.
- Nombre del torneo.
- Sistema.
- Rondas planificadas.
- Ronda actual.
- Estado: preparacion, activo, cerrado o cancelado.

Visible para organizador:

- Indicador "Modo organizador".
- Boton copiar enlace.
- Boton compartir por WhatsApp.
- Boton cerrar torneo cuando corresponda.

### 2. Podio

Visible cuando el torneo esta cerrado:

- Primer lugar.
- Segundo lugar.
- Tercer lugar.
- Puntaje final.
- Desempate principal si fue necesario.

Antes de cerrar:

- No mostrar podio definitivo.
- Se puede mostrar "Lideres actuales" solo si no confunde.

### 3. Tabla de posiciones

Columnas base:

- Posicion.
- Jugador.
- Puntos.
- Partidas jugadas.
- G/E/P.
- Desempate principal.

En escritorio se pueden mostrar mas columnas:

- Buchholz Cut 1.
- Buchholz.
- Sonneborn-Berger.
- Victorias.
- Victorias con negras.

En movil:

- Mantener lectura compacta.
- Mostrar detalles de desempate al tocar/expandir jugador o con texto secundario corto.

### 4. Rondas y resultados

Cada ronda debe mostrar:

- Numero de ronda.
- Estado de ronda.
- Mesa.
- Blancas.
- Negras.
- Resultado.

Organizador puede:

- Registrar 1-0.
- Registrar 1/2-1/2.
- Registrar 0-1.
- Registrar incomparecencia de blancas.
- Registrar incomparecencia de negras.
- Registrar doble incomparecencia.
- Corregir resultado.

Reglas:

- No se genera una ronda nueva si la ultima tiene resultados pendientes.
- No se editan resultados si el torneo esta cerrado, salvo una accion futura de reapertura con confirmacion.
- Los BYE aparecen resueltos y no se editan como partida normal.

### 5. Jugadores

Visible para todos:

- Lista de jugadores.
- Estado: activo, retirado o ausente.
- Puntaje actual.

Organizador puede:

- Agregar jugador.
- Editar nombre.
- Marcar como retirado.
- Marcar como ausente.
- Reactivar.
- Eliminar solo si el jugador no tiene partidas.

Reglas durante el torneo:

- Un jugador agregado despues de iniciar entra con seed al final.
- Si se agrega antes de generar la siguiente ronda, puede ser emparejado en esa ronda.
- Un jugador retirado no se empareja en rondas futuras.
- Un jugador con partidas historicas no debe borrarse; se retira para conservar tabla y auditoria.
- Si el jugador se reactiva, vuelve a estar disponible para rondas futuras.

## Modelo de datos objetivo

### Tournament

Agregar o confirmar:

- `title` opcional en formulario, obligatorio ya guardado por generacion automatica.
- `tiebreaks` como lista ordenada en JSON o tabla relacionada.
- `closedAt`.
- `finalStandingsSnapshotId` opcional.

### Player

Agregar o confirmar:

- `status`: active, withdrawn, absent.
- `lateEntryRound` opcional para saber desde que ronda participa.
- `withdrawnAt` opcional.

### StandingSnapshot

Debe usarse, no solo existir:

- Crear snapshot al completar cada ronda.
- Crear snapshot final al cerrar torneo.
- Guardar posiciones, puntos, desempates, estado de jugadores y fecha.

### AuditLog

Acciones nuevas:

- tournament_renamed.
- tournament_closed.
- player_added.
- player_updated.
- player_withdrawn.
- player_reactivated.
- player_deleted.
- tiebreaks_updated.
- standing_snapshot_created.

## Motor de standings y desempates

### Valores a calcular por jugador

- Puntos.
- Partidas jugadas.
- Victorias.
- Empates.
- Derrotas.
- Byes.
- Victorias con negras.
- Lista de rivales.
- Resultado contra rivales empatados.
- Buchholz.
- Buchholz Cut 1.
- Sonneborn-Berger.

### Ordenamiento

El orden de tabla debe seguir:

1. Puntos.
2. Desempates elegidos en el torneo.
3. Seed inicial como ultimo criterio estable.

La tabla no debe depender de un criterio oculto. Si el seed resuelve una posicion, eso debe quedar como criterio final interno.

### Advertencias de pareo

Mostrar al organizador cuando:

- Se permite repeticion porque no existe rival nuevo disponible.
- Todos ya recibieron BYE y hay numero impar.
- Hay menos de dos jugadores activos.
- El torneo ya alcanzo el numero de rondas.
- Hay resultados pendientes.

## Seguridad y recuperacion

### Sesion de organizador

- Mantener cookie httpOnly.
- Usar `sameSite=lax`.
- Usar `secure: true` en produccion.
- No poner token en URL.
- Permitir recuperar por PIN.
- Registrar desbloqueos en audit log.

### Acciones sensibles

Todas requieren token de organizador:

- Generar ronda.
- Registrar/corregir resultado.
- Gestionar jugadores.
- Cambiar titulo.
- Cambiar desempates.
- Cerrar torneo.

Endurecimiento recomendado:

- Verificar `Origin`/`Host` en server actions sensibles.
- Rate limit basico para intentos de PIN.
- Confirmacion visible para cerrar torneo, retirar jugador con partidas y corregir resultado de ronda completada.

### Recuperacion

El sistema debe permitir:

- Abrir por link publico.
- Buscar por codigo.
- Desbloquear con PIN.
- Recordar ultimo torneo abierto en navegador como ayuda, no como fuente oficial.

## Estados y permisos

### setup

Permitido:

- Editar titulo.
- Editar desempates.
- Agregar/editar/eliminar jugadores.
- Generar primera ronda.

### active

Permitido:

- Registrar resultados.
- Corregir resultados.
- Generar siguiente ronda.
- Agregar jugador como entrada tardia.
- Retirar/reactivar jugadores.

Restringido:

- Cambiar sistema.
- Reducir rondas por debajo de rondas ya generadas.
- Eliminar jugadores con partidas.

### closed

Permitido:

- Ver todo.
- Compartir.
- Exportar en el futuro.

Restringido:

- Editar jugadores.
- Generar rondas.
- Cambiar resultados.

### cancelled

Permitido:

- Ver historial.
- Compartir estado cancelado.

Restringido:

- Generar rondas.
- Registrar resultados.

## Orden de implementacion

### Entrega 1: creacion limpia

- Nombre opcional con generacion correlativa.
- Selector de desempates recomendado/personalizado.
- Guardar desempates en base.
- Actualizar textos para no pedir informacion innecesaria.

Criterio de salida:

- Se puede crear torneo sin nombre.
- El torneo queda con nombre automatico.
- La configuracion de desempates queda persistida.

### Entrega 2: standings reales

- Calcular Buchholz.
- Calcular Buchholz Cut 1.
- Calcular Sonneborn-Berger.
- Calcular encuentro directo.
- Ordenar tabla por desempates elegidos.
- Mostrar columnas/resumen de desempate.

Criterio de salida:

- Tests cubren empates y desempates.
- La tabla publica explica el orden.

### Entrega 3: gestion de jugadores

- Agregar jugador desde pagina del torneo.
- Editar nombre.
- Retirar/reactivar.
- Eliminar solo si no tiene partidas.
- Mostrar lista publica de jugadores.

Criterio de salida:

- Cambios sobreviven recarga.
- Retirados no son emparejados.
- Auditoria registra cada cambio.

### Entrega 4: compartir y vista publica

- Boton copiar link.
- Boton WhatsApp.
- Seccion de jugadores visible para todos.
- Mejorar lectura movil de tabla/rondas.

Criterio de salida:

- Un jugador abre el link y entiende jugadores, ronda actual, tabla y resultados sin poder editar.

### Entrega 5: cierre y podio

- Accion cerrar torneo.
- Snapshot final.
- Podio 1, 2 y 3.
- Bloqueo de ediciones con torneo cerrado.

Criterio de salida:

- El torneo cerrado muestra ganadores finales y no acepta cambios normales.

### Entrega 6: robustez de produccion

- Cookie secure en produccion.
- Verificacion Origin/Host.
- Proteccion contra doble generacion de ronda.
- Rate limit de PIN.
- Crear snapshot al completar ronda.
- Pruebas E2E con DB real.

Criterio de salida:

- Flujo completo probado desde navegador: crear, recargar, recuperar, compartir, jugar rondas, corregir, cerrar.

## Criterio final de produccion

El sistema estara listo para torneo real cuando:

- No se pierda informacion al refrescar o cerrar navegador.
- El organizador pueda recuperar control con PIN.
- Los jugadores solo puedan leer.
- Las rondas se generen sin resultados pendientes.
- Los jugadores retirados no se emparejen.
- La tabla use desempates elegidos.
- El podio final quede congelado.
- La auditoria permita entender que cambio y cuando.
- Build, typecheck, pruebas unitarias, Prisma validate y prueba E2E pasen.
