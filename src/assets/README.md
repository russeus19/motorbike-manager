# Assets

Images referenced by a plain URL string in the code (like the home screen's
hero photo) must live in `public/assets/` — Vite serves that folder as-is at
the site root, so `/assets/hero-bike.png` resolves correctly without an
import. A copy is kept here too for convenience/reference.

If you need an image that gets processed/hashed by the bundler instead,
`import` it directly from this folder in the component that uses it, e.g.:

```js
import logo from "../assets/logo.png";
```
