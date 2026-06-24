# Arquitectura tecnica

## Enfoque recomendado

Construir una web/PWA con Next.js, TypeScript, Prisma y PostgreSQL.

La app debe poder abrirse como pagina web normal y tambien instalarse en el celular como acceso directo. Esto evita depender de App Store o Play Store.

## Stack inicial

- Framework: Next.js App Router.
- Lenguaje: TypeScript.
- Estilos: Tailwind CSS.
- ORM: Prisma.
- Base de datos: PostgreSQL.
- Proveedor DB recomendado: Neon Postgres.
- Hosting recomendado: Vercel.
- Testing: Vitest para motor de torneos y Playwright para flujos criticos.

## Alternativas de base de datos

### Neon Postgres

Recomendado para iniciar:

- Compatible con Prisma.
- Plan gratis util para MVP.
- Buena integracion con Vercel.
- PostgreSQL real.

### Railway PostgreSQL

Buena opcion si se quiere tener app y base de datos en un solo panel.

Consideracion: asumir costo mensual para produccion.

### Firebase/Firestore

Buena opcion si se prioriza offline automatico, pero menos natural para el modelo relacional de torneos, rondas, partidas y standings.

## Persistencia

La base de datos sera la fuente de verdad.

El navegador podra guardar:

- Ultimo torneo abierto.
- Borradores antes de crear torneo.
- PIN local si el usuario lo autoriza.
- Acciones pendientes si luego se implementa modo offline.

No se debe depender solamente de localStorage para resultados oficiales.

## Seguridad simple

No habra login formal en el MVP.

Control recomendado:

- Link publico para lectura.
- Codigo corto del torneo.
- PIN de organizador para editar.
- Token privado opcional para acceso rapido.
- Audit log de cambios.

## Relacion con Azotea Salcaja

Se puede reutilizar como referencia:

- Tipos de torneo.
- Calculo de standings.
- Desempates.
- Generacion inicial de pareos.
- Pruebas unitarias del motor.

Se debe redisenar:

- Persistencia de torneos privados.
- Flujo de creacion.
- Pantallas moviles.
- Control de edicion sin panel admin separado.
- Recuperacion por codigo.

