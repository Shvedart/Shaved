/* SPA для портфолио: маршрутизация, меню, эффекты, печать текста */
import { mountPrismaticBurst } from './prismatic-burst.js';

const DATA = {
	menuTitles: [], // строки из mts/document/menu.txt
	slides: [], // { title, body } из mts/document/text-slides.txt
};

const VIDEO_MAP = {
	6: './mts/ui-mvp.mp4',
	2: './mts/problem.mp4',
	3: './mts/сall-center.mp4',
	8: './mts/problem.mp4',
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
};

// На каких слайдах поверх видео нужен эффект шума
const NOISE_SLIDES = new Set([2, 3, 8, 20, 22, 25, 35]);

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
	for(let i=0;i<DATA.menuTitles.length;i++){
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
		$sideList.appendChild(item);
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
	const iframeSrc = IFRAME_MAP[index];
	if (iframeSrc) {
		const frame = document.createElement('iframe');
		frame.src = iframeSrc;
		frame.setAttribute('title', 'Slide ' + String(index).padStart(2,'0') + ' Iframe');
		frame.setAttribute('loading', 'lazy');
		holder.appendChild(frame);
	} else {
		const video = document.createElement('video');
		video.src = VIDEO_MAP[index] || '';
		video.muted = true;
		video.loop = true;
		video.autoplay = true;
		video.playsInline = true;
		video.preload = 'auto';
		holder.appendChild(video);
	}
	right.appendChild(holder);

	// Шум накладываем только на отмеченных слайдах
	let noiseHandle = null;
	// (для iframe шума не делаем)
	if (!IFRAME_MAP[index] && NOISE_SLIDES.has(index)) {
		noiseHandle = attachNoiseOverlay(holder, { alpha: 16, refreshInterval: 2 });
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
	frame.src = './mts/switch-iframe.html';
	frame.setAttribute('title', 'Switch Iframe');
	frame.setAttribute('allowtransparency', 'true');
	frame.style.backgroundColor = 'transparent';
	frame.setAttribute('loading', 'lazy');
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
		bg.setAttribute('loading', 'lazy');
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


