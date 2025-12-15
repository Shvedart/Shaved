/* SPA для портфолио: маршрутизация, меню, эффекты, печать текста */
import { mountPrismaticBurst } from './prismatic-burst.js';
import { mountColorBends } from './color-bends.js';

const DATA = {
	menuTitles: [], // строки из mts/document/menu.txt
	slides: [], // { title, body } из mts/document/text-slides.txt
};

const VIDEO_MAP = {
	6: './mts/ui-mvp.mp4',
	2: './mts/problem.mp4',
	3: './mts/сall-center.mp4',
	8: './mts/habits.mp4',
	28: './mts/illustrations.mp4',
	20: './mts/habits.mp4',
	22: './mts/victory.mp4',
	25: './mts/сheck-outs.mp4',
	48: './mts/topology.mp4',
	35: './mts/slippers.mp4',
};

// Для этих слайдов используем iframe в правой части вместо видео
const IFRAME_MAP = {
	10: './mts/ui-phone/ui-du/ui-du.html',
	11: './mts/ui-phone/ui-switch/ui-switch.html',
	12: './mts/ui-phone/ui-port/ui-port.html',
	13: './mts/ui-phone/ui-ls/ui-ls.html',
	14: './mts/ui-phone/ui-dynamic/ui-dynamic.html',
	24: './mts/message/message-slow.html',
	33: './mts/ui-phone/ui-port-naked/ui-port-naked.html',
	34: './mts/message/message-port.html',
	17: './mts/widgets/widgets.html',
	18: './mts/page/page.html',
};

// На каких слайдах поверх видео нужен эффект шума
const NOISE_SLIDES = new Set([2, 3, 8, 20, 22, 25, 35]);
// Слайды со светлой темой (меню и номера — чёрные)
const LIGHT_SLIDES = new Set([15, 16, 17, 18]);

const $app = document.getElementById('app');
const $side = document.getElementById('sideMenu');
const $sideList = document.getElementById('sideMenuList');
const $sideBackdrop = document.getElementById('sideMenuBackdrop');
const $sideClose = document.querySelector('.side-menu__close');
const $btnProject = document.getElementById('btnProject');
const $num = document.getElementById('slideNumber');
const $badge = document.getElementById('interactiveBadge');
const $btnPrev = document.getElementById('btnPrev');
const $btnNext = document.getElementById('btnNext');

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }

function applyFadeIn(el, events){
	try{
		el.classList?.add('media-fade');
		const done = () => {
			el.classList?.add('loaded');
			events.forEach(ev => el.removeEventListener(ev, done));
		};
		events.forEach(ev => el.addEventListener(ev, done, { once:true }));
		// запасной таймер на случай, если событие не придёт
		setTimeout(done, 1200);
	}catch(e){}
}

// Универсальная предзагрузка ассетов для прелоадера
function preloadVideo(url){
	return new Promise((resolve) => {
		try{
			const v = document.createElement('video');
			v.muted = true;
			v.preload = 'auto';
			v.src = url;
			const done = () => { cleanup(); resolve(true); };
			const fail = () => { cleanup(); resolve(false); };
			const cleanup = () => {
				v.removeEventListener('loadeddata', done);
				v.removeEventListener('canplaythrough', done);
				v.removeEventListener('error', fail);
			};
			v.addEventListener('loadeddata', done, { once:true });
			v.addEventListener('canplaythrough', done, { once:true });
			v.addEventListener('error', fail, { once:true });
			v.load();
			setTimeout(done, 5000);
		}catch(e){ resolve(false); }
	});
}
function preloadImage(url){
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(true);
		img.onerror = () => resolve(false);
		img.src = url;
		setTimeout(() => resolve(true), 4000);
	});
}
function preloadIframe(url){
	// Префетчим документ, затем разрешаем
	return fetch(url, { cache: 'force-cache', credentials: 'same-origin' })
		.then(() => true)
		.catch(() => false);
}

