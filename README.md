# Los Santos Drag Lab

A standalone high-school physics garage challenge: spend up to $8,000, choose
a shift RPM, and race as many times as you like on a 600-meter closed course.

## Play online

Open https://the-math-room.github.io/car-physics-game/ to play in a browser.
Players do not need Node.js or a local server.

## Run locally (development only)

Requires Node.js 18 or newer. No dependencies or installation step.

```sh
npm run dev
```

Open http://localhost:5173. Set `PORT` to choose another port. The development
server binds to localhost. For another computer or student devices, use static
hosting instead of this loopback-only server.

## Play

- Watch the live build dashboard for power-to-weight (kW per metric ton), peak power, total mass, grip, drag area, and remaining budget.
- The engine workshop offers a 120–300 hp slider in 1 hp increments. Price, added hardware mass, torque curve and power-to-weight update before installation.
- Open a Modify panel for physics explanations, package comparisons, and interactive graphs. Previewing a package does not install it; choose Install to commit.
- Choose parts and shift RPM. Over-budget builds cannot launch.
- Optionally record a prediction, then launch an attempt.
- At 600 m, the build score and sector times are saved immediately. Keep driving until a crash; later obstacles get progressively closer together. Survival distance is separate from the 600 m score.
- Revise between runs. Keep racing, export CSV anytime, or start a new session.

The driver shifts automatically; the player steers with left/right arrows or the
on-screen buttons. Launch and longitudinal traction control are idealized.
Barriers sit at fixed world-space distances, 19 m apart before the timed checkpoint, and approach at the
simulated forward speed. After 600 m the spacing decays toward 4 m; later rows
block two lanes, requiring increasingly quick reactions. Lateral steering is an arcade mechanic, not a lateral
friction simulation. The 600 m checkpoint preserves the calibrated physics times.

There is no run limit. Reaching 600 m saves one result immediately. A crash
before 600 m saves no score; a later crash adds survival distance without
changing the build time. Reloading abandons active gameplay but retains any
already-saved checkpoint result. The same course is used for every build.
The reset button supports shared devices; this is not a tamper-proof assessment.

Procedural Web Audio models four-cylinder firing pulses, exhaust harmonics and
wind. It follows engine RPM and drops in pitch after shifts. This is synthesized
sound, not a licensed vehicle recording. Audio starts from the launch gesture;
use Sound off to mute. Pause stops the race clock and sound. Switching away from
the tab pauses the race until Resume. Reduced-motion preferences suppress
background movement and speed streaks while keeping essential barriers visible.
Live speed uses mph; graphs and exports label their SI or km/h units explicitly.

## GitHub Pages

The root `index.html` opens the game in `dist/`. `.nojekyll` makes GitHub Pages
serve the files directly instead of processing the repository as a Jekyll site.
The README remains repository documentation, not the website entry point.

Use Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Push updates to `main` to publish. The game uses relative asset paths, so this
works both at the repository URL and on a custom domain configured in Pages.

`dist/` is also a complete standalone static website. Other static hosts can
publish that directory directly; it needs no build step or backend server.

## Validate and calibrate

```sh
npm test
npm run analyze
```

`dist/physics.mjs` is shared by the browser and analysis; `dist/session.mjs`
enforces the budget and attempt rules. The current sweep writes `analysis/engine-slider-results.json`; see
`analysis/engine-slider-report.txt` for the tested engine trade-offs. Run
`npm run analyze:legacy` to reproduce the historical fixed-package study. See
`analysis/balance-report.txt` for original price anchors,
assumptions, and the teaching rationale. Results are illustrative classroom-model
predictions, not measured performance of any named vehicle or aftermarket kit.

The interface and city artwork are original, code-drawn assets. This is an
unofficial educational activity, unaffiliated with Rockstar Games.

Earlier saved engine packages are mapped to their nearest horsepower setting for the active build. Historical runs are preserved and labeled as an earlier model; only current-model runs set the personal best.

## English and Spanish

Use the English / Español selector in the header. The preference is saved
separately from game progress; a first visit follows the browser language when
it is Spanish. Switching does not reload the page, reset a run, or change a
workshop preview. Menus, physics lessons, graph labels, accessible descriptions,
race feedback, canvas messages, and CSV headings are translated. Student-written
predictions are preserved verbatim. Numbers, USD prices, formulas, and units
keep the same notation so the physics and exported values are unchanged.

`dist/es.mjs` contains the Spanish phrases; `dist/i18n.mjs` handles dynamic
messages and reversible presentation translation. No online translation service
is used. New interface text should be added to the phrase catalog or a dynamic
message pattern. Proper names and student text are excluded from translation.
