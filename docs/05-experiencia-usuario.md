# Experiencia de usuario

## Principios

- La pantalla debe decir claramente que hacer despues.
- No usar palabras tecnicas si no son necesarias.
- Botones grandes y legibles.
- Alto contraste.
- Confirmar acciones delicadas.
- Mostrar siempre si algo fue guardado.
- Poder volver al torneo facilmente.

## Flujo principal

1. Entrar a Crea Torneos.
2. Tocar Crear torneo.
3. Elegir sistema.
4. Ingresar jugadores.
5. Guardar torneo.
6. Recibir codigo y link.
7. Generar primera ronda.
8. Registrar resultados.
9. Ver tabla.
10. Generar siguiente ronda.

## Pantallas MVP

### Inicio

Acciones:

- Crear torneo.
- Buscar torneo por codigo.
- Abrir ultimo torneo.

### Crear torneo

Campos:

- Sistema.
- Rondas.
- Desempates.
- PIN de organizador.
- Jugadores.

Opcional:

- Nombre del torneo. Si se deja vacio, el sistema asigna un nombre automatico correlativo.

### Torneo

Bloques:

- Estado general.
- Boton generar ronda.
- Ronda actual.
- Tabla.
- Historial de rondas.
- Compartir link.

### Registro de resultados

Botones:

- Gana blancas.
- Empate.
- Gana negras.
- Incomparecencia.
- Corregir.

Debe mostrar:

- Mesa.
- Blancas.
- Negras.
- Resultado actual.
- Estado guardado.

## Accesibilidad para personas mayores

Recomendaciones:

- Fuente base minima de 18px en pantallas clave.
- Botones de al menos 44px de alto.
- Evitar iconos sin texto.
- Evitar menus escondidos para acciones principales.
- Evitar colores de bajo contraste.
- Usar textos concretos: "Guardar resultado", no solo "OK".
- Mantener una ruta visible para volver a tabla y ronda actual.

## Recuperacion

El usuario debe poder recuperar acceso por:

- Link compartido.
- Codigo corto del torneo.
- Ultimo torneo guardado en el navegador.
- PIN de organizador.

Si el usuario refresca la pagina:

- La app consulta la base de datos.
- Reconstruye el estado del torneo.
- Mantiene permisos si el token local sigue presente.