function currentRoute(){
	const h = location.hash || '#/home';
	const m = h.match(/^#\/(home|slide)\/?(\d+)?/i);
	if(!m) return { view:'home' };
	if(m[1] === 'home') return { view:'home' };
	const idx = Number(m[2] || '0');
	return { view:'slide', index: idx };
}
function gotoHome(){ location.hash = '#/home'; }
function gotoSlide(index){
	const idx = clamp(Number(index||0), 0, 50);
	location.hash = `#/slide/${String(idx).padStart(2,'0')}`;
}
function gotoPrev(){
	const r = currentRoute();
	if(r.view === 'home'){ return; }
	if(r.index <= 1){ gotoHome(); return; }
	gotoSlide(r.index - 1);
}
function gotoNext(){
	const r = currentRoute();
	if(r.view === 'home'){ gotoSlide(1); return; }
	gotoSlide(r.index + 1);
}

function isInteractiveByTitle(title){
	return /✦/.test(title || '');
}

function setFooterState(route){
	let num = '00';
	let interactive = false;
	if(route.view === 'slide'){
		num = String(route.index).padStart(2,'0');
		const title = DATA.menuTitles[route.index] || '';
		interactive = isInteractiveByTitle(title);
	} else {
		// Главный экран — интерактивный ✦
		interactive = true;
	}
	$num.textContent = num;
	$badge.hidden = !interactive;
}

function toggleSideMenu(open){
	$side.setAttribute('aria-hidden', open ? 'false' : 'true');
	$sideBackdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
	if(open){
		$side.focus?.();
	}
}

function renderSideMenu(activeIndex){
	$sideList.innerHTML = '';
	// создаём 3 колонки слайдов, последняя 4-я колонка — крестик
	const cols = [];
	for (let c = 0; c < 3; c++) {
		const col = document.createElement('div');
		col.className = 'side-col';
		cols.push(col);
		$sideList.appendChild(col);
	}
	// колонка для close
	const closeCol = document.createElement('div');
	closeCol.className = 'side-col side-col--close';
	const closeBtn = document.createElement('button');
	closeBtn.className = 'side-menu__close side-menu__close--grid';
	closeBtn.setAttribute('aria-label', 'Закрыть меню');
	const img = document.createElement('img');
	img.src = './ui-element/close.svg';
	img.alt = 'Закрыть';
	closeBtn.appendChild(img);
	closeBtn.addEventListener('click', () => toggleSideMenu(false));
	closeCol.appendChild(closeBtn);
	$sideList.appendChild(closeCol);

	// Раскладываем пункты по колонкам сверху вниз (column-major)
	const total = DATA.menuTitles.length;
	const colCount = 3;
	const perCol = Math.ceil(total / colCount);
	for (let c = 0; c < colCount; c++) {
		for (let r = 0; r < perCol; r++) {
			const i = c * perCol + r;
			if (i >= total) break;
			const title = DATA.menuTitles[i];
			const item = document.createElement('div');
			item.className = 'side-item' + (i === activeIndex ? ' side-item--active' : '');
			item.addEventListener('click', () => {
				toggleSideMenu(false);
				if(i === 0){ gotoHome(); } else { gotoSlide(i); }
			});
			const num = document.createElement('div');
			num.className = 'side-item__num';
			num.textContent = String(i).padStart(2,'0');
			const ttl = document.createElement('div');
			ttl.className = 'side-item__title';
			ttl.textContent = title.replace(/\s*✦\s*/g, '');
			const badge = document.createElement('div');
			badge.className = 'side-item__badge';
			if(isInteractiveByTitle(title)) badge.textContent = '✦';
			item.appendChild(num);
			item.appendChild(ttl);
			item.appendChild(badge);
			cols[c].appendChild(item);
		}
	}
}

/* Шумовая подложка на canvas поверх контейнера (full size) */
function attachNoiseOverlay(container, { alpha = 18, refreshInterval = 2 } = {}){
	const canvas = document.createElement('canvas');
	canvas.className = 'noise-overlay';
	container.appendChild(canvas);

	const ctx = canvas.getContext('2d', { alpha: true });
	let rafId = 0;
	let frame = 0;
	let stopped = false;

	function resize(){
		const r = container.getBoundingClientRect();
		canvas.width = Math.max(2, Math.floor(r.width));
		canvas.height = Math.max(2, Math.floor(r.height));
		canvas.style.width = r.width + 'px';
		canvas.style.height = r.height + 'px';
	}
	function draw(){
		const w = canvas.width, h = canvas.height;
		const image = ctx.createImageData(w, h);
		const data = image.data;
		for(let i=0;i<data.length;i+=4){
			const v = Math.random()*255|0;
			data[i]=v; data[i+1]=v; data[i+2]=v; data[i+3]=alpha;
		}
		ctx.putImageData(image, 0, 0);
	}
	function loop(){
		if(stopped) return;
		if(frame % refreshInterval === 0) draw();
		frame++;
		rafId = requestAnimationFrame(loop);
	}
	const ro = new ResizeObserver(resize);
	ro.observe(container);
	resize();
	loop();

	return {
		detach(){
			stopped = true;
			cancelAnimationFrame(rafId);
			try{ ro.disconnect(); }catch(e){}
			try{ container.removeChild(canvas); }catch(e){}
		}
	};
}

/* Эффект «призматический всплеск» (упрощенная версия без WebGL) */
function attachPrismaticHover(container){
	const layer = document.createElement('div');
	layer.className = 'slide-01__burst';
	container.appendChild(layer);
	function onMove(e){
		const r = container.getBoundingClientRect();
		const x = clamp((e.clientX - r.left)/r.width, 0, 1);
		const y = clamp((e.clientY - r.top)/r.height, 0, 1);
		const px = (x*100).toFixed(2)+'%';
		const py = (y*100).toFixed(2)+'%';
		layer.style.background = `radial-gradient(600px 600px at ${px} ${py}, rgba(255,0,122,0.25), rgba(77,61,255,0.15), transparent 70%)`;
	}
	container.addEventListener('pointermove', onMove, { passive:true });
	return { detach(){ container.removeEventListener('pointermove', onMove); try{ container.removeChild(layer);}catch(e){} } };
}

/* Печать текста с TextTyper */
async function typeInto(container, text){
	const tw = window.TextTyper.createTypewriter();
	tw.root.style.display = 'inline-block';
	tw.root.style.maxWidth = '100%';
	container.appendChild(tw.root);
	const tokens = window.TextTyper.parseTokens(text);
	await window.TextTyper.typeTokens(tw.content, tokens, {
		typingSpeed: 42,
		deletingSpeed: 28,
		randomJitter: 0.3,
		afterDeletePause: 160
	});
	return tw;
}

/* Главный экран */
function renderHome(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view home';

	// Видео фоном
	const video = document.createElement('video');
	video.className = 'home__video';
	video.src = './mts/start-home.mp4';
	video.muted = true;
	video.playsInline = true;
	video.preload = 'auto';
	video.controls = false;
	applyFadeIn(video, ['loadeddata','canplay','canplaythrough','loadedmetadata']);
	root.appendChild(video);

	// Шум поверх
	const noiseHandle = attachNoiseOverlay(root, { alpha: 16, refreshInterval: 2 });

	// Текст
	const textBox = document.createElement('div');
	textBox.className = 'home__text';
	root.appendChild(textBox);

	$app.appendChild(root);

	// Печать основного текста (из слайда 00)
	const slide0 = DATA.slides.find(s => /^Слайд\s*0+/.test((s.title||''))) || DATA.slides[0];
	const body = slide0?.body || '';
	typeInto(textBox, body);

	// Скрамблинг по курсору — управление текущим временем видео
	let hasMeta = false;
	let duration = 0;
	let targetT = 0;
	let currentT = 0;
	let raf = 0;

	function sync(){
		if(!hasMeta) { raf = requestAnimationFrame(sync); return; }
		// Плавное приближение к целевому времени
		const alpha = 0.12;
		currentT += (targetT - currentT) * alpha;
		try{
			video.currentTime = clamp(currentT, 0, Math.max(0.01, duration));
		}catch(e){}
		raf = requestAnimationFrame(sync);
	}
	function onMove(e){
		if(!hasMeta) return;
		const w = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
		const x = clamp(e.clientX / w, 0, 1);
		targetT = x * duration;
	}
	video.addEventListener('loadedmetadata', () => {
		duration = video.duration || 0;
		hasMeta = duration > 0;
		video.pause();
		cancelAnimationFrame(raf);
		raf = requestAnimationFrame(sync);
	});
	window.addEventListener('pointermove', onMove, { passive:true });

	// Очистка (если понадобится)
	return () => {
		cancelAnimationFrame(raf);
		noiseHandle.detach();
		window.removeEventListener('pointermove', onMove);
	};
}

/* Типовой двухколоночный слайд с видео */
function renderTwoColSlide(index){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view slide-two-col';
	root.style.background = LIGHT_SLIDES.has(index) ? '#EDE8E1' : 'var(--bg-dark)';

	const left = document.createElement('div');
	left.className = 'slide-left';
	const right = document.createElement('div');
	right.className = 'slide-right';

	const mainText = document.createElement('div');
	mainText.className = 'main-text';
	left.appendChild(mainText);
	// Доп. иллюстрация под текстом для слайда 10
	if (index === 10) {
		const ill = document.createElement('img');
		ill.src = './mts/scroll.svg';
		ill.alt = '';
		ill.style.display = 'block';
		ill.style.marginTop = '32px';
		ill.style.maxWidth = '80%';
		ill.style.height = 'auto';
		// Плавное появление через 6 секунд после загрузки
		ill.classList.add('media-fade');
		ill.addEventListener('load', () => {
			setTimeout(() => ill.classList.add('loaded'), 10000);
		}, { once: true });
		left.appendChild(ill);
	}

	const holder = document.createElement('div');
	holder.className = 'video-holder';
	const iframeSrc = IFRAME_MAP[index];
	if (iframeSrc) {
		const frame = document.createElement('iframe');
		frame.src = iframeSrc;
		frame.setAttribute('title', 'Slide ' + String(index).padStart(2,'0') + ' Iframe');
		frame.setAttribute('loading', 'lazy');
		applyFadeIn(frame, ['load']);
		holder.appendChild(frame);
	} else {
		const video = document.createElement('video');
		video.src = VIDEO_MAP[index] || '';
		video.muted = true;
		video.loop = true;
		video.autoplay = true;
		video.playsInline = true;
		video.preload = 'auto';
		applyFadeIn(video, ['loadeddata','canplay','canplaythrough','loadedmetadata']);
		holder.appendChild(video);
	}
	right.appendChild(holder);

	// Шум накладываем только на отмеченных слайдах
	let noiseHandle = null;
	// (для iframe шума не делаем)
	if (!IFRAME_MAP[index] && NOISE_SLIDES.has(index)) {
		noiseHandle = attachNoiseOverlay(holder, { alpha: 26, refreshInterval: 2 });
	}

	root.appendChild(left);
	root.appendChild(right);
	$app.appendChild(root);

	// Текст из text-slides.txt по индексу
	const slideObj = DATA.slides[index] || null;
	const body = slideObj?.body || '';
	typeInto(mainText, body);

	return () => { if (noiseHandle) noiseHandle.detach(); };
}

/* Слайд 01 — центр логотип, фон/ховер эффект, текст 80vw с отступами */
function renderSlide01(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view slide-01';

	// Текстовый блок вверху слева, 80vw, отступы 55
	const textWrap = document.createElement('div');
	textWrap.style.position = 'absolute';
	textWrap.style.left = 'var(--pad)';
	textWrap.style.top = 'var(--pad)';
	textWrap.style.right = 'var(--pad)';
	textWrap.style.maxWidth = '80vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	// Лого по центру
	const logo = document.createElement('img');
	logo.src = './mts/mts-logo.svg';
	logo.alt = 'MTS';
	logo.className = 'slide-01__logo';
	root.appendChild(logo);

	// Призматический интерактивный фон (WebGL)
	const burstHandle = mountPrismaticBurst(root, {
		animationType: 'hover',
		intensity: 2.9,
		speed: 0.8,
		distort: 1.1,
		hoverDampness: 0.25,
		rayCount: 0,
		mixBlendMode: 'lighten',
		colors: ['#ff007a', '#4d3dff', '#ffffff']
	});

	$app.appendChild(root);

	// Текст слайда 01
	const slideObj = DATA.slides[1] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);

	return () => burstHandle.detach();
}

