(function () {
  const CROWN_PATH = new Path2D('M6 9.5L9 18.5H17.5L20 9.5L15.5 13L13 7.5L10.5 13L6 9.5Z');

  // Crown label drawn as Path2D — always vector, never pixelated (viewBox 0 0 24 24)
  const CROWN_BODY  = new Path2D('M12.001 3.00195L18.9018 19.002C18.5465 19.313 18.0829 19.497 17.585 19.4971H12.001H6.41504C5.50802 19.4969 4.71487 18.8865 4.48242 18.0098L1.5 6.76172L8.56836 10.9463L8.57324 10.9482L11.999 3.00195L12 3L12.001 3.00195Z');
  const CROWN_SHADE = new Path2D('M19.5176 18.0098C19.4127 18.4054 19.1925 18.7454 18.9004 19.001L15.4277 10.9473L22.5 6.76172L19.5176 18.0098Z');

  const BRUSH_RADIUS = 10;
  const REVEAL_THRESHOLD = 0.65;
  const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif";
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  let globalShimmer = 0;
  let waveTime      = 0; // monotonically increasing — no % 1, so wave never snaps
  const activeCards = [];

  // ─── Feed data ────────────────────────────────────────────────────────────
  const PRODUCTS = [
    { img: 'images/case-leather.png',    badge: 'КЕЙС', mod: '',       price: '3 490 ₽',  cb: '260 ₽',   name: 'Leather Keychain',     desc: 'Кожаный чехол для AirPods Pro'    },
    { img: 'images/case-icecream.png',   badge: 'E',    mod: 'elago',  price: '1 290 ₽',  cb: '95 ₽',    name: 'Elago Ice Cream',      desc: 'Силиконовый чехол для AirPods'    },
    { img: 'images/airpods-max.png',     badge: '✦',    mod: 'apple',  price: '59 990 ₽', cb: '4 500 ₽', name: 'AirPods Max',          desc: 'Накладные наушники'               },
    { img: 'images/airpods-classic.png', badge: '✦',    mod: 'apple',  price: '14 990 ₽', cb: '1 100 ₽', name: 'AirPods (3-е пок.)',   desc: 'Беспроводные наушники'            },
    { img: 'images/case-rugged.png',     badge: 'G',    mod: 'rugged', price: '1 590 ₽',  cb: '120 ₽',   name: 'Rugged Armor',         desc: 'Защитный чехол для AirPods Pro'   },
    { img: 'images/image 13.png',        badge: 'КЕЙС', mod: '',       price: '3 290 ₽',  cb: '240 ₽',   name: 'Leather Mini',         desc: 'Кожаный чехол для AirPods 3'      },
    { img: 'images/image 14.png',        badge: 'E',    mod: 'elago',  price: '1 390 ₽',  cb: '100 ₽',   name: 'Elago Splash',         desc: 'Силиконовый чехол для AirPods Pro' },
    { img: 'images/image 15.png',        badge: '✦',    mod: 'apple',  price: '61 990 ₽', cb: '4 700 ₽', name: 'AirPods Max Sky Blue', desc: 'Накладные наушники'               },
    { img: 'images/image 16.png',        badge: '✦',    mod: 'apple',  price: '13 990 ₽', cb: '1 000 ₽', name: 'AirPods Lite',         desc: 'Беспроводные наушники'            },
    { img: 'images/image 17.png',        badge: 'G',    mod: 'rugged', price: '1 690 ₽',  cb: '130 ₽',   name: 'Rugged Armor X',       desc: 'Защитный чехол для AirPods Max'   },
    { img: 'images/image 18.png',        badge: 'КЕЙС', mod: '',       price: '3 690 ₽',  cb: '280 ₽',   name: 'Leather Cognac',       desc: 'Кожаный чехол для AirPods Pro 2'  },
  ];

  const PRIZES = [
    { percent: '+15%',   title: 'Кэшбэк повышен!',   sub: 'на «Гаджеты» до конца недели'     },
    { percent: '+20%',   title: 'Суперкэшбэк!',      sub: 'на электронику до пятницы'         },
    { percent: '+10%',   title: 'Бонус активирован', sub: 'на все покупки сегодня'            },
    { percent: '+500 ₽', title: 'Кэшбэк на покупку', sub: 'зачислим после следующего заказа'  },
    { percent: '×2',     title: 'Двойной кэшбэк!',   sub: 'на любой товар сегодня'            },
    { percent: '20%',    title: 'Кэшбэк на категорию', sub: 'на «Гаджеты» до конца дня'      },
  ];

  const GOLD_PRIZES = [
    { amount: 'Год Premium', sub: 'бесплатно для вас' },
    { amount: 'iPhone',      sub: 'бесплатно для вас' },
  ];

  // ─── Factory ──────────────────────────────────────────────────────────────
  function initCard({ zoneId, canvasId, hintId, pattern, autoScratch = false }) {
    const scratchWrap = document.getElementById(zoneId);
    const canvas     = document.getElementById(canvasId);
    const hint       = document.getElementById(hintId);
    if (!scratchWrap || !canvas) return null;

    const ctx     = canvas.getContext('2d');
    const mask    = document.createElement('canvas');
    const maskCtx = mask.getContext('2d');

    // Particle overlay canvas — sits above foil, pointer-events: none
    const pCanvas = document.createElement('canvas');
    pCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;';
    scratchWrap.appendChild(pCanvas);
    const pCtx = pCanvas.getContext('2d');

    // Static grain texture — generated once, reused every drawFoil()
    const NOISE_SIZE = 180;
    const noiseEl  = document.createElement('canvas');
    noiseEl.width  = NOISE_SIZE;
    noiseEl.height = NOISE_SIZE;
    const nImgData = noiseEl.getContext('2d').createImageData(NOISE_SIZE, NOISE_SIZE);
    for (let i = 0; i < nImgData.data.length; i += 4) {
      const v = Math.floor(Math.random() * 256);
      nImgData.data[i] = nImgData.data[i + 1] = nImgData.data[i + 2] = v;
      nImgData.data[i + 3] = 255;
    }
    noiseEl.getContext('2d').putImageData(nImgData, 0, 0);

    let crowns           = [];
    let revealed         = false;
    let pointerDown      = false;
    let lastPoint        = null;
    let particles        = [];
    let pRafId           = null;
    let cancelOnboarding = null; // set by runOnboarding, called on first touch
    let pendingHaptic    = false; // vibrate on next touchend (touchmove lacks user activation)

    const DEBRIS_COLORS = ['#b8b8c0', '#c4c4cc', '#d0d0d8', '#c0c0c8', '#d8d8de'];

    function buildCrowns() {
      crowns = [];
      for (let i = 0; i < 120; i++) {
        crowns.push({
          x:       Math.random(),
          y:       Math.random(),
          r:       0.09 + Math.random() * 0.11,  // 9–20 % of canvas width
          hueBase: Math.random() * 360,
          phase:   Math.random() * Math.PI * 2,
          speed:   0.6 + Math.random() * 0.8,
        });
      }
    }

    // Draw one crown centered at (cx, cy) with pixel width = size.
    // Called inside whatever transform is currently active.
    function drawCrownAt(cx, cy, size) {
      const sc = size / 14; // SVG path x spans 6→20 = 14 units
      ctx.save();
      ctx.translate(cx - 13 * sc, cy - 13 * sc);
      ctx.scale(sc, sc);
      ctx.fill(CROWN_PATH);
      ctx.restore();
    }

    function drawFoil() {
      const w     = canvas.width;
      const h     = canvas.height;
      if (!w || !h) return; // element hidden or not yet laid out

      const angle = globalShimmer * Math.PI * 2;

      // ── Base ────────────────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = pattern === 'gold' ? '#c8b882' : '#e8e8ea';
      ctx.fillRect(0, 0, w, h);

      const gloss = ctx.createLinearGradient(0, 0, 0, h * 0.3);
      if (pattern === 'gold') {
        gloss.addColorStop(0, 'rgba(255,248,200,0.35)');
        gloss.addColorStop(1, 'rgba(240,220,140,0)');
      } else {
        gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
        gloss.addColorStop(1, 'rgba(255,255,255,0)');
      }
      ctx.fillStyle = gloss;
      ctx.fillRect(0, 0, w, h * 0.3);

      // ── Crown passes ─────────────────────────────────────────────────────
      if (pattern === 'random') {
        // Shimmer — crowns invisible until they catch the light
        ctx.globalCompositeOperation = 'screen';
        crowns.forEach(c => {
          const brightness = Math.max(0, Math.sin(angle * c.speed + c.phase));
          const hue = (c.hueBase + globalShimmer * 140) % 360;
          ctx.globalAlpha = Math.min(brightness * 1.1, 1);
          ctx.fillStyle   = `hsl(${hue}, 100%, 65%)`;
          drawCrownAt(c.x * w, c.y * h, c.r * w);
        });
        ctx.globalAlpha = 1;

      } else { // 'chess' / 'gold' — tight checkerboard, whole grid rotated 10°
        const ROT       = 10 * Math.PI / 180;
        const crownSize = w * 0.14;
        const cellSize  = w * 0.16;
        const numCols   = Math.ceil(w / cellSize) + 4;
        const numRows   = Math.ceil(h / cellSize) + 4;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(ROT);

        ctx.globalCompositeOperation = 'screen';
        let idx = 0;
        for (let row = -numRows; row <= numRows; row++) {
          for (let col = -numCols; col <= numCols; col++) {
            if ((row + col) % 2 !== 0) continue;
            const c          = crowns[idx++ % crowns.length];
            const wavePhase  = (col + row) * 0.13;
            const brightness = Math.pow(Math.abs(Math.sin(waveTime * Math.PI * 2 * 1.3 - wavePhase)), 3);
            if (pattern === 'gold') {
              const goldHue = 44 + (idx % 4) * 4; // 44–56°: gold → amber shimmer
              ctx.globalAlpha = brightness * 0.7;
              ctx.fillStyle   = `hsl(${goldHue}, 55%, 80%)`;
            } else {
              const hue = (c.hueBase + globalShimmer * 140) % 360;
              ctx.globalAlpha = brightness * 0.85;
              ctx.fillStyle   = `hsl(${hue}, 95%, 68%)`;
            }
            drawCrownAt(col * cellSize, row * cellSize, crownSize);
          }
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // ── Crown icon + text label ───────────────────────────────────────────
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      const crownSz = Math.round(32 * dpr);
      const gap     = Math.round(12 * dpr);
      const lh      = Math.round(24 * dpr);
      const blockH  = crownSz + gap + 3 * lh;
      const blockY  = Math.round((h - blockH) / 2);

      // Crown — drawn as Path2D (vector, crisp at any dpr)
      ctx.save();
      ctx.translate(Math.round((w - crownSz) / 2), blockY);
      ctx.scale(crownSz / 24, crownSz / 24);
      ctx.fillStyle = pattern === 'gold' ? '#6b4500' : '#333333';
      ctx.fill(CROWN_BODY);
      ctx.fillStyle = pattern === 'gold' ? 'rgba(100,60,0,0.45)' : 'rgba(0,0,0,0.55)';
      ctx.fill(CROWN_SHADE);
      ctx.restore();

      // Text label
      ctx.fillStyle = pattern === 'gold' ? 'rgba(80,50,0,0.55)' : 'rgba(0,0,0,0.48)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      try { ctx.letterSpacing = '-0.41px'; } catch (_) {}
      ctx.font = `600 ${Math.round(20 * dpr)}px ${FONT_STACK}`;
      const lines = pattern === 'gold'
        ? ['редкая', 'находка!']
        : ['тут', 'спрятан', 'подарок'];
      lines.forEach((line, i) => {
        ctx.fillText(line, w / 2, blockY + crownSz + gap + i * lh);
      });

      // Bottom hint — 11 px regular
      try { ctx.letterSpacing = '0px'; } catch (_) {}
      ctx.font = `400 ${Math.round(11 * dpr)}px ${FONT_STACK}`;
      ctx.fillText('сотри пальцем', w / 2, h - Math.round(30 * dpr));

      // ── Fine grain texture ────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.09;
      ctx.drawImage(noiseEl, 0, 0, w, h); // stretch 180×180 → canvas size → ~1–2 CSS px grain
      ctx.globalAlpha = 1;

      // ── Apply scratch mask ────────────────────────────────────────────────
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }

    function resize() {
      const rect = scratchWrap.getBoundingClientRect();
      const w    = Math.round(rect.width  * dpr);
      const h    = Math.round(rect.height * dpr);
      // iOS fires resize on scroll (toolbar hide/show) without changing card size — skip
      if (canvas.width === w && canvas.height === h) return;
      canvas.width  = w;
      canvas.height = h;
      mask.width    = w;
      mask.height   = h;
      pCanvas.width  = w;
      pCanvas.height = h;
      maskCtx.fillStyle = '#fff';
      maskCtx.fillRect(0, 0, w, h);
      drawFoil();
    }

    function eraseAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x    = (clientX - rect.left) * (mask.width  / rect.width);
      const y    = (clientY - rect.top)  * (mask.height / rect.height);
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.beginPath();
      maskCtx.arc(x, y, BRUSH_RADIUS * dpr, 0, Math.PI * 2);
      maskCtx.fill();
    }

    function scratchedRatio() {
      const step = 4;
      const { data } = maskCtx.getImageData(0, 0, mask.width, mask.height);
      let total = 0, cleared = 0;
      for (let i = 3; i < data.length; i += 4 * step) {
        total++;
        if (data[i] < 40) cleared++;
      }
      return total ? cleared / total : 0;
    }

    function reveal() {
      if (revealed) return;
      revealed = true;
      scratchWrap.classList.add('scratch--revealed');
      particles = [];
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      pendingHaptic = true;
      const prizeVideo = scratchWrap.querySelector('video.scratch__prize-logo');
      if (prizeVideo) prizeVideo.play();
      setTimeout(flyCheckToProfile, 1500);
    }

    function flyCheckToProfile() {
      const check  = scratchWrap.querySelector('.scratch__check');
      const avatar = document.getElementById('profileAvatar');
      if (!check || !avatar) return;

      const cr = check.getBoundingClientRect();
      const ar = avatar.getBoundingClientRect();

      // Flying dot — clone of the checkmark at its current screen position
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        position:     'fixed',
        left:         cr.left + 'px',
        top:          cr.top + 'px',
        width:        cr.width + 'px',
        height:       cr.height + 'px',
        borderRadius: '50%',
        background:   'rgba(48,209,88,0.92)',
        color:        '#fff',
        fontSize:     '16px',
        fontWeight:   '700',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        zIndex:       '999',
        pointerEvents: 'none',
        transition:   'left .5s cubic-bezier(.4,0,.5,1), top .5s cubic-bezier(.4,0,.5,1), transform .5s ease, opacity .35s ease .1s',
      });
      dot.textContent = '✓';
      document.body.appendChild(dot);

      // Fly to avatar center, shrink and fade out
      const tx = ar.left + ar.width  / 2 - cr.width  / 2;
      const ty = ar.top  + ar.height / 2 - cr.height / 2;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        dot.style.left      = tx + 'px';
        dot.style.top       = ty + 'px';
        dot.style.transform = 'scale(0.65)';
        dot.style.opacity   = '0';
      }));

      // Bump avatar when dot arrives
      setTimeout(() => {
        avatar.classList.add('avatar--bump');
        setTimeout(() => { avatar.classList.remove('avatar--bump'); dot.remove(); }, 500);
      }, 520);
    }

    function pointFromEvent(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function pointToSegment(x0, y0, x1, y1) {
      const dist  = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(1, Math.ceil(dist / (BRUSH_RADIUS * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        eraseAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      }
    }

    function spawnParticles(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const px = (clientX - rect.left) * dpr;
      const py = (clientY - rect.top)  * dpr;
      if (Math.random() > 0.5 && particles.length < 80) {
        particles.push({
          x:        px + (Math.random() - 0.5) * BRUSH_RADIUS * dpr * 1.2,
          y:        py + (Math.random() - 0.5) * BRUSH_RADIUS * dpr * 0.4,
          vx:       (Math.random() - 0.5) * 3.5 * dpr,
          vy:       -(0.8 + Math.random() * 2.5) * dpr,
          w:        (1.5 + Math.random() * 3) * dpr,
          h:        (0.6 + Math.random() * 1.0) * dpr,
          rot:      Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.3,
          opacity:  0.65 + Math.random() * 0.35,
          color:    DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)],
        });
      }
      if (!pRafId) pRafId = requestAnimationFrame(tickParticles);
    }

    function tickParticles() {
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
      particles = particles.filter(p => p.opacity > 0.02);
      particles.forEach(p => {
        p.vy      += 0.3 * dpr;  // gravity
        p.x       += p.vx;
        p.y       += p.vy;
        p.rot     += p.rotSpeed;
        p.opacity -= 0.028;
        pCtx.save();
        pCtx.globalAlpha = Math.max(0, p.opacity);
        pCtx.translate(p.x, p.y);
        pCtx.rotate(p.rot);
        pCtx.fillStyle = p.color;
        pCtx.beginPath();
        pCtx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.restore();
      });
      pRafId = particles.length > 0 ? requestAnimationFrame(tickParticles) : null;
    }

    // ── Onboarding hint swipe ─────────────────────────────────────────────────
    function runOnboarding() {
      // Fire when card reaches the centre band of the viewport
      const onboardObserver = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        onboardObserver.disconnect();
        setTimeout(startSwipe, 1000);
      }, { rootMargin: '-28% 0px', threshold: 0 });
      onboardObserver.observe(scratchWrap);

      function startSwipe() {
        if (revealed) return;

        // Allow manual touch to cancel the onboarding at any moment
        let cancelled = false;
        cancelOnboarding = () => { cancelled = true; };

        // Pre-compute points in CANVAS pixel space (no conversion needed each frame)
        const rect  = canvas.getBoundingClientRect();
        const sx    = mask.width  / rect.width;
        const sy    = mask.height / rect.height;
        const cx    = rect.width  * 0.50;
        const cy    = rect.height * 0.50;
        const halfW = rect.width  * 0.36;
        const amp   = rect.height * 0.13;
        const STEPS = 100;
        const PTS   = [];
        for (let i = 0; i <= STEPS; i++) {
          const t = i / STEPS;
          const e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
          PTS.push([
            (cx - halfW + e * halfW * 2) * sx,
            (cy + Math.sin(e * 3 * Math.PI * 2) * amp) * sy,
          ]);
        }

        // Stroke setup — draws a continuous line, not separate circles
        maskCtx.lineWidth  = 50 * dpr;
        maskCtx.lineCap    = 'round';
        maskCtx.lineJoin   = 'round';
        maskCtx.strokeStyle = '#000'; // alpha=1 is what matters for destination-out

        const TOTAL_MS = 950;
        const ptsPerMs = (STEPS + 1) / TOTAL_MS;
        let cursor  = 0;
        let startTs = null;

        function tick(ts) {
          if (revealed || cancelled) return;
          if (!startTs) startTs = ts;
          const target = Math.min(Math.ceil((ts - startTs) * ptsPerMs), PTS.length);

          if (target > cursor) {
            // Re-apply stroke props each tick — resize() resets canvas state on iOS scroll
            maskCtx.lineWidth  = 50 * dpr;
            maskCtx.lineCap    = 'round';
            maskCtx.lineJoin   = 'round';
            maskCtx.strokeStyle = '#000';
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.beginPath();
            // moveTo previous point so strokes connect between frames
            maskCtx.moveTo(PTS[Math.max(cursor - 1, 0)][0], PTS[Math.max(cursor - 1, 0)][1]);
            for (let i = Math.max(cursor, 1); i < target; i++) {
              maskCtx.lineTo(PTS[i][0], PTS[i][1]);
            }
            maskCtx.stroke();
            // First frame: also draw a dot at the very first point
            if (cursor === 0) {
              maskCtx.beginPath();
              maskCtx.arc(PTS[0][0], PTS[0][1], BRUSH_RADIUS * dpr, 0, Math.PI * 2);
              maskCtx.fill();
            }

            // Spawn debris particles along the newly drawn segment
            // PTS are in canvas px → convert back to client coords via dpr + fresh rect
            const fr = canvas.getBoundingClientRect();
            const step = Math.max(1, Math.floor((target - cursor) / 2));
            for (let i = cursor; i < target; i += step) {
              spawnParticles(
                PTS[i][0] / dpr + fr.left,
                PTS[i][1] / dpr + fr.top,
              );
            }

            cursor = target;
          }

          maskCtx.globalCompositeOperation = 'source-over';
          drawFoil();
          if (cursor < PTS.length) { requestAnimationFrame(tick); }
          else { setTimeout(restoreCard, 2000); }
        }
        requestAnimationFrame(tick);

        // Restore: wipe right→left (reverse of scratch direction)
        function restoreCard() {
          if (revealed || cancelled) return;

          // eraseAt() leaves maskCtx in destination-out — reset before drawing
          maskCtx.globalCompositeOperation = 'source-over';

          // Snapshot the scratched mask into an offscreen canvas
          const snap = document.createElement('canvas');
          snap.width = mask.width; snap.height = mask.height;
          snap.getContext('2d').drawImage(mask, 0, 0);

          const restoreDur = 1100;
          const feather    = mask.width * 0.14; // soft leading edge
          const r0 = performance.now();

          function restoreTick(ts) {
            if (revealed || cancelled) return;
            const t    = Math.min((ts - r0) / restoreDur, 1);
            const ease = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;

            // wipeX moves from mask.width → 0 (right to left)
            const wipeX = mask.width * (1 - ease);

            // Redraw snapshot each frame
            maskCtx.clearRect(0, 0, mask.width, mask.height);
            maskCtx.drawImage(snap, 0, 0);

            // Solid white fill from the wipe edge to the right
            maskCtx.fillStyle = '#fff';
            maskCtx.fillRect(wipeX + feather, 0, mask.width, mask.height);

            // Feathered leading edge
            const grad = maskCtx.createLinearGradient(wipeX, 0, wipeX + feather, 0);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(1, 'rgba(255,255,255,1)');
            maskCtx.fillStyle = grad;
            maskCtx.fillRect(wipeX, 0, feather, mask.height);

            drawFoil();
            if (t < 1) { requestAnimationFrame(restoreTick); }
            else {
              maskCtx.fillStyle = '#fff';
              maskCtx.fillRect(0, 0, mask.width, mask.height);
              drawFoil();
              cancelOnboarding = null; // onboarding fully done — no longer cancellable
            }
          }
          requestAnimationFrame(restoreTick);
        }
      }
    }

    function handleStart(e) {
      // Cancel any running onboarding animation and give the user a clean foil
      if (cancelOnboarding) {
        cancelOnboarding();
        cancelOnboarding = null;
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = '#fff';
        maskCtx.fillRect(0, 0, mask.width, mask.height);
      }
      pointerDown = true;
      hint.style.opacity = '0';
      const p = pointFromEvent(e);
      lastPoint = p;
      eraseAt(p.x, p.y);
      drawFoil();
    }

    function handleMove(e) {
      if (!pointerDown || revealed) return;
      e.preventDefault();
      const p = pointFromEvent(e);
      if (lastPoint) pointToSegment(lastPoint.x, lastPoint.y, p.x, p.y);
      else eraseAt(p.x, p.y);
      spawnParticles(p.x, p.y);
      lastPoint = p;
      drawFoil();
      if (scratchedRatio() > REVEAL_THRESHOLD) reveal();
    }

    function handleEnd() {
      if (pendingHaptic) {
        pendingHaptic = false;
        setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate([60, 80, 120]);
          scratchWrap.classList.add('scratch--prize-glow');
          const card = scratchWrap.closest('.card--scratch');
          if (card) card.classList.add('scratch--card-pop');
        }, 500);
      }
      pointerDown = false;
      lastPoint = null;
    }

    canvas.addEventListener('mousedown',  handleStart);
    window.addEventListener('mousemove',  handleMove);
    window.addEventListener('mouseup',    handleEnd);
    canvas.addEventListener('touchstart', handleStart, { passive: true });
    canvas.addEventListener('touchmove',  handleMove,  { passive: false });
    canvas.addEventListener('touchend',   handleEnd);

    buildCrowns();
    resize();
    if (autoScratch) runOnboarding();

    // iOS won't render video frame 0 until play() is called.
    // Play then immediately pause — decodes the first frame without actually playing.
    const prizeVid = scratchWrap.querySelector('video.scratch__prize-logo');
    if (prizeVid) prizeVid.play().then(() => { if (!revealed) prizeVid.pause(); }).catch(() => {});

    return {
      drawFoil,
      resize,
      get revealed() { return revealed; },
    };
  }

  // ─── Global scroll → shared shimmer ───────────────────────────────────────
  let ticking    = false;
  let prevScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const delta   = window.scrollY - prevScrollY;
      prevScrollY   = window.scrollY;
      globalShimmer = (window.scrollY * 0.0009) % 1;
      waveTime     += delta * 0.0009; // scroll drives wave too, via delta (no snap)
      activeCards.forEach(c => { if (!c.revealed) c.drawFoil(); });
      ticking = false;
    });
  }, { passive: true });

  // ─── Idle drift (~10 fps) ─────────────────────────────────────────────────
  let lastIdleTs = 0;
  function idleLoop(ts) {
    if (ts - lastIdleTs >= 100) {
      globalShimmer = (globalShimmer + 0.003) % 1;
      waveTime     += 0.003; // no wrap — keeps wave phase continuous
      activeCards.forEach(c => { if (!c.revealed) c.drawFoil(); });
      lastIdleTs = ts;
    }
    requestAnimationFrame(idleLoop);
  }

  window.addEventListener('resize', () => activeCards.forEach(c => c.resize()));

  // ─── Boot ─────────────────────────────────────────────────────────────────
  const c2 = initCard({ zoneId: 'scratchZone2', canvasId: 'scratchCanvas2', hintId: 'scratchHint2', pattern: 'chess', autoScratch: true });
  if (c2) activeCards.push(c2);

  requestAnimationFrame(idleLoop);

  // ─── Infinite feed ────────────────────────────────────────────────────────
  const HEART_SVG  = `<svg viewBox="0 0 24 24"><path d="M12 21C12 21 3 14.5 3 8.5A5.5 5.5 0 0 1 12 5.5 5.5 5.5 0 0 1 21 8.5C21 14.5 12 21 12 21Z"/></svg>`;
  const CROWN_IMG  = `<img class="crown" src="icons/crwon.svg">`;

  const SCRATCH_PROB    = 0.08;  // ~1 in 8 chance per card
  const SCRATCH_COOLDOWN = 5;   // min cards between two scratch cards
  const GOLD_EVERY      = 15;   // gold after every N silver scratch cards

  let productCursor    = 0;
  let cardsSinceScr    = 0;
  let scratchSeq       = 0;   // cycles prizes & patterns
  let nextScratchId    = 3;   // static HTML uses ID 2
  let silversSinceGold = 0;   // counts silver scratch cards since last gold

  function productCardHTML(p) {
    const bc = p.mod ? ` card__badge--${p.mod}` : '';
    return `<div class="card">
      <div class="card__top">
        <img class="card__img" src="${p.img}" alt="">
        <div class="card__badge${bc}">${p.badge}</div>
        <button class="card__heart">${HEART_SVG}</button>
      </div>
      <div class="card__info">
        <div class="card__price">${p.price} <span class="card__cashback">${CROWN_IMG} ${p.cb}</span></div>
        <div class="card__name">${p.name}</div>
        <div class="card__desc">${p.desc}</div>
      </div>
    </div>`;
  }

  function goldScratchCardHTML(id) {
    const gp = GOLD_PRIZES[Math.floor(Math.random() * GOLD_PRIZES.length)];
    return `<div class="card card--scratch card--scratch--gold" id="scratchCard${id}">
      <div class="card__top" id="scratchZone${id}">
        <div class="scratch__prize">
          <div class="scratch__prize-star">✦</div>
          <div class="scratch__prize-percent">${gp.amount}</div>
          <div class="scratch__prize-sub">${gp.sub}</div>
        </div>
        <div class="scratch__check">✓</div>
        <canvas class="scratch__canvas" id="scratchCanvas${id}"></canvas>
        <div class="scratch__hint" id="scratchHint${id}"></div>
      </div>
    </div>`;
  }

  function scratchCardHTML(id, prize) {
    return `<div class="card card--scratch" id="scratchCard${id}">
      <div class="card__top" id="scratchZone${id}">
        <div class="scratch__prize">
          <video class="scratch__prize-logo" src="images/crowen _smaller.mp4" loop muted playsinline></video>
          <div class="scratch__prize-percent">${prize.percent}</div>
          <div class="scratch__prize-title">${prize.title}</div>
          <div class="scratch__prize-sub">${prize.sub}</div>
        </div>
        <div class="scratch__check">✓</div>
        <canvas class="scratch__canvas" id="scratchCanvas${id}"></canvas>
        <div class="scratch__hint" id="scratchHint${id}"></div>
      </div>
    </div>`;
  }

  function appendBatch(n) {
    const feed     = document.getElementById('feed');
    const sentinel = document.getElementById('feed-sentinel');
    const tmp      = document.createElement('div');
    const newScr   = [];

    for (let i = 0; i < n; i++) {
      cardsSinceScr++;

      const doScratch = cardsSinceScr > SCRATCH_COOLDOWN && Math.random() < SCRATCH_PROB;

      if (doScratch) {
        const isGold = silversSinceGold >= GOLD_EVERY;
        if (isGold) {
          // ── rare gold scratch card (every 15th silver) ──
          const id = nextScratchId++;
          tmp.innerHTML = goldScratchCardHTML(id);
          feed.insertBefore(tmp.firstElementChild, sentinel);
          newScr.push({ id, pattern: 'gold' });
          silversSinceGold = 0;
        } else {
          // ── regular scratch card ──
          const id      = nextScratchId++;
          const prize   = PRIZES[scratchSeq % PRIZES.length];
          scratchSeq++;
          tmp.innerHTML = scratchCardHTML(id, prize);
          feed.insertBefore(tmp.firstElementChild, sentinel);
          newScr.push({ id, pattern: 'chess' });
          silversSinceGold++;
        }
        cardsSinceScr = 0;
      } else {
        // ── product card ──
        tmp.innerHTML = productCardHTML(PRODUCTS[productCursor++ % PRODUCTS.length]);
        feed.insertBefore(tmp.firstElementChild, sentinel);
      }
    }

    // Init canvas for new scratch cards after they're in the DOM
    newScr.forEach(({ id, pattern }) => {
      const c = initCard({
        zoneId:   `scratchZone${id}`,
        canvasId: `scratchCanvas${id}`,
        hintId:   `scratchHint${id}`,
        pattern,
      });
      if (c) activeCards.push(c);
    });
  }

  // Sentinel div — IntersectionObserver fires when it enters the viewport
  const sentinel = document.createElement('div');
  sentinel.id            = 'feed-sentinel';
  sentinel.style.gridColumn = '1 / -1';
  sentinel.style.height  = '1px';
  document.getElementById('feed').appendChild(sentinel);

  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) appendBatch(10);
  }, { rootMargin: '600px' }).observe(sentinel);

})();
