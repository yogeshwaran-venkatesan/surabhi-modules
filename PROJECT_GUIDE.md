# Surabhi Modules — 3D Landing Page · PROJECT_GUIDE

Client: **Surabhi Modules** (also Surabhi Decor), interior design studio, Kakkanad, Kochi.
Goal: premium, high-converting landing page that drives **free-consultation enquiries on WhatsApp** and calls.

## Stack
- Plain HTML + CSS + JS, bundled into ONE self-contained file (`surabhi-modules.html`).
- **Three.js** (3D kitchen, procedural — no external .glb), **UnrealBloom** post-processing.
- **GSAP + ScrollTrigger** (scroll-driven camera), **Lenis** (smooth scroll).
- Fonts: Cormorant Garamond (display) + Manrope (body) from Google Fonts.
- Build: `esbuild` bundles `src/main.js` → inlined by `build.py` into `index.html`.

## Repository structure
```
index.html        BUILT site (generated — do not edit by hand; edit src/ and rebuild)
src/head.part     <head>: SEO title/meta, OG, LocalBusiness JSON-LD, fonts
src/body.part     all page markup (+ /*__CSS__*/ and /*__JS__*/ placeholders)
src/style.css     all styles (design tokens in :root)
src/main.js       3D scene, scroll story, configurator, intro, form
build.py          bundles JS (esbuild), inlines CSS + JS → index.html
scripts/shot.js   Playwright screenshots (desktop 1440 + mobile 390) → shots/
scripts/cfg.js    configurator test (switch finish, check WhatsApp text)
scripts/formtest.js  form validation + WhatsApp message test, dead-link check
scripts/foot.js   footer wordmark fit check
scripts/idle.js   counts WebGL draws while idle (hero + configurator must reach ~0)
scripts/perf.js   long tasks + first paint with 4x CPU throttle
scripts/og.js     renders assets/og.png (1200x630 share image) from the hero
assets/           static files copied to site root by build.py (og.png)
```
Commands: `npm install` → `npm run build` → `npm run shots` / `npm run test:form` / `npm run test:config`.
Deploy: `index.html` is fully self-contained (only Google Fonts load externally).
- GitHub Pages: serves root `index.html`.
- Vercel: `vercel.json` runs `python3 build.py` and serves `public/` (build.py writes `public/index.html`; `public/` is git-ignored).

## Design system
- Direction: dark "evening showroom" luxury-editorial.
- Colours: bg `#120F0C`, ivory `#EFE7DA`, paper `#E9E0D1`, brass accent `#C6A15B`, walnut `#3B2A1E`.
- Type scale: fluid clamp() tokens `--s-0 … --s-4`.
- Sections alternate dark / ivory: hero → story → finishes → statement → marquee → services → proof (ivory) → process → visit (ivory) → footer.

## How the page works
1. **Loader** (monogram draws) → **intro**: lights fade up, camera dollies in, 3D headline appears.
2. **Hero**: 3D kitchen in front of a fluted walnut wall; "Made to measure." is a texture plane *inside* the scene, behind the kitchen. Horizontal drag / touch rotates (vertical swipe still scrolls). Mouse parallax on desktop.
3. **#story** (700vh) drives ONE GSAP timeline; 1 time unit = 100vh of scroll:
   - 0–1 lock rotation · 1–2.3 shot "factory" (card 01) · 2.3–3.6 drawers open (card 02) · 3.6–5 upper door opens, jars visible (card 03) · 5–7 wide configurator shot.
   - Card slots are placed at 105vh / 240vh / 375vh to match those times.
4. **Finish configurator** (#finishes, sticky): 4 shutter collections × 3 countertops swap materials live (`api.setCollection`, `api.setTop`). Selection is written into the WhatsApp CTA text and the enquiry form message.
5. Canvas fades out and stops rendering once `#after` reaches 40% of the viewport (GPU saving).
6. **Form**: validates name + 10-digit phone, honeypot field, builds a WhatsApp message to +91 80897 67101 and shows a tap-to-send link (window.open is also attempted).

## Business rules / contact data (verified from Google listing + Instagram)
- WhatsApp: +91 80897 67101 · Call: +91 85472 62464 · Email: info@surabhidekor.com
- Address: Seaport–Airport Road, opp. Palaram Restaurant, Vallathol Padi, Thrikkakara, Kakkanad, Kochi 682021
- Hours: Mon–Sat 9:30 am – 6:00 pm · Google rating 4.8 (5 reviews)
- Claims used (from their Instagram): 34+ years, 300+ projects, 25,000 sq ft production unit & showroom.
- No testimonials are shown — none were supplied; do not invent any.

## Performance
- 3D init is deferred one frame so the loader paints first; all shaders are pre-compiled (compileAsync when KHR_parallel_shader_compile exists) before the intro.
- Loader leaves as soon as the scene is ready (min 0.7 s, max ~1.6 s); scrolling is NEVER locked.
- Render-on-demand: the loop compares camera / kitchen / intro state each frame and skips drawing when nothing changed. Hero auto-turn is capped at 30 fps and rests after 10 s without interaction. Shadow map updates only when the kitchen moves (`shadowMap.autoUpdate = false`). Anything that changes the scene outside the loop must call `api.invalidate()`.
- Scroll feel: Lenis lerp 0.12 + ScrollTrigger scrub 0.35 (camera follows scroll closely).
- Continuous adaptive quality: every 45 full-rate frames; if average > 24 ms → level 1 (no bloom, `html.lowfx` removes CSS blur), then level 2 (pixel ratio 1). Phones / small screens start at level 1 with pixel ratio ≤ 1.25.
- No `backdrop-filter` over the canvas on phones/tablets (`max-width:1000px` or coarse pointer) or in `lowfx`; grain overlay hidden there.
- Procedural wood textures use fewer strokes (startup cost).
- Pixel ratio capped (1.75 desktop / 1.5 touch), shadow map 1024 / 512, bloom at half resolution.
- Adaptive quality: if the first 2 s after intro run < 45 fps, bloom is switched off and DPR drops to 1.
- Render loop pauses when tab hidden or canvas hidden. `prefers-reduced-motion` disables Lenis, intro, float, marquee.
- No-WebGL fallback shows an HTML headline and static cards.

## Status
- Built and checked at 1440px and 390px (Playwright screenshots, no console errors, no horizontal overflow, no dead links, form + configurator tested).
- Published as a private claude.ai artifact.
- Review fixes (Nov 2026): faster loader, no scroll lock, tighter scroll, render-on-demand, no blur on mobile, adaptive quality; favicon (inline SVG), canonical + og:image (https://surabhi-modules-tryi.vercel.app/og.png), service rows open WhatsApp enquiries, "25,000" everywhere, one booking button on mobile (sticky bar), #finishes link lands after the camera settles, statement copy "three hundred and more projects", softer LED kick strip, second vase instead of stems, drawer contents, closer hero camera.
- Footer wordmark reads "Surabhi *Modules*" (outline + brass italic; stacks on mobile).

## Waiting on client
- Real logo (currently a text wordmark + "S" monogram).
- Real project photos for a gallery section; real Google review quotes (with permission).
- Final domain (update canonical/og:url/og:image), privacy-policy page, sitemap.xml / robots.txt.
- Confirm brand to lead with (Surabhi Modules vs Surabhi Decor), the Angamaly address and real opening hours (Justdial lists Sun 9–9), and the real finish names to use in the configurator.
- Optional: their own .glb kitchen model to replace the procedural one.