/* Слайд 05 — текст слева, на фоне справа iframe, без шума */
function renderSlide05(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view';
	root.style.background = 'var(--bg-dark)';

	// Iframe на фоне справа
	const frame = document.createElement('iframe');
	frame.className = 'iframe-right';
	frame.src = './mts/switch-morph/switch-morph.html';
	frame.setAttribute('title', 'Switch Iframe');
	frame.setAttribute('allowtransparency', 'true');
	frame.style.backgroundColor = 'transparent';
	frame.setAttribute('loading', 'lazy');
	applyFadeIn(frame, ['load']);
	root.appendChild(frame);

	// Текстовый блок (сверху слева 55px), ширина 50vw
	const textWrap = document.createElement('div');
	textWrap.style.position = 'relative';
	textWrap.style.zIndex = '2';
	textWrap.style.padding = 'var(--pad)';
	textWrap.style.maxWidth = '50vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	$app.appendChild(root);

	const slideObj = DATA.slides[5] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);
}

/* Слайд 27 — фон font.svg (100vh, центр по вертикали), текст слева */
function renderSlide27(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view';
	root.style.background = 'var(--bg-dark)'; // чёрный фон

	// Фоновое изображение
	const bg = document.createElement('img');
	bg.src = './mts/font.svg';
	bg.alt = '';
	bg.className = 'bg-fullheight-center';
	applyFadeIn(bg, ['load']);
	root.appendChild(bg);

	// Текстовый блок
	const textWrap = document.createElement('div');
	textWrap.style.position = 'relative';
	textWrap.style.zIndex = '2';
	textWrap.style.padding = 'var(--pad)';
	textWrap.style.maxWidth = '50vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	$app.appendChild(root);

	const slideObj = DATA.slides[27] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);
}

