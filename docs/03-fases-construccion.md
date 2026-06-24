# Fases de construccion

## Fase 0 - Definicion

Objetivo: cerrar alcance antes de programar.

Entregables:

- Nombre del proyecto.
- Alcance MVP.
- Stack tecnico.
- Modelo de datos base.
- Flujo principal de usuario.
- Decisiones de persistencia.

Criterio de salida:

- Documento de fases aprobado.
- Flujo de torneo claro de inicio a cierre.

## Fase 1 - Base del proyecto

Objetivo: crear la aplicacion base.

Tareas:

- Crear proyecto Next.js.
- Configurar TypeScript, Tailwind y ESLint.
- Configurar Prisma.
- Conectar PostgreSQL.
- Crear layout base.
- Crear tema visual accesible.

Criterio de salida:

- App corre localmente.
- Build funciona.
- Prisma conecta a base de datos.

## Fase 2 - Modelo de torneos

Objetivo: tener persistencia real.

Tareas:

- Modelar torneo, jugador, ronda, partida, resultado y audit log.
- Crear migraciones.
- Crear servicios de dominio.
- Crear validaciones.
- Crear codigo publico de torneo.
- Crear PIN de organizador.

Criterio de salida:

- Crear torneo guarda en base de datos.
- Refrescar pagina no borra informacion.
- Se puede recuperar por codigo.

## Fase 3 - Motor de pareos

Objetivo: generar rondas confiables para MVP.

Tareas:

- Adaptar motor suizo de Azotea.
- Adaptar round robin.
- Manejar byes.
- Evitar repetir rivales cuando sea posible.
- Calcular standings.
- Calcular desempates principales.
- Agregar pruebas unitarias.

Criterio de salida:

- Tests cubren suizo, round robin, byes y standings.
- El sistema explica warnings si no puede cumplir una regla.

## Fase 4 - Experiencia del organizador

Objetivo: que una persona mayor pueda manejar el torneo.

Tareas:

- Pantalla crear torneo.
- Pantalla agregar jugadores.
- Pantalla generar ronda.
- Pantalla registrar resultados.
- Confirmaciones para cambios sensibles.
- Estados de guardado.

Criterio de salida:

- Un organizador puede crear y completar una ronda desde celular.
- Cada accion queda guardada en base de datos.

## Fase 5 - Vista publica

Objetivo: compartir torneo con jugadores.

Tareas:

- Pagina publica por codigo/link.
- Tabla de posiciones.
- Pareos por ronda.
- Resultados.
- Boton compartir por WhatsApp.
- Modo lectura clara.

Criterio de salida:

- Cualquier jugador puede abrir el link y entender el estado del torneo.

## Fase 6 - Recuperacion y robustez

Objetivo: evitar perdida de control.

Tareas:

- Buscar torneo por codigo.
- Recordar ultimo torneo abierto.
- Recuperar rol de organizador si tiene token/PIN.
- Audit log visible para cambios recientes.
- Mensajes claros de error.

Criterio de salida:

- Refrescar, cerrar y volver a abrir conserva acceso al torneo.
- Si se pierde el link, el codigo permite recuperar lectura.

## Fase 7 - PWA y accesibilidad

Objetivo: que se sienta como app sin construir app nativa.

Tareas:

- Manifest PWA.
- Iconos.
- Instalacion en celular.
- Cache basico.
- Auditoria de contraste.
- Botones grandes.
- Pruebas mobile.

Criterio de salida:

- Se puede instalar como app.
- La interfaz es usable en telefono por personas mayores.

## Fase 8 - Pulido y entrega

Objetivo: dejar lista una version vendible.

Tareas:

- Pruebas E2E.
- Guia de uso.
- Datos demo.
- Deploy.
- Backups o exportacion CSV basica.
- Checklist de produccion.

Criterio de salida:

- MVP publicado.
- Flujo completo probado.
- Cliente puede crear un torneo real.

