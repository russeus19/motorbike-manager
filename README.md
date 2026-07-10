# Motorbike Manager 2026

Proyecto React + Vite. Manager de MotoGP, Moto2 y Moto3 con desarrollo de moto,
mercado de fichajes, sistema de lesiones y sustitutos, almacén de componentes
y centro de notificaciones por categoría.

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Abrí la URL que muestre la terminal (por defecto `http://localhost:5173`).

## Estructura del proyecto

```
src/
├── App.jsx              Componente raíz: estado global de la partida y navegación entre fases
├── main.jsx             Punto de entrada de React
├── components/          Piezas de UI reutilizables (paneles, modales, tarjetas)
├── pages/                Pantallas completas (Menú, Configuración, Temporada, Mercado, etc.)
├── data/                 Datos estáticos: circuitos, equipos, categorías, tablas de puntos...
├── utils/                Funciones puras: simulación de carreras, evolución de pilotos, mercado...
├── services/             Guardado/carga de partidas (localStorage) y utilidades de notificaciones
├── hooks/                Hooks de React reutilizables
├── styles/               Hoja de estilos global (Tailwind)
└── assets/               Imágenes (p. ej. la foto de fondo del menú principal)
```

## Notas

- El guardado de partidas usa `localStorage` a través de un pequeño adaptador en
  `src/services/storage.js` que imita la API de almacenamiento usada durante el
  desarrollo original del proyecto — el comportamiento del juego (3 slots de
  guardado, autoguardado, etc.) es exactamente el mismo.
- Todo el contenido, mecánicas y pantallas del proyecto original se mantienen
  sin cambios ni simplificaciones; esta reorganización es puramente estructural.