/* Слайд 29 — фон icons-font.svg (100vh, центр по вертикали), текст слева */
function renderSlide29(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view';
	root.style.background = 'var(--bg-dark)'; // чёрный фон

	const bg = document.createElement('img');
	bg.src = './mts/icons-font.svg';
	bg.alt = '';
	bg.className = 'bg-fullheight-center';
	applyFadeIn(bg, ['load']);
	root.appendChild(bg);

	const textWrap = document.createElement('div');
	textWrap.style.position = 'relative';
	textWrap.style.zIndex = '2';
	textWrap.style.padding = 'var(--pad)';
	textWrap.style.maxWidth = '50vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	$app.appendChild(root);

	const slideObj = DATA.slides[29] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);
}

/* Слайд 46 — фоновые видео switches.mp4 (100vh, центр), текст слева */
function renderSlide46(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view';
	root.style.background = 'var(--bg-dark)';

	const bg = document.createElement('video');
	bg.src = './mts/switches.mp4';
	bg.className = 'bg-fullheight-center';
	bg.muted = true;
	bg.loop = true;
	bg.autoplay = true;
	bg.playsInline = true;
	bg.preload = 'auto';
	bg.setAttribute('aria-hidden', 'true');
	applyFadeIn(bg, ['loadeddata','canplay','canplaythrough','loadedmetadata']);
	root.appendChild(bg);

	const textWrap = document.createElement('div');
	textWrap.style.position = 'relative';
	textWrap.style.zIndex = '2';
	textWrap.style.padding = 'var(--pad)';
	textWrap.style.maxWidth = '50vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	$app.appendChild(root);

	const slideObj = DATA.slides[46] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);
}

