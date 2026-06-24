# Railway setup

## Objetivo

Desplegar Crea Torneos en Railway usando:

- Servicio web para Next.js.
- PostgreSQL administrado en Railway.
- Prisma migrations antes de iniciar la app.

## Estado local

El proyecto ya incluye:

- `railway.json`
- `npm run build:with-prisma`
- `npm run prisma:migrate:deploy`
- Migracion inicial en `prisma/migrations/20260622163000_init/migration.sql`

## Paso 1 - Reautenticar Railway

La sesion local actual esta vencida. En una terminal interactiva ejecuta:

```bash
railway login
```

Si usas un entorno no interactivo, configura un token:

```bash
set RAILWAY_TOKEN=tu_token
```

En PowerShell:

```powershell
$env:RAILWAY_TOKEN="tu_token"
```

## Paso 2 - Crear o enlazar proyecto

Para crear un proyecto nuevo:

```bash
railway init --name crea-torneos
```

Si ya tienes un proyecto creado en Railway:

```bash
railway link
```

## Paso 3 - Agregar PostgreSQL

```bash
railway add --database postgres
```

Railway creara un servicio PostgreSQL con variables como `DATABASE_URL`.

## Paso 4 - Conectar variables al servicio web

El servicio web debe tener:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
APP_URL=https://tu-dominio.up.railway.app
```

El nombre `Postgres` puede variar si Railway crea el servicio con otro nombre. En ese caso usa el nombre real del servicio de base de datos.

## Paso 5 - Desplegar

```bash
npm run railway:deploy
```

Railway usara `railway.json`:

- Build: `npm run build:with-prisma`
- Predeploy: `npm run prisma:migrate:deploy`
- Start: `npm run start`

## Paso 6 - Verificacion

Despues del deploy:

1. Abrir la URL publica de Railway.
2. Crear un torneo.
3. Confirmar que redirige a `/torneos/CT-XXXXX`.
4. Refrescar la pagina.
5. Confirmar que jugadores, codigo y permisos siguen disponibles.
6. Generar primera ronda.
7. Registrar resultados.
8. Refrescar y confirmar que todo persiste.

## Nota operativa

No guardes `DATABASE_URL` real en git. Usa variables de Railway y `.env` local.

