# Vision de producto

## Cliente objetivo

Crea Torneos esta pensada para organizadores y jugadores mayores que necesitan un sistema confiable para crear torneos de ajedrez sin aprender una herramienta compleja.

El sistema debe sentirse como una hoja de torneo digital:

- Facil de abrir.
- Facil de compartir.
- Facil de leer.
- Dificil de romper por accidente.
- Recuperable si se refresca la pagina o se cierra el navegador.

## Problema

Los torneos pequenos suelen manejarse con papel, Excel o aplicaciones demasiado tecnicas. Eso causa:

- Perdida de resultados.
- Confusion con pareos.
- Tablas no actualizadas.
- Dificultad para compartir resultados.
- Dependencia de una sola computadora.

## Solucion

Una web instalable tipo PWA donde todo vive en una misma experiencia publica:

- Crear torneo.
- Agregar jugadores.
- Generar ronda.
- Registrar resultados.
- Ver tabla.
- Compartir link.

No habra una division fuerte entre "sitio publico" y "admin". La misma pagina mostrara todo, pero las acciones de edicion requeriran codigo de organizador.

## Reglas de producto

- La lectura del torneo sera publica por link o codigo.
- La edicion sera protegida por PIN o link de organizador.
- Los cambios se guardaran en base de datos.
- El sistema debe mostrar claramente si un cambio fue guardado.
- El usuario debe poder recuperar un torneo por codigo corto.
- El MVP no buscara certificacion FIDE, pero si reglas explicables.

## Alcance MVP

Incluido:

- Crear torneo.
- Sistema suizo casual.
- Round robin.
- Jugadores activos y retirados.
- Byes.
- Resultados basicos.
- Tabla de posiciones.
- Desempates principales.
- Link publico.
- PIN de organizador.
- Persistencia en PostgreSQL.

No incluido inicialmente:

- Cuentas de usuario completas.
- App nativa.
- Pagos.
- Ratings oficiales.
- Exportacion FIDE/TRF.
- Certificacion de pareos FIDE.