/* Слайд 47 — фоновые видео connection.mp4 (100vh, центр), текст слева */
function renderSlide47(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view';
	root.style.background = 'var(--bg-dark)';

	const bg = document.createElement('video');
	bg.src = './mts/сonnection.mp4';
	bg.className = 'bg-fullheight-center';
	bg.muted = true;
	bg.loop = true;
	bg.autoplay = true;
	bg.playsInline = true;
	bg.preload = 'auto';
	bg.setAttribute('aria-hidden', 'true');
	applyFadeIn(bg, ['loadeddata','canplay','canplaythrough','loadedmetadata']);
	root.appendChild(bg);

	const textWrap = document.createElement('div');
	textWrap.style.position = 'relative';
	textWrap.style.zIndex = '2';
	textWrap.style.padding = 'var(--pad)';
	textWrap.style.maxWidth = '50vw';
	textWrap.style.textAlign = 'left';
	textWrap.style.fontWeight = '400';
	textWrap.style.lineHeight = '140%';
	textWrap.style.fontSize = 'var(--fz-main)';
	root.appendChild(textWrap);

	$app.appendChild(root);

	const slideObj = DATA.slides[47] || null;
	const body = slideObj?.body || '';
	typeInto(textWrap, body);
}

/* Слайд 44 — фоновое видео fullscreen + справа SVG, текст слева */
function renderSlide44(){
	$app.innerHTML = '';
	const root = document.createElement('section');
	root.className = 'view slide-two-col';
	root.style.background = 'var(--bg-dark)';

	// Фоновое видео на весь экран
	const bg = document.createElement('video');
	bg.src = './mts/ui-test-cable/ui-test-cable.mp4';
	bg.muted = true;
	bg.loop = true;
	bg.autoplay = true;
	bg.playsInline = true;
	bg.preload = 'auto';
	bg.style.position = 'fixed';
	bg.style.inset = '0';
	bg.style.width = '100vw';
	bg.style.height = '100vh';
	bg.style.objectFit = 'cover';
	bg.style.zIndex = '0';
	root.appendChild(bg);

	const left = document.createElement('div');
	left.className = 'slide-left';
	left.style.zIndex = '1';
	const right = document.createElement('div');
	right.className = 'slide-right';
	right.style.zIndex = '1';

	const mainText = document.createElement('div');
	mainText.className = 'main-text';
	left.appendChild(mainText);

	const holder = document.createElement('div');
	holder.className = 'video-holder';
	const img = document.createElement('img');
	img.src = './mts/ui-test-cable/ui-test-cable.svg';
	img.alt = '';
	holder.appendChild(img);
	right.appendChild(holder);

	root.appendChild(left);
	root.appendChild(right);
	$app.appendChild(root);

	const slideObj = DATA.slides[44] || null;
	const body = slideObj?.body || '';
	typeInto(mainText, body);
}

