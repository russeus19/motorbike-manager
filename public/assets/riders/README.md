# Fotografías de pilotos

Coloca aquí las fotografías, una por piloto, con el nombre exacto de su
**ID permanente** (el mismo `rider.id` que usa el juego internamente, no su
nombre). Ese ID se asigna una sola vez, en el momento en que el piloto se
crea (`utils/idGenerator.js`), y no cambia nunca durante la partida — sirve
igual para un piloto oficial, un agente libre, un sustituto o un rookie
recién generado.

No he generado fotografías reales de pilotos (serían personas identificables
reales). El sistema de carga automática ya está implementado y funcionando —
solo falta que añadas aquí tus propios archivos.

## Especificación

- Formato PNG, fondo transparente preferiblemente.
- Imagen cuadrada, 350×350 px recomendado.
- Nombre de archivo = ID exacto del piloto, ejemplo: `r7.png`.

## ¿Cómo sé el ID de un piloto?

Es el mismo identificador interno del juego (visible en el estado guardado
de la partida, o añadiendo un `console.log(rider.id)` puntual donde
necesites comprobarlo). Tiene el formato `r0`, `r1`, `r2`, ...

En cuanto coloques un archivo con el nombre correcto, aparecerá
automáticamente en el juego — no hace falta tocar ningún componente.

## default.png

Ya incluido: una silueta genérica de casco y hombros (no es la foto de
ningún piloto real) que se muestra automáticamente si falta la fotografía
de un piloto o si la imagen no carga correctamente.
