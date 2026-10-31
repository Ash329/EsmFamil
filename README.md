# Esm-o-Famil (اسم فامیل)

The Persian word game in the browser, in English and Farsi. Each round draws a random letter; write a word starting with that letter for every category and get 10 points per valid answer.

Plain HTML, CSS and vanilla JS, served and built with [Vite](https://vite.dev).

## Run it

Requires Node.js 20.19+ (or 22.12+).

```sh
npm install
npm run dev
```

Then open the URL Vite prints (by default http://localhost:5173).

## Scripts

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Dev server with hot reload                       |
| `npm start`       | Same as `npm run dev`                            |
| `npm run build`   | Production build into `dist/`                    |
| `npm run preview` | Serve the production build locally (port 4173)   |

## Project layout

```
index.html       page markup (Vite entry point)
src/styles.css   styles, light/dark tokens, RTL-aware layout
src/script.js    game logic
```

To change the categories, edit the `CATEGORIES` array at the top of `src/script.js`. Points, timer limits and the English/Persian alphabets are constants just below it.
