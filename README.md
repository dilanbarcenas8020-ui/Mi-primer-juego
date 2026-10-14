# Horda Neón

Juego de supervivencia contra hordas, al estilo de *Vampire Survivors* o *Brotato*. Te mueves, tus armas disparan solas y cada vez que subes de nivel eliges una de tres mejoras. Cada partida te da oro para hacerte más fuerte en la siguiente.

Funciona en computadora y en celular, directamente en el navegador. No hay que instalar nada.

## Cómo jugar

Abre `index.html` en tu navegador.

- **Computadora:** WASD o flechas para moverte · P o Esc para pausar · 1, 2, 3 para elegir cartas · R para cambiar las cartas.
- **Celular:** arrastra el dedo en cualquier parte de la pantalla (joystick flotante).

Recoge las gemas que sueltan los enemigos para subir de nivel. Sobrevive 15 minutos y derrota a **El Devorador** para ganar.

## Qué incluye

**Dentro de la partida**
- 6 armas, cada una con 5 niveles y una **evolución** secreta si la combinas con la pasiva correcta.
- 7 mejoras pasivas (poder, cadencia, velocidad, imán, vitalidad, área, suerte).
- Cartas con rareza: común, nueva, épica (doble mejora) y legendaria (evolución).
- 4 tipos de enemigos, élites dorados que sueltan cofres, enjambres que te rodean y 5 jefes.
- Cofres con 1, 3 o 5 premios, imanes, bombas y corazones.
- Combos con bonus de oro, golpes críticos, números de daño, explosiones, vibración de pantalla y música.

**Entre partidas**
- **Mejoras permanentes:** 12 mejoras que se compran con oro.
- **Personajes:** 6 personajes, cada uno con su propia arma inicial y estadísticas.
- **Misiones:** 21 logros que dan oro al reclamarlos.
- **Recompensa diaria** con racha de 7 días.
- Récords de tiempo, nivel y combo. Al terminar cada partida verás qué tan cerca estás de tu siguiente meta.

El progreso se guarda automáticamente en el navegador.

## Publicarlo en internet (gratis)

1. En GitHub, entra a **Settings → Pages**.
2. En **Branch**, elige la rama donde está el juego y la carpeta `/ (root)`, y guarda.
3. En un par de minutos estará en `https://dilanbarcenas8020-ui.github.io/Mi-primer-juego/`.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de la página y todas las pantallas |
| `css/style.css` | Diseño visual |
| `js/data.js` | Armas, enemigos, jefes, personajes, tienda y misiones (aquí es fácil cambiar números) |
| `js/save.js` | Guardado del progreso |
| `js/audio.js` | Efectos de sonido y música generados por código |
| `js/engine.js` | Motor del juego: movimiento, combate, enemigos y dibujo |
| `js/ui.js` | Menús, HUD y pantallas |