/* Рендерер маршрута */
let cleanup = null;
function renderRoute(){
	if(cleanup){ try{ cleanup(); }catch(e){} cleanup = null; }
	const route = currentRoute();
	setFooterState(route);
	// Тема для светлых слайдов
	if (route.view === 'slide' && LIGHT_SLIDES.has(route.index)) {
		document.body.classList.add('theme-light');
	} else {
		document.body.classList.remove('theme-light');
	}
	renderSideMenu(route.view === 'slide' ? route.index : 0);
	if(route.view === 'home'){
		cleanup = renderHome();
		return;
	}
	// Слайды
	if(route.index === 1){
		cleanup = renderSlide01();
		return;
	}
	if(route.index === 5){
		renderSlide05();
		return;
	}
	// Слайд 04 — центрированный текст (max 850px) с фиксированной высотой 300px
	if(route.index === 4){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const box = document.createElement('div');
		box.className = 'center-text-box';
		const mainText = document.createElement('div');
		mainText.className = 'main-text';
		box.appendChild(mainText);
		root.appendChild(box);
		$app.appendChild(root);
		const slideObj = DATA.slides[4] || null;
		const body = slideObj?.body || '';
		typeInto(mainText, body);
		return;
	}
	// Слайд 09 — центрированный текст + интерактивный фон ColorBends
	if(route.index === 9){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		// фон
		const bends = mountColorBends(root, {
			colors: ['#570000', '#23415F', '#004A36'],
			rotation: -56,
			speed: 0.3,
			scale: 0.5,
			frequency: 1.0,
			warpStrength: 1.0,
			mouseInfluence: 1.0,
			parallax: 0.6,
			noise: 0.1,
			transparent: false,
		});
		// текст
		const box = document.createElement('div');
		box.className = 'center-text-box';
		const mainText = document.createElement('div');
		mainText.className = 'main-text';
		box.appendChild(mainText);
		root.appendChild(box);
		$app.appendChild(root);
		const slideObj = DATA.slides[9] || null;
		const body = slideObj?.body || '';
		typeInto(mainText, body);
		// очистка
		cleanup = () => bends.detach();
		return;
	}
	// Универсальный центрированный текстовый слайд
	function renderCenteredTextSlide(index){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const box = document.createElement('div');
		box.className = 'center-text-box';
		// Индивидуальные высоты для некоторых слайдов
		const heightMap = { 21: '90px', 43: '130px', 49: '210px', 50: '210px' };
		if (heightMap[index]) box.style.height = heightMap[index];
		const mainText = document.createElement('div');
		mainText.className = 'main-text';
		box.appendChild(mainText);
		root.appendChild(box);
		$app.appendChild(root);
		const slideObj = DATA.slides[index] || null;
		const body = slideObj?.body || '';
		typeInto(mainText, body);
	}
	// Слайды 09, 21, 36, 43, 49, 50 — центрированный текст
	if([9, 21, 36, 43, 49, 50].includes(route.index)){
		renderCenteredTextSlide(route.index);
		return;
	}
	// Слайд 15 — светлая тема: фон #EDE8E1, текст чёрный, фон-iframe на всю высоту
	if(route.index === 15){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = '#EDE8E1';
		const bg = document.createElement('iframe');
		bg.src = './mts/table/table.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Database');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '90vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		textWrap.style.color = '#000000';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[15] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Слайд 16 — светлая тема, текст в левой и правой колонке + SVG под текстом
	if(route.index === 16){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view slide-two-col';
		root.style.background = '#EDE8E1';

		const left = document.createElement('div');
		left.className = 'slide-left';
		const right = document.createElement('div');
		right.className = 'slide-right';
		right.style.display = 'block';
		right.style.padding = 'var(--pad)';

		// Левая колонка: текст + SVG
		const leftWrap = document.createElement('div');
		leftWrap.style.width = '100%';
		const leftText = document.createElement('div');
		leftText.className = 'main-text';
		const leftImg = document.createElement('img');
		leftImg.src = './mts/flexibility-01.svg';
		leftImg.alt = '';
		leftImg.style.width = '100%';
		leftImg.style.height = 'auto';
		leftImg.style.display = 'block';
		leftImg.style.marginTop = '24px';
		leftWrap.appendChild(leftText);
		leftWrap.appendChild(leftImg);
		left.appendChild(leftWrap);

		// Правая колонка: текст + SVG
		const rightText = document.createElement('div');
		rightText.className = 'main-text';
		const rightImg = document.createElement('img');
		rightImg.src = './mts/flexibility-02.svg';
		rightImg.alt = '';
		rightImg.style.width = '100%';
		rightImg.style.height = 'auto';
		rightImg.style.display = 'block';
		rightImg.style.marginTop = '24px';
		right.appendChild(rightText);
		right.appendChild(rightImg);

		root.appendChild(left);
		root.appendChild(right);
		$app.appendChild(root);

		// Текст делим на левый/правый по строкам
		const slideObj = DATA.slides[16] || null;
		const body = (slideObj?.body || '').replace(/\r\n?/g, '\n');
		const lines = body.split('\n').map(s => s.trim()).filter(Boolean);
		const leftBody = lines[0] || body;
		const rightBody = lines.slice(1).join('\n') || '';
		typeInto(leftText, leftBody);
		if (rightBody) typeInto(rightText, rightBody);
		return;
	}
	if(route.index === 7){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		// фон — iframe на всю высоту
		const bg = document.createElement('iframe');
		bg.src = './mts/mts-graph-01.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Graph 01');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		// текст шире 50vw
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[7] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Аналогично 07: фон-iframe и ширина текста 70vw
	if(route.index === 19){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const bg = document.createElement('iframe');
		bg.src = './mts/mts-graph-02.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Graph 02');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[19] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	if(route.index === 23){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const bg = document.createElement('iframe');
		bg.src = './mts/mts-graph-03.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Graph 03');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[23] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Слайд 26 — фон-iframe speed-test-slow, текст 70vw
	if(route.index === 26){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const bg = document.createElement('iframe');
		bg.src = './mts/speed/speed-test-slow.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Speed Test Slow');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[26] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Слайд 32 — фон-iframe speed-test-seed, текст 70vw
	if(route.index === 32){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const bg = document.createElement('iframe');
		bg.src = './mts/speed/speed-test-seed.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Speed Test Seed');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[32] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Слайд 30 — фон-iframe weight.html, текст 70vw
	if(route.index === 30){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		const bg = document.createElement('iframe');
		bg.src = './mts/weight.html';
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Weight');
		bg.setAttribute('loading', 'lazy');
		root.appendChild(bg);
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '70vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[30] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Фоновые iframe на всю высоту: 37–42
	const bgIframeMap = {
		37: './mts/ui-flow/office/index-office.html',
		38: './mts/ui-flow/office/index-office-task.html',
		39: './mts/ui-flow/entrance/index-entrance.html',
		40: './mts/ui-flow/switch/index-switch.html',
		41: './mts/ui-flow/switch/index-port.html',
		42: './mts/ui-flow/home/index-home.html',
	};
	if (bgIframeMap[route.index]) {
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';
		// фон-iframe
		const bg = document.createElement('iframe');
		bg.src = bgIframeMap[route.index];
		bg.className = 'bg-iframe-fullheight-center';
		bg.setAttribute('title', 'Flow Iframe');
		bg.setAttribute('loading', 'eager');
		// На некоторых страницах внутр. Lazy-контент догружается только при скролле –
		// провоцируем короткий скролл после загрузки
		bg.addEventListener('load', () => {
			try {
				const w = bg.contentWindow;
				if (w && typeof w.scrollTo === 'function') {
					w.scrollTo(0, 1);
					setTimeout(() => w.scrollTo(0, 0), 40);
				}
			} catch(e){ /* cross-origin или иное — пропускаем */ }
		}, { once:true });
		applyFadeIn(bg, ['load']);
		root.appendChild(bg);
		// текст слева
		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '50vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);
		$app.appendChild(root);
		const slideObj = DATA.slides[route.index] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	if(route.index === 27){
		renderSlide27();
		return;
	}
	if(route.index === 29){
		renderSlide29();
		return;
	}
	if(route.index === 46){
		renderSlide46();
		return;
	}
	if(route.index === 47){
		renderSlide47();
		return;
	}
	if(route.index === 44){
		renderSlide44();
		return;
	}
	// Слайд 31 — как 44, но без фонового видео; справа SVG svg-animation.svg
	if(route.index === 31){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view slide-two-col';
		root.style.background = 'var(--bg-dark)';

		const left = document.createElement('div');
		left.className = 'slide-left';
		const right = document.createElement('div');
		right.className = 'slide-right';

		const mainText = document.createElement('div');
		mainText.className = 'main-text';
		left.appendChild(mainText);

		const holder = document.createElement('div');
		holder.className = 'video-holder';
		const img = document.createElement('img');
		img.src = './mts/svg-animation.svg';
		img.alt = '';
		applyFadeIn(img, ['load']);
		holder.appendChild(img);
		right.appendChild(holder);

		root.appendChild(left);
		root.appendChild(right);
		$app.appendChild(root);

		const slideObj = DATA.slides[31] || null;
		const body = slideObj?.body || '';
		typeInto(mainText, body);
		return;
	}
	// Слайд 45 — фон svg на всю высоту экрана
	if(route.index === 45){
		$app.innerHTML = '';
		const root = document.createElement('section');
		root.className = 'view';
		root.style.background = 'var(--bg-dark)';

		const bg = document.createElement('img');
		bg.src = './mts/сalls-schedule.svg';
		bg.alt = '';
		bg.className = 'bg-fullwidth-bottom';
	applyFadeIn(bg, ['load']);
		root.appendChild(bg);

		const textWrap = document.createElement('div');
		textWrap.style.position = 'relative';
		textWrap.style.zIndex = '2';
		textWrap.style.padding = 'var(--pad)';
		textWrap.style.maxWidth = '50vw';
		textWrap.style.textAlign = 'left';
		textWrap.style.fontWeight = '400';
		textWrap.style.lineHeight = '140%';
		textWrap.style.fontSize = 'var(--fz-main)';
		root.appendChild(textWrap);

		$app.appendChild(root);

		const slideObj = DATA.slides[45] || null;
		const body = slideObj?.body || '';
		typeInto(textWrap, body);
		return;
	}
	// Типовые слайды (включая 02,03,08,20,22,25,35)
	cleanup = renderTwoColSlide(route.index);
}

/* Инициализация */
async function boot(){
	// Загрузка меню и текстов
	const [menuTxt, slidesTxt] = await Promise.all([
		fetch('./mts/document/menu.txt', { cache: 'no-store' }).then(r => r.text()),
		fetch('./mts/document/text-slides.txt', { cache: 'no-store' }).then(r => r.text()),
	]);
	DATA.menuTitles = menuTxt.split(/\r?\n/).filter(Boolean);
	DATA.slides = window.TextTyper.parseSlides(slidesTxt);

	// Прелоадер
	startPreloader();

	// События
	window.addEventListener('hashchange', renderRoute);
	document.addEventListener('keydown', (e) => {
		if(e.key === 'ArrowLeft'){ e.preventDefault(); gotoPrev(); }
		if(e.key === 'ArrowRight'){ e.preventDefault(); gotoNext(); }
	});
	$btnPrev.addEventListener('click', gotoPrev);
	$btnNext.addEventListener('click', gotoNext);
	$btnProject.addEventListener('click', () => toggleSideMenu(true));
	$sideClose.addEventListener('click', () => toggleSideMenu(false));
	$sideBackdrop.addEventListener('click', () => toggleSideMenu(false));

	// Первый рендер
	if(!location.hash) location.hash = '#/home';
	renderRoute();
}

boot().catch(console.error);

/* =================== PRELOADER =================== */
function startPreloader(){
	const overlay = document.getElementById('preloader');
	const bar = document.getElementById('preloaderProgress');
	if (!overlay || !bar) return;

	const assets = collectAssets();
	let done = 0;
	const total = assets.length || 1;

	function setProgress(v){
		const p = Math.max(0, Math.min(1, v));
		bar.style.width = (p * 100).toFixed(1) + '%';
	}
	function completeOne(){ done++; setProgress(done/total); }

	const jobs = assets.map(a => {
		if (a.type === 'image') return preloadImage(a.url).then(completeOne);
		if (a.type === 'video') return preloadVideo(a.url).then(completeOne);
		return preloadIframe(a.url).then(completeOne);
	});

	// Максимум 7 секунд, затем скрываем
	const timeout = new Promise(res => setTimeout(res, 7000));
	Promise.race([Promise.allSettled(jobs), timeout]).finally(() => {
		overlay.setAttribute('aria-hidden', 'true');
		bar.setAttribute('aria-hidden', 'true');
	});
}

function collectAssets(){
	const list = [];
	const push = (type, url) => { if (url) list.push({ type, url }); };
	// Домашнее видео
	push('video', './mts/start-home.mp4');
	// Перебор слайдов 1..50
	for (let i = 1; i <= 50; i++){
		if (VIDEO_MAP[i]) push('video', VIDEO_MAP[i]);
		if (IFRAME_MAP[i]) push('iframe', IFRAME_MAP[i]);
		// Фоновые iframe (37–42 уже покрыты в bgIframeMap)
	}
	// Спец изображения/видео
	push('image', './mts/font.svg');
	push('image', './mts/icons-font.svg');
	push('image', './mts/сalls-schedule.svg');
	push('video', './mts/switches.mp4');
	push('video', './mts/сonnection.mp4');
	push('image', './mts/ui-test-cable/ui-test-cable.svg');
	return dedupeAssets(list);
}
function dedupeAssets(arr){
	const seen = new Set(); const out = [];
	for (const a of arr){
		const key = a.type + '|' + a.url;
		if (seen.has(key)) continue;
		seen.add(key); out.push(a);
	}
	return out;
}


