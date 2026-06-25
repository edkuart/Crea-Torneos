# Crea Torneos

Crea Torneos es una aplicacion web/PWA para crear y administrar torneos de ajedrez de forma simple, publica y persistente.

El proyecto nace como una version enfocada del modulo de ajedrez de Azotea Salcaja, pero sin restaurante, sin panel administrativo separado y con una experiencia pensada para personas mayores: botones grandes, flujo claro, lectura publica y control de edicion protegido por un codigo sencillo.

## Objetivo

Permitir que un organizador cree un torneo, registre jugadores, genere rondas, capture resultados y comparta tabla/pareos sin perder informacion al refrescar la pagina.

## Principio central

La base de datos sera la fuente de verdad. El navegador solo recordara el ultimo torneo abierto, borradores y estado temporal. Cada accion importante debe guardarse en servidor.

## Nombre

Crea Torneos comunica:

- Creacion directa de torneos.
- Claridad sobre lo que hace la aplicacion.
- Uso amable para personas que no quieren software tecnico.
- Marca simple y recordable.

## Documentacion

- `docs/01-vision-producto.md`
- `docs/02-arquitectura-tecnica.md`
- `docs/03-fases-construccion.md`
- `docs/04-modelo-datos.md`
- `docs/05-experiencia-usuario.md`
- `docs/06-registro-avance.md`
- `docs/07-railway-setup.md`
- `docs/08-investigacion-y-auditoria-torneos.md`
- `docs/09-diseno-implementacion-torneos.md`
- `docs/10-comparativa-azotea-y-competencia.md`
- `docs/11-diseno-y-fases-mejora.md`
