/* ═══════════════════════════════════════════════════
   Feed — реестр компонентов ленты.

   Использование:
     Feed.mount(config, container)
   где config — массив блоков вида { type: 'offer', ... }.
   Новый тип блока = Feed.register('тип', renderFn).
   ═══════════════════════════════════════════════════ */

const Feed = (() => {

  /* ── Иконки (из макетов Figma) ─────────────────── */
  const ICONS = {
    // корона 12px (бейдж кино-карточки)
    crown12: `<svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><path d="M6 1.50075L7.71375 5.4735L11.25 3.381L9.759 9.00525C9.70561 9.22018 9.58097 9.41068 9.40539 9.54567C9.22982 9.68065 9.01368 9.75215 8.79225 9.7485H3.20775C2.98719 9.7486 2.77279 9.67577 2.59794 9.54134C2.42308 9.4069 2.29759 9.21843 2.241 9.00525L0.75 3.38025L4.284 5.47275L6 1.50075Z" fill="#333333"/></svg>`,
    // корона 16px (hero-карточка)
    crown16: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.001L10.285 7.298L15 4.508L13.012 12.007C12.9408 12.2936 12.7746 12.5476 12.5405 12.7276C12.3064 12.9075 12.0182 13.0029 11.723 12.998H4.277C3.98292 12.9981 3.69705 12.901 3.46391 12.7218C3.23077 12.5425 3.06345 12.2912 2.988 12.007L1 4.507L5.712 7.297L8 2.001Z" fill="#333333"/></svg>`,
    // корона 10px (кэшбэк товара)
    crown10: `<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><path d="M5 1.25062L6.42812 4.56125L9.375 2.8175L8.1325 7.50438C8.08801 7.68349 7.98414 7.84224 7.83783 7.95472C7.69152 8.06721 7.5114 8.12679 7.32687 8.12375H2.67312C2.48933 8.12384 2.31066 8.06314 2.16495 7.95111C2.01923 7.83909 1.91466 7.68202 1.8675 7.50438L0.625 2.81688L3.57 4.56063L5 1.25062Z" fill="#333333"/></svg>`,
    // корона 14px (чип кэшбэка тревел-карточки, макет 65:871)
    crown14: `<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><path d="M7 1.75087L8.99937 6.38575L13.125 3.9445L11.3855 10.5061C11.3232 10.7569 11.1778 10.9791 10.973 11.1366C10.7681 11.2941 10.516 11.3775 10.2576 11.3733H3.74237C3.48506 11.3734 3.23492 11.2884 3.03092 11.1316C2.82692 10.9747 2.68052 10.7548 2.6145 10.5061L0.875 3.94362L4.998 6.38487L7 1.75087Z" fill="#333333"/></svg>`,
    // огонёк 9×11 (чип «Горящий», макет 65:733)
    fire: `<svg viewBox="0 0 9.17203 11.0778" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M1.86387 3.83392C2.91621 2.88854 3.9312 1.9767 3.43949 0C6.55411 1.63847 9.38544 4.21166 9.15934 7.14655C9.07664 8.22456 8.68144 9.02917 8.15183 9.6259C8.15275 9.5819 8.15284 9.5432 8.15207 9.5117C8.15207 7.76822 5.61083 6.23501 5.61083 6.23501C5.61083 6.23501 3.05702 7.56477 3.05702 9.5117C3.05702 10.1185 3.29884 10.6537 3.6779 11.0778C2.27802 10.6784 0.0199124 9.5217 0.000142387 7.14655C-0.0133876 5.52039 0.939652 4.66422 1.86387 3.83392Z" fill="url(#fc-fire-grad)"/><defs><linearGradient id="fc-fire-grad" x1="6.3478" y1="-0.075" x2="3.01328" y2="11.0093" gradientUnits="userSpaceOnUse"><stop stop-color="black"/><stop offset="1" stop-color="black" stop-opacity="0.51"/></linearGradient></defs></svg>`,
    // звезда 16px (рейтинг)
    star16: `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3.684 14.275L4.82317 9.36451L1.0105 6.05901L6.04166 5.62651L8 0.994507L9.95833 5.62651L14.9895 6.05901L11.1768 9.36451L12.316 14.275L8 11.6682L3.684 14.275Z" fill="#000000"/></svg>`,
    // маски-театр 22×18 (аватар офера, белый)
    theater: `<svg viewBox="0 0 22 18" xmlns="http://www.w3.org/2000/svg"><path opacity="0.4" fill-rule="evenodd" clip-rule="evenodd" d="M10.1401 15.7868L11.3323 15.1109C13.6585 13.7921 15.172 11.3982 15.3658 8.73116L15.8548 2H22.0001L21.3891 9.76393C21.1806 12.4127 19.6706 14.7852 17.3592 16.0956L14.0001 18L10.641 16.0956C10.4696 15.9984 10.3025 15.8954 10.1401 15.7868Z" fill="#fff"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H16L15.3657 8.73116C15.1719 11.3982 13.6584 13.7921 11.3322 15.1109L8 17L4.6678 15.1109C2.34157 13.7921 0.828074 11.3982 0.634315 8.73116L0 0ZM5.47132 11.3927C5.1727 11.1439 5.00004 10.7752 5.00004 10.3865C5.00004 10.1842 5.18173 10.0303 5.38131 10.0635L6.11352 10.1856C7.36258 10.3938 8.63749 10.3938 9.88656 10.1856L10.6188 10.0635C10.8184 10.0303 11 10.1842 11 10.3865C11 10.7752 10.8274 11.1439 10.5288 11.3927L9.71491 12.0709C8.72152 12.8988 7.27856 12.8988 6.28516 12.0709L5.47132 11.3927ZM3.00004 6.14947C3.00004 5.51463 3.51467 5 4.14951 5H4.26911C4.71707 5 5.12659 5.25309 5.32692 5.65376C5.41411 5.82814 5.31162 6.03768 5.12045 6.07592L3.34376 6.43125C3.16594 6.46682 3.00004 6.33081 3.00004 6.14947ZM11.8505 5C12.4853 5 13 5.5147 12.9999 6.14955C12.9998 6.33086 12.8339 6.46683 12.6562 6.43126L10.8796 6.07592C10.6884 6.03769 10.586 5.82814 10.6732 5.65377C10.8735 5.2531 11.283 5 11.731 5H11.8505Z" fill="#fff"/></svg>`,
  };

  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /* Простая шапка секции: заголовок + «Все» */
  const sectionHeader = b => `
    <div class="fc-section-header">
      <h2>${esc(b.header)}</h2>
      ${b.link !== false ? `<a class="fc-all-link" href="${esc(b.linkHref || '#')}">${esc(b.linkText || 'Все')}</a>` : ''}
    </div>`;

  /* tui-шапка: caption? + заголовок + подзаголовок? + аватар? */
  const tuiHeader = b => `
    <div class="fc-tui-header">
      <div class="fc-texts">
        ${b.caption ? `<div class="fc-caption fc-fade-text">${esc(b.caption)}</div>` : ''}
        <div class="fc-title">${esc(b.header)}</div>
        ${b.subheader ? `<div class="fc-subtitle">${esc(b.subheader)}</div>` : ''}
      </div>
      ${b.avatar ? `<img class="fc-avatar" src="${esc(b.avatar)}" alt="">` : ''}
    </div>`;

  /* ── Реестр ────────────────────────────────────── */
  const renderers = {};
  const register = (type, fn) => { renderers[type] = fn; };

  /* ═══ offer — баннер-предложение ═══ */
  register('offer', b => el(`
    <section class="fc-offer">
      <div class="fc-card">
        <div class="fc-banner" style="background:${esc(b.color || '#2b0c91')}">
          ${b.img ? `<img src="${esc(b.img)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">` : ''}
          <div class="fc-banner-text">
            <div class="fc-banner-title">${esc(b.title)}</div>
            ${(b.lines || []).map(l => `<div class="fc-banner-line">${esc(l)}</div>`).join('')}
          </div>
        </div>
        <div class="fc-cell">
          <div class="fc-cell-avatar" style="background:${esc(b.brand?.color || '#d45d8c')}">
            ${b.brand?.avatar ? `<img src="${esc(b.brand.avatar)}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : ICONS.theater}
          </div>
          <div class="fc-cell-texts">
            <div class="fc-cell-name">${esc(b.brand?.name || '')}</div>
            <div class="fc-cell-desc fc-fade-text">${esc(b.brand?.desc || '')}</div>
          </div>
        </div>
      </div>
    </section>`));

  /* ═══ activities — брендовые карточки 140×196 ═══ */
  register('activities', b => el(`
    <section class="fc-activities">
      ${tuiHeader(b)}
      <div class="fc-scroller">
        ${(b.cards || []).map(c => `
          <div class="fc-brand-card" style="background:${esc(c.color || '#eae1ff')}">
            ${c.img ? `<img src="${esc(c.img)}" alt="">` : ''}
            <div class="fc-texts">
              <div class="fc-title">${esc(c.title)}</div>
              ${(c.lines || []).map(l => `<div class="fc-line">${esc(l)}</div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>`));

  /* Позиции аватаров CTA-карточки «Идеи на выходные» (макет 61:1208,
     версия 80px): смещения центров кружков от центра карточки 343×428 */
  const CTA_AVA_POS = [
    [0.5, -151], [100.5, -115], [153.5, -23], [134.5, 82],
    [53.5, 150], [-52.5, 150], [-134.5, 82], [-152.5, -23],
    [-99.5, -115],
    [-0.5, -249], [95.5, -230], [176.5, -176], [176.5, 177],
    [95.5, 231], [-0.5, 250], [-95.5, 231], [-176.5, 177],
    [-176.5, -176], [-95.5, -230],
  ];

  /* ═══ heroCarousel — большие карточки 343×428 с параллаксом ═══ */
  register('heroCarousel', b => el(`
    <section class="fc-hero${b.scrollDrift ? ' fc-hero--drift' : ''}">
      ${sectionHeader(b)}
      <div class="fc-scroller fc-scroller--center" data-parallax data-start-index="${b.startIndex ?? 1}">
        ${(b.items || []).map(m => `
          <div class="fc-snap">
            <article class="fc-hero-card fc-par-box">
              <img src="${esc(m.img)}" alt="${esc(m.title)}" loading="lazy">
              <div class="fc-shade"></div>
              <div class="fc-chip">${esc(m.category)}</div>
              <div class="fc-content">
                <div class="fc-texts">
                  <div class="fc-title">${m.title.split('\n').map(esc).join('<br>')}</div>
                  <div class="fc-desc">${esc(m.desc)}</div>
                </div>
                <div class="fc-actions">
                  <button class="fc-btn-buy" type="button">${esc(m.button || 'Купить билет')}</button>
                  <div class="fc-cashback">${ICONS.crown16}<span>${esc(m.cashback)}</span></div>
                </div>
              </div>
            </article>
          </div>`).join('')}
        ${b.moreCard ? `
          <div class="fc-snap fc-snap--under">
            <article class="fc-cta-card">
              ${(b.moreCard.avatars || []).map((src, i) => {
                const p = CTA_AVA_POS[i % CTA_AVA_POS.length];
                return `<img class="fc-cta-ava" data-dx="${p[0]}" data-dy="${p[1]}" style="left:calc(50% + ${p[0]}px);top:calc(50% + ${p[1]}px)" src="${esc(src)}" alt="" loading="lazy">`;
              }).join('')}
              <div class="fc-cta-content">
                <div class="fc-cta-texts">
                  <div class="fc-cta-title">${b.moreCard.title.split('\n').map(esc).join('<br>')}</div>
                  <div class="fc-cta-desc">${b.moreCard.desc.split('\n').map(esc).join('<br>')}</div>
                </div>
                <button class="fc-cta-button" type="button">${esc(b.moreCard.button || 'Все события')}</button>
              </div>
              ${b.moreCard.img ? `<img class="fc-cta-img" src="${esc(b.moreCard.img)}" alt="">` : ''}
            </article>
          </div>` : ''}
      </div>
    </section>`));

  /* ═══ posterCarousel — карточки 230×345 с параллаксом ═══
     item: { img, category, cashback, rows: [{text, style}] }
     style строки: strong | normal | muted | muted-strong | rating */
  register('posterCarousel', b => el(`
    <section class="fc-posters">
      ${sectionHeader(b)}
      <div class="fc-scroller" data-parallax>
        ${(b.items || []).map(m => `
          <article class="fc-poster-card">
            <div class="fc-par-box">
              <img src="${esc(m.img)}" alt="" loading="lazy">
              <div class="fc-chip">${esc(m.category)}</div>
              <div class="fc-badge">${ICONS.crown12}<span>${esc(m.cashback)}</span></div>
            </div>
            <div class="fc-info">
              ${(m.rows || []).map(r => r.style === 'rating'
                ? `<div class="fc-rating">${ICONS.star16}<span>${esc(r.text)}</span></div>`
                : `<div class="fc-row${r.style && r.style !== 'normal' ? '-' + r.style : ''}">${esc(r.text)}</div>`).join('')}
            </div>
          </article>`).join('')}
      </div>
    </section>`));

  /* ═══ productGrid — товарная сетка 2×N + кнопка ═══ */
  register('productGrid', b => el(`
    <section class="fc-products">
      ${tuiHeader(b)}
      <div class="fc-grid">
        ${(b.products || []).map(p => `
          <article class="fc-product-card">
            <div class="fc-photo">
              <img class="fc-product-img" src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
              ${b.avatar ? `<img class="fc-avatar" src="${esc(b.avatar)}" alt="">` : ''}
              <button class="fc-fav" type="button" aria-label="В избранное"><img src="feed/assets/heart.svg" alt=""></button>
              <img class="fc-dots" src="feed/assets/pagination.svg" alt="">
            </div>
            <div class="fc-item-info">
              <div class="fc-price-block">
                <div class="fc-sale">
                  <span class="fc-old-price">${esc(p.oldPrice)}</span>
                  <span class="fc-discount">${esc(p.discount)}</span>
                </div>
                <div class="fc-price-row">
                  <span class="fc-price">${esc(p.price)}</span>
                  <span class="fc-mini-cashback">${ICONS.crown10}<span>${esc(p.cashback)}</span></span>
                </div>
              </div>
              <div class="fc-name-block">
                <div class="fc-name">${esc(p.name)}</div>
                <div class="fc-kind">${esc(p.kind)}</div>
              </div>
            </div>
          </article>`).join('')}
      </div>
      ${b.moreButton ? `<div class="fc-more"><button type="button">${esc(b.moreButton)}</button></div>` : ''}
    </section>`));

  /* ── Параллакс ─────────────────────────────────────
     Внутри каждого .fc-scroller[data-parallax] картинка
     .fc-par-box > img отстаёт от своей карточки. */
  function initParallax(root = document) {
    const SHIFT = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--parallax-shift')
    ) || 42;

    root.querySelectorAll('.fc-scroller[data-parallax]').forEach(scroller => {
      if (scroller.dataset.parallaxReady) return;
      scroller.dataset.parallaxReady = '1';

      const boxes = Array.from(scroller.querySelectorAll('.fc-par-box'));
      if (!boxes.length) return;

      // в режиме «центр» боковые карточки чуть меньше центральной
      const centerMode = scroller.classList.contains('fc-scroller--center');
      const SIDE_SHRINK = 0.06;

      let ticking = false;

      // позиции карточек в контенте скроллера до применения transform
      const scrollerRect0 = scroller.getBoundingClientRect();
      const layoutCenters = boxes.map(box => {
        const r = box.getBoundingClientRect();
        return r.left + r.width / 2 - scrollerRect0.left + scroller.scrollLeft;
      });

      // CTA-карточка прячется под последней и остаётся на месте при свайпе
      const cta = scroller.querySelector('.fc-cta-card');
      const ctaAvas = cta ? Array.from(cta.querySelectorAll('.fc-cta-ava')) : [];
      // раскрытие CTA: масштаб карточки 90% → 100%,
      // аватары слегка съезжаются к центру и встают на места
      const CTA_SCALE_FROM = 0.9;
      const CTA_AVA_PULL = 0.18; // доля пути от центра в свёрнутом состоянии

      function update() {
        ticking = false;
        const viewW = scroller.clientWidth;
        const boxW = boxes[0].offsetWidth;
        const halfSpan = (viewW + boxW) / 2;
        // шаг сетки карточек (ширина + gap) — для компенсации зазоров
        const step = boxes.length > 1 ? layoutCenters[1] - layoutCenters[0] : boxW;

        const maxScroll = scroller.scrollWidth - viewW;

        boxes.forEach((box, i) => {
          // rel — удаление от снап-позиции карточки; позиция зажата
          // границами скролла, поэтому первая и последняя карточки
          // у края считаются «в фокусе» (rel = 0) и стоят в полный размер
          // последняя карточка перед CTA снапится к правому краю (16px)
          const snapTarget = (cta && i === boxes.length - 1)
            ? layoutCenters[i] + boxW / 2 + 16 - viewW
            : layoutCenters[i] - viewW / 2;
          const snap = Math.max(0, Math.min(maxScroll, snapTarget));
          let rel = (snap - scroller.scrollLeft) / halfSpan;
          rel = Math.max(-1, Math.min(1, rel));
          box.firstElementChild.style.transform = `translateX(${(-rel * SHIFT).toFixed(2)}px)`;
          if (centerMode) {
            const scale = 1 - SIDE_SHRINK * Math.abs(rel);
            // сдвиг к центру: держит визуальный зазор между карточками = gap
            const shift = -Math.sign(rel) * SIDE_SHRINK * boxW * halfSpan * rel * rel / (2 * step);
            box.style.transform = `translateX(${shift.toFixed(2)}px) scale(${scale.toFixed(4)})`;
          }
        });

        if (cta) {
          // позиционирование CTA целиком на position: sticky;
          // JS только прячет её, пока последняя карточка сверху
          // (иначе CTA выглядывала бы из-под уменьшенной карточки)
          const lastCenter = layoutCenters[layoutCenters.length - 1];
          const lastSnap = Math.max(0, Math.min(maxScroll, lastCenter + boxW / 2 + 16 - viewW));
          cta.style.visibility = scroller.scrollLeft >= lastSnap - 40 ? '' : 'hidden';

          // прогресс раскрытия: 0 — последняя карточка на месте, 1 — смахнута
          const span = maxScroll - lastSnap;
          let p = span > 0 ? (scroller.scrollLeft - lastSnap) / span : 1;
          p = Math.max(0, Math.min(1, p));
          cta.style.transform = `scale(${(CTA_SCALE_FROM + (1 - CTA_SCALE_FROM) * p).toFixed(4)})`;
          const pull = CTA_AVA_PULL * (1 - p);
          for (const ava of ctaAvas) {
            ava.style.transform =
              `translate(${(-ava.dataset.dx * pull).toFixed(2)}px, ${(-ava.dataset.dy * pull).toFixed(2)}px)`;
          }
        }
      }

      // стартовая карточка — по центру экрана, без анимации
      function scrollToStart() {
        const idx = parseInt(scroller.dataset.startIndex || '0', 10);
        const target = boxes[idx];
        if (!target) return;
        const tr = target.getBoundingClientRect();
        const sr = scroller.getBoundingClientRect();
        scroller.scrollLeft += (tr.left + tr.width / 2) - (sr.left + sr.width / 2);
      }

      function onScroll() {
        // в фоновой вкладке rAF заморожен — считаем сразу
        if (document.hidden) { update(); return; }
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }

      scroller.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      document.addEventListener('visibilitychange', update);
      window.addEventListener('pageshow', update);
      if (scroller.dataset.startIndex) scrollToStart();
      update();

      /* ── Режим drift: страница скроллится как обычно, а карусель
         слегка подъезжает горизонтально — намёк, что её можно листать ── */
      const driftSection = scroller.closest('.fc-hero--drift');
      if (driftSection) {
        const DRIFT = 0.5; // px карусели на px скролла страницы

        const maxScrollX = () => scroller.scrollWidth - scroller.clientWidth;

        // снап-позиции карточек (те же, что в расчёте rel) + конец (CTA)
        function snapPoints() {
          const viewW = scroller.clientWidth;
          const boxW = boxes[0].offsetWidth;
          const max = maxScrollX();
          const pts = layoutCenters.map((c, i) => {
            const target = (cta && i === boxes.length - 1)
              ? c + boxW / 2 + 16 - viewW
              : c - viewW / 2;
            return Math.max(0, Math.min(max, target));
          });
          if (cta) pts.push(max);
          return pts;
        }

        let lastY = window.scrollY;
        let idleTimer = 0;

        function settle() {
          // плавная доводка к ближайшему снапу, потом вернуть нативный снап
          const p = scroller.scrollLeft;
          const nearest = snapPoints()
            .reduce((a, b) => Math.abs(b - p) < Math.abs(a - p) ? b : a);
          if (Math.abs(nearest - p) > 1) {
            scroller.scrollTo({ left: nearest, behavior: 'smooth' });
          }
          setTimeout(() => { scroller.style.scrollSnapType = ''; }, 400);
        }

        function onPageScroll() {
          const y = window.scrollY;
          const dy = y - lastY;
          lastY = y;
          const rect = driftSection.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight || dy === 0) return;
          // на время дрейфа отключаем нативный снап, иначе он съест сдвиг
          scroller.style.scrollSnapType = 'none';
          scroller.scrollLeft = Math.max(0, Math.min(maxScrollX(),
            scroller.scrollLeft + dy * DRIFT));
          clearTimeout(idleTimer);
          idleTimer = setTimeout(settle, 160);
        }

        window.addEventListener('scroll', onPageScroll, { passive: true });
      }
    });
  }

  /* ═══ travelTicket — «посадочный талон» с направлениями ═══
     Полноширинная лента-билет (макет 65:871): фото направления на весь
     блок, компактная следующая карточка справа. Свайп раскрывает её на
     весь экран, на её место въезжает новая. При скролле страницы жёлтый
     талон «отрывается» по перфорации и блок разворачивается. */
  register('travelTicket', b => el(`
    <section class="fc-trip fc-trip--${b.bgMode === 'reveal' ? 'reveal' : 'scale'}">
      ${b.header ? sectionHeader(b) : ''}
      <div class="fc-trip-band">
        <div class="fc-trip-canvas">
          <div class="fc-trip-hero">
            <div class="fc-trip-bgwrap"><img class="fc-trip-bg" alt=""></div>
            <div class="fc-trip-shade"></div>
            <div class="fc-trip-col"></div>
          </div>
          <div class="fc-trip-card" data-role="next">
            <img alt=""><div class="fc-trip-shade fc-trip-shade--card"></div>
            <div class="fc-trip-col"></div>
          </div>
          <div class="fc-trip-card" data-role="incoming">
            <img alt=""><div class="fc-trip-shade fc-trip-shade--card"></div>
            <div class="fc-trip-col"></div>
          </div>
          <div class="fc-trip-scroller">
            ${(b.items || []).map(() => `<div class="fc-trip-slot"></div>`).join('')}
          </div>
        </div>
      </div>
      <img class="fc-trip-perf fc-trip-perf--t" src="feed/assets/travel/perf-edge.svg" alt="">
      <img class="fc-trip-perf fc-trip-perf--b" src="feed/assets/travel/perf-edge.svg" alt="">
    </section>`));

  function initTravelTicket(root = document) {
    root.querySelectorAll('.fc-trip').forEach(section => {
      const block = section.__fcData || {};
      const items = block.items || [];
      if (!items.length) return;

      const band = section.querySelector('.fc-trip-band');
      const canvas = section.querySelector('.fc-trip-canvas');
      const scroller = section.querySelector('.fc-trip-scroller');
      /* Все фото декодируем заранее: при подстановке новой карточки
         меняется src, и недекодированная картинка даёт вспышку
         предыдущего кадра поверх блока (заметно в Chrome). */
      for (const it of items) {
        const im = new Image();
        im.src = it.img;
        if (im.decode) im.decode().catch(() => {});
      }

      /* Всё, что идёт под блоком, собираем в один слой: его поднимает
         трансформ, пока билет свёрнут, — так лента не разъезжается,
         а раскладка при скролле не пересчитывается */
      let below = null;
      if (section.nextElementSibling) {
        below = document.createElement('div');
        below.className = 'fc-trip-below';
        section.after(below);
        while (below.nextElementSibling) below.append(below.nextElementSibling);
      }

      const hero = section.querySelector('.fc-trip-hero');
      const bgwrap = section.querySelector('.fc-trip-bgwrap');
      const bg = section.querySelector('.fc-trip-bg');
      const heroShade = hero.querySelector('.fc-trip-shade');
      const heroCol = section.querySelector('.fc-trip-hero .fc-trip-col');
      const next = section.querySelector('[data-role="next"]');
      const incoming = section.querySelector('[data-role="incoming"]');

      const chipHtml = it =>
        `<div class="fc-trip-chip">${ICONS.crown14}<span>${esc(it.cashback)}</span></div>`;
      const textsHtml = (it, withHot) => `
        <div class="fc-trip-texts">
          ${withHot && it.hot ? `<div class="fc-trip-hot">${ICONS.fire}<span>Горящий</span></div>` : ''}
          <div class="fc-trip-name">${esc(it.title)}</div>
          <div class="fc-trip-price-col">
            <div class="fc-trip-price-row">
              <span class="fc-trip-price">${esc(it.price)}</span>
              ${it.oldPrice ? `<span class="fc-trip-old">${esc(it.oldPrice)}</span>` : ''}
            </div>
            <div class="fc-trip-meta">${esc(it.meta)}</div>
          </div>
        </div>`;

      /* Финальная карточка-переход в сервис (макет 77:3524):
         фото на весь фон, контент по центру у нижнего края */
      const ctaHtml = it => `
        <div class="fc-trip-cta">
          <div class="fc-trip-cta-title">${it.title.split('\n').map(esc).join('<br>')}</div>
          ${it.desc ? `<div class="fc-trip-cta-desc">${esc(it.desc)}</div>` : ''}
          <button class="fc-trip-cta-button" type="button">${esc(it.button || 'Смотреть')}</button>
        </div>`;

      const fillCol = (col, it, withHot) => {
        col.classList.toggle('fc-trip-col--cta', !!it.cta);
        col.innerHTML = it.cta ? ctaHtml(it) : chipHtml(it) + textsHtml(it, withHot);
      };
      const fillCard = (card, it) => {
        card.querySelector('img').src = it.img;
        // у карточки-перехода фон чистый, без затемнения (макет 77:3524)
        card.querySelector('.fc-trip-shade').style.display = it.cta ? 'none' : '';
        fillCol(card.querySelector('.fc-trip-col'), it, true);
      };

      /* Два режима фона (block.bgMode):
         scale  — изображение растёт вместе с карточкой (по умолчанию);
         reveal — изображение прибито к блоку, карточка лишь окно.
         Текст и бейджи в обоих случаях — отдельный слой, который
         стоит на своей линии и едет только по горизонтали. */
      const revealMode = block.bgMode === 'reveal';
      const glue = (card, left, top, W, H, cardH) => {
        // фон карточки тоже отъезжает вместе с раскрытием блока
        card.querySelector('img').style.transform = `scale(${revealScale.toFixed(4)})`;
        if (!revealMode) {
          // градиент тянется от 126px (компактная) до 166px (герой) —
          // иначе на подстановке нового героя он прыгал бы
          const k = (cardH - 280) / (H - 280);
          card.querySelector('.fc-trip-shade').style.height =
            (126 + 40 * Math.min(1, Math.max(0, k))).toFixed(1) + 'px';
        }
        if (revealMode) {
          const dx = (-left).toFixed(1);
          const img = card.querySelector('img');
          img.style.width = W + 'px';
          img.style.height = H + 'px';
          img.style.transform = `translate(${dx}px, ${(-top).toFixed(1)}px)`;
          const sh = card.querySelector('.fc-trip-shade');
          sh.style.width = W + 'px';
          sh.style.height = '166px';
          sh.style.transform = `translate(${dx}px, ${(cardH - 166).toFixed(1)}px)`;
        }
        // контент стоит на своей линии в блоке независимо от того,
        // где сейчас карточка: компенсируем её вертикальный сдвиг
        card.querySelector('.fc-trip-col').style.transform =
          `translateY(${(-top).toFixed(1)}px)`;
      };

      let heroIdx = -1, nextIdx = -1, incIdx = -1;
      /* Пока блок сложен, фон показан крупнее и по мере раскрытия
         приходит к обычному масштабу — кадр как будто отъезжает. */
      const REVEAL_ZOOM = 0.14;
      let revealScale = 1 + REVEAL_ZOOM;
      /* Боковые карточки прячутся за правым краем, пока блок
         раскрывается, и выезжают на последней пятой части. */
      const SIDE_FROM = 0.8;
      let revealE = 0;

      /* Размеры канвы кэшируем: она фиксированной высоты и не зависит
         от высоты блока. Читать их каждый кадр — значит заставлять
         браузер пересчитывать раскладку сразу после записи height,
         отчего раскрытие дёргается. */
      let W = 0, H = 0;
      function measure() {
        W = scroller.clientWidth;
        H = canvas.clientHeight;
      }
      measure();

      /* ── карусель: расширение следующей карточки ── */
      function update() {
        tickingX = false;
        if (!W) { measure(); if (!W) return; }
        const p = Math.max(0, scroller.scrollLeft / W);
        const i = Math.min(items.length - 1, Math.floor(p + 1e-4));
        const t = Math.min(1, Math.max(0, p - i));

        if (heroIdx !== i) {
          heroIdx = i;
          bg.src = items[i].img;
          heroShade.style.display = items[i].cta ? 'none' : '';
          fillCol(heroCol, items[i], true);
        }
        // контент карточки-перехода держит ширину блока: иначе при
        // раскрытии строки перекомпоновываются и текст скачет
        for (const c of [heroCol, next.querySelector('.fc-trip-col'), incoming.querySelector('.fc-trip-col')]) {
          if (c.classList.contains('fc-trip-col--cta')) c.style.width = W + 'px';
          else c.style.width = '';
        }
        /* Текущая карточка чуть уезжает влево под наезжающую — лёгкий
           параллакс. Фон при этом подрастает ровно на величину сдвига
           (origin слева), чтобы справа не открывалась пустая полоса
           в углах, куда наезжающая карточка ещё не достаёт. */
        // текст и бейджи проявляются на последней пятой раскрытия
        const sideIn = Math.min(1, Math.max(0, (revealE - SIDE_FROM) / (1 - SIDE_FROM)));
        heroCol.style.opacity = sideIn.toFixed(3);

        const shift = W * 0.18 * t;
        const zoom = 1 + 0.18 * t;
        bg.style.transform =
          `translateX(${(-shift).toFixed(1)}px) scale(${(zoom * revealScale).toFixed(4)})`;
        heroShade.style.transform = `translateX(${(-shift).toFixed(1)}px) scaleX(${zoom.toFixed(4)})`;
        heroCol.style.transform = `translateX(${(-shift).toFixed(1)}px)`;

        // выезд боковых карточек по мере раскрытия блока
        const parkRight = l => l + (W + 16 - l) * (1 - sideIn);

        const nx = items[i + 1];
        next.style.display = nx ? '' : 'none';
        if (nx) {
          if (nextIdx !== i + 1) { nextIdx = i + 1; fillCard(next, nx); }
          const left = parkRight((W - 70) * (1 - t));
          const top = 40 * (1 - t);
          const w = 232 + (W - 232) * t;
          const h = 280 + (H - 280) * t;
          next.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px)`;
          next.style.width = w.toFixed(1) + 'px';
          next.style.height = h.toFixed(1) + 'px';
          next.style.borderRadius = (26 * (1 - t)).toFixed(1) + 'px';
          glue(next, left, top, W, H, h);
        }

        const inc = items[i + 2];
        const IN_FROM = 0.55;
        incoming.style.display = inc && t > 0.05 ? '' : 'none';
        if (inc) {
          if (incIdx !== i + 2) { incIdx = i + 2; fillCard(incoming, inc); }
          // из-за края экрана ровно на место компактной карточки:
          // в конце свайпа left = W - 70, то есть та же точка, где
          // она окажется после подстановки — без отскока
          const u = Math.min(1, Math.max(0, (t - IN_FROM) / (1 - IN_FROM)));
          const left = parkRight((W + 16) - 86 * u);
          incoming.style.transform = `translate(${left.toFixed(1)}px, 40px)`;
          glue(incoming, left, 40, W, H, 280);
        }
      }

      /* ── Подсказка про горизонтальный скролл ──
         Блок раскрылся, а карусель не тронули — через паузу карточки
         слегка отъезжают и возвращаются, показывая, что их листают.
         Один раз за сессию и только если пользователь не вмешался. */
      const HINT_DELAY = 5000;  // пауза до подсказки
      const HINT_SHIFT = 44;    // на сколько отъезжают
      const HINT_TIME = 1100;   // длительность движения туда-обратно
      const hintOn = block.hint !== false;
      let hintUsed = false, hintTimer = 0, hintRaf = 0, hintArmed = false;

      function stopHint() {
        clearTimeout(hintTimer);
        if (hintRaf) {
          cancelAnimationFrame(hintRaf);
          hintRaf = 0;
          scroller.style.scrollSnapType = '';
        }
      }
      function dropHint() { hintUsed = true; stopHint(); }

      function playHint() {
        if (hintUsed || scroller.scrollLeft > 1) return;
        hintUsed = true;
        // снап на время подсказки отключаем: он тянул бы карточку назад
        scroller.style.scrollSnapType = 'none';
        const t0 = performance.now();
        const step = now => {
          const p = Math.min(1, (now - t0) / HINT_TIME);
          scroller.scrollLeft = HINT_SHIFT * Math.sin(p * Math.PI);
          if (p < 1) { hintRaf = requestAnimationFrame(step); return; }
          scroller.scrollLeft = 0;
          scroller.style.scrollSnapType = '';
          hintRaf = 0;
        };
        hintRaf = requestAnimationFrame(step);
      }

      /* Листание — нативный scroll-snap браузера (см. CSS).
         JS только пересчитывает раскрытие карточек при скролле. */
      let tickingX = false;
      function onScrollX() {
        if (!hintRaf) dropHint();   // листают сами — подсказка не нужна
        if (document.hidden) { update(); return; }
        if (!tickingX) { tickingX = true; requestAnimationFrame(update); }
      }
      scroller.addEventListener('scroll', onScrollX, { passive: true });
      scroller.addEventListener('pointerdown', dropHint, { passive: true });
      scroller.addEventListener('touchstart', dropHint, { passive: true });
      window.addEventListener('resize', () => { measure(); onScrollX(); });

      /* ── раскрытие блока при скролле страницы ──
         Высота блока НЕ меняется: он всегда занимает свои 360px, а
         раскрытие рисуется маской — кромки расходятся от центра.
         Контент под блоком поднят трансформом ровно на столько,
         сколько билета ещё скрыто, поэтому пустоты не видно.
         Так в цикле скролла не остаётся ни одного пересчёта
         раскладки: всё, что двигается, считает видеоускоритель —
         иначе на iOS раскрытие всегда отстаёт от пальца. */
      // закрытая высота = две сомкнутые кромки по 16px: зубцы
      // сходятся посередине, скругления углов помещаются целиком
      const H_CLOSED = 32;
      const H_OPEN = 360;
      /* Раскрытие идёт 1:1 со скроллом — пиксель прокрутки на пиксель
         открывшегося билета, поэтому лента под ним стоит на месте.
         Зависимость строго линейная: ускорение сломало бы
         компенсацию, и низ начал бы подрагивать. */
      const REVEAL_SPAN = H_OPEN - H_CLOSED;
      const perfT = section.querySelector('.fc-trip-perf--t');
      const perfB = section.querySelector('.fc-trip-perf--b');
      /* Если браузер умеет прокрутко-зависимые анимации, раскрытие
         рисует он сам (см. CSS) — скрипт в это не вмешивается */
      const cssReveal = window.CSS && CSS.supports &&
        CSS.supports('animation-timeline', 'view()');
      let lastH = -1;
      function updateReveal() {
        tickingY = false;
        // читаем layout один раз, дальше только пишем трансформы.
        // позицию берём у секции: сам band сдвинут трансформом,
        // и его rect дал бы обратную связь на расчёт раскрытия
        const vh = window.innerHeight;
        const top = section.getBoundingClientRect().top;
        const startTop = vh * 0.85;             // поднялся на 15% снизу
        const e = Math.min(1, Math.max(0, (startTop - top) / REVEAL_SPAN));
        // целые пиксели: дробные дают субпиксельное дрожание
        const h = Math.round(H_CLOSED + (H_OPEN - H_CLOSED) * e);
        if (!cssReveal && h !== lastH) {
          lastH = h;
          const cut = (H_OPEN - h) / 2;         // маска сверху и снизу
          band.style.clipPath = `inset(${cut}px 0px ${cut}px 0px)`;
          // кромки живут вне маски и прибиты к краям видимой части
          perfT.style.transform = 'translateY(-34px)';
          perfB.style.transform = `translateY(${h - 16}px) scaleY(-1)`;
          // билет подтянут вверх, чтобы его видимая часть примыкала
          // к блоку сверху, а лента снизу — на всю скрытую высоту
          band.style.transform = `translateY(${-cut}px)`;
          if (below) below.style.transform = `translateY(${-(H_OPEN - h)}px)`;
          bgwrap.style.transform = `scale(${(1 + REVEAL_ZOOM * (1 - e)).toFixed(4)})`;
        }
        // зум фона рисует CSS; в JS он нужен лишь карточкам карусели
        revealScale = cssReveal ? 1 : 1 + REVEAL_ZOOM * (1 - e);
        revealE = e;
        // блок раскрылся — заводим таймер подсказки про листание
        if (hintOn && !hintArmed && !hintUsed && e > 0.99) {
          hintArmed = true;
          hintTimer = setTimeout(playHint, HINT_DELAY);
        }
        update();
      }
      let tickingY = false;
      /* Пока блок в зоне видимости, пересчитываем раскрытие каждый
         кадр, а не по событиям скролла: в Safari на iOS во время
         инерции события приходят редко и с задержкой, отчего блок
         обновляется рывками. rAF-цикл идёт синхронно с отрисовкой. */
      let loopRaf = 0;
      function loop() {
        updateReveal();
        loopRaf = requestAnimationFrame(loop);
      }
      function startLoop() { if (!loopRaf) loopRaf = requestAnimationFrame(loop); }
      function stopLoop() { cancelAnimationFrame(loopRaf); loopRaf = 0; }

      const io = new IntersectionObserver(entries => {
        for (const e of entries) e.isIntersecting ? startLoop() : (stopLoop(), updateReveal());
      }, { rootMargin: '200px 0px' });
      io.observe(band);

      function onScrollY() {
        // фолбэк: в фоновой вкладке кадры заморожены
        if (document.hidden) { updateReveal(); return; }
        if (!loopRaf && !tickingY) { tickingY = true; requestAnimationFrame(() => { tickingY = false; updateReveal(); }); }
      }
      window.addEventListener('scroll', onScrollY, { passive: true });
      window.addEventListener('resize', onScrollY);
      document.addEventListener('visibilitychange', () => { update(); updateReveal(); });

      update();
      updateReveal();
    });
  }

  /* ── Сборка ленты ──────────────────────────────── */
  function mount(config, container) {
    for (const block of config) {
      const render = renderers[block.type];
      if (!render) {
        console.warn(`Feed: неизвестный тип блока «${block.type}»`);
        continue;
      }
      const node = render(block);
      node.__fcData = block; // конфиг блока для init-функций
      container.appendChild(node);
    }
    initParallax(container);
    initTravelTicket(container);
  }

  return { register, mount, initParallax, initTravelTicket, ICONS };
})();
