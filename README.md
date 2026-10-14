# Horda Neón

Juego de supervivencia contra hordas, al estilo de *Vampire Survivors* o *Brotato*. Te mueves, tus armas disparan solas y cada vez que subes de nivel eliges una de tres mejoras. Cada partida te da oro para hacerte más fuerte en la siguiente.

Funciona en computadora y en celular, directamente en el navegador. No hay que instalar nada.

## Cómo jugar

Abre `index.html` en tu navegador.

- **Computadora:** WASD o flechas para moverte · P o Esc para pausar · 1, 2, 3 para elegir cartas · R para cambiar las cartas.
- **Celular:** arrastra el dedo en cualquier parte de la pantalla (joystick flotante).

Recoge las gemas que sueltan los enemigos para subir de nivel. Cada 5 niveles aparece un **monstruo especial**, cada 15 un **subjefe** y cada 30 un **jefe**. Derrota al jefe del nivel 30 para completar la etapa y desbloquear el siguiente mapa.

## Mapas

| Mapa | Dificultad | Monstruos | Oro | Novedades |
| --- | --- | --- | --- | --- |
| 🌃 Ciudad Neón | Fácil | x1 | x1 | Monstruos clásicos |
| ☣️ Pantano Tóxico | Normal | Vida x1,8 · Daño x1,3 | x1,7 | Escupidor (charcos tóxicos), Divisor (se parte en 3) · arma Láser · pasiva Blindaje |
| ❄️ Glaciar Eterno | Difícil | Vida x2,7 · Daño x1,55 | x2,5 | Cargador (embiste), Escarcha (hielo que te frena) · arma Guadaña · pasiva Duplicador |
| 🌋 Volcán Infernal | Muy difícil | Vida x4,6 · Daño x1,95 | x3,5 | Kamikaze (explota), Invocador (llama diablillos) · arma Agujero Negro |
| 🌌 Vacío Estelar | Pesadilla | Vida x6,8 · Daño x2,3 | x5 | Espectro (se teletransporta), Francotirador (láser) · arma Supernova |

Cada mapa conserva los monstruos de los anteriores, tiene su propio subjefe y jefe, y la dificultad extra entra poco a poco durante los primeros 3 minutos. Los monstruos más difíciles dan más recompensas: los especiales sueltan un cofre, los subjefes un cofre de 3 premios y los jefes un cofre de 5 premios, además de mucho oro.

## Niveles especiales

Además de los mapas normales hay dos niveles especiales, donde las trampas son lo más difícil:

- **🧁 Marinela** (se desbloquea al completar ☣️ Pantano Tóxico). Una fábrica de dulces con solo los monstruos de los dos primeros mundos. Debes quedarte dentro de una **zona de glaseado** que se mueve y se encoge: afuera te quema y te frena. Además caen **chispas de chocolate** y hay **charcos de caramelo** que frenan a todos, también a los monstruos. Los **pastelitos** curan y dan velocidad.
- **😈 Piru** (se desbloquea al completar 🌌 Vacío Estelar). El nivel más difícil, con todos los monstruos de todos los mundos. Todo está **a oscuras**: solo ves cerca de ti y los ojos rojos de los monstruos. Cada 45 segundos cae una **maldición** (frenesí, sangría, eclipse o lluvia de fuego). Los **faroles** iluminan, y los **altares** dan una bendición de +40% de daño y más luz… a cambio de una emboscada.

## Renacer

Al juntar **50.000 monedas** puedes renacer: se reinicia todo (oro, mejoras, personajes, mapas, misiones y estadísticas) y a cambio ganas bonos permanentes que se suman con cada renacimiento:

| Bono por renacimiento | |
| --- | --- |
| ⚔️ Daño | +8% |
| 📈 Experiencia | +8% |
| 🪙 Oro | +15% |
| ❤️ Vida | +5% |

Cada renacimiento cuesta 2,5 veces más que el anterior (50.000 → 125.000 → 312.000 → 781.000…), así ayuda a avanzar más rápido sin volver el juego demasiado fácil.

## Qué incluye

**Dentro de la partida**
- 10 armas (4 de ellas solo en los mapas difíciles), cada una con 5 niveles y una **evolución** secreta si la combinas con la pasiva correcta.
- 9 mejoras pasivas (poder, cadencia, velocidad, imán, vitalidad, área, suerte, blindaje y duplicador).
- Cartas con rareza: común, nueva, épica (doble mejora) y legendaria (evolución).
- 12 tipos de enemigos con ataques distintos, élites dorados, enjambres, monstruos especiales, subjefes y jefes con ataques que se avisan antes de golpear (círculos, rayos, ondas).
- Cofres con 1, 3 o 5 premios, imanes, bombas, corazones y la Carne de Piru 🍖 que recupera vida.
- Combos con bonus de oro, golpes críticos, números de daño, explosiones, vibración de pantalla y música.

**Entre partidas**
- **Mejoras permanentes:** 14 mejoras que se compran con oro, incluidas ranuras extra de arma y de pasiva.
- **Mapas:** 5 mapas que se desbloquean uno tras otro y 2 niveles especiales.
- **Renacer** con bonos permanentes.
- **Personajes:** 6 personajes, cada uno con su propia arma inicial y estadísticas.
- **Misiones:** 38 logros que dan oro al reclamarlos.
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
