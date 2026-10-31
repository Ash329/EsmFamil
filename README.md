# Esm-o-Famil (اسم فامیل)

The Persian word game in the browser, on a notebook page lying on a rug. It opens in Farsi (switch to English at the top). Each round, letters run for two seconds and land on one; write a word starting with that letter for every category, and the row is graded in red pen: 10 points per valid answer.

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
src/styles.css   styles: six color tokens, RTL-aware notebook layout
images/          rug background (background-web.jpg) and icon
src/script.js    game logic
```

To change the categories, edit the `CATEGORIES` array at the top of `src/script.js`. Points, timer limits, the letter-picking time and the English/Persian alphabets are constants just below it.
