/* Интерактивный фон "Color Bends" (vanilla WebGL2) */

export function mountColorBends(container, opts = {}) {
	const options = Object.assign(
		{
			colors: ['#ff5c7a', '#8a5cff', '#00ffd1'],
			rotation: 0,
			speed: 0.3,
			scale: 1.0,
			frequency: 1.0,
			warpStrength: 1.0,
			mouseInfluence: 1.0,
			parallax: 0.6,
			noise: 0.1,
			transparent: true,
			autoRotate: 0,
		},
		opts || {}
	);

	// Создаём холст поверх контейнера (как фон)
	const canvas = document.createElement('canvas');
	canvas.style.position = 'fixed';
	canvas.style.inset = '0';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.display = 'block';
	canvas.style.pointerEvents = 'none';
	canvas.style.zIndex = '0';
	// Плавное появление
	try { canvas.classList.add('media-fade'); } catch(e){}
	container.appendChild(canvas);

	const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
	if (!gl) {
		return { detach() { try { container.removeChild(canvas); } catch (e) {} } };
	}

	const MAX_COLORS = 8;
	const vertSrc = `#version 300 es
	in vec2 position;
	void main() {
		gl_Position = vec4(position, 0.0, 1.0);
	}`;

	const fragSrc = `#version 300 es
	precision highp float;
	precision highp int;

	const int MAX_COLORS = ${MAX_COLORS};
	out vec4 fragColor;
	uniform vec2 uCanvas;
	uniform float uTime;
	uniform float uSpeed;
	uniform vec2 uRot;
	uniform int uColorCount;
	uniform vec3 uColors[MAX_COLORS];
	uniform int uTransparent;
	uniform float uScale;
	uniform float uFrequency;
	uniform float uWarpStrength;
	uniform vec2 uPointer; // in NDC [-1,1]
	uniform float uMouseInfluence;
	uniform float uParallax;
	uniform float uNoise;

	void main(){
		float t = uTime * uSpeed;
		vec2 uv = (gl_FragCoord.xy / uCanvas);
		vec2 p = uv * 2.0 - 1.0;
		p += uPointer * uParallax * 0.1;
		vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
		vec2 q = vec2(rp.x * (uCanvas.x / max(uCanvas.y, 1.0)), rp.y);
		q /= max(uScale, 0.0001);
		q /= 0.5 + 0.2 * dot(q, q);
		q += 0.2 * cos(t) - 7.56;
		vec2 toward = (uPointer - rp);
		q += toward * uMouseInfluence * 0.2;

		vec3 col = vec3(0.0);
		float a = 1.0;

		if (uColorCount > 0) {
			vec2 s = q;
			vec3 sumCol = vec3(0.0);
			float cover = 0.0;
			for (int i=0; i<MAX_COLORS; ++i){
				if (i >= uColorCount) break;
				s -= 0.01;
				vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
				float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
				float kBelow = clamp(uWarpStrength, 0.0, 1.0);
				float kMix = pow(kBelow, 0.3);
				float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
				vec2 disp = (r - s) * kBelow;
				vec2 warped = s + disp * gain;
				float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
				float m = mix(m0, m1, kMix);
				float w = 1.0 - exp(-6.0 / exp(6.0 * m));
				sumCol += uColors[i] * w;
				cover = max(cover, w);
			}
			col = clamp(sumCol, 0.0, 1.0);
			a = (uTransparent > 0) ? cover : 1.0;
		}else{
			vec2 s = q;
			for (int k=0; k<3; ++k){
				s -= 0.01;
				vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
				float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
				float kBelow = clamp(uWarpStrength, 0.0, 1.0);
				float kMix = pow(kBelow, 0.3);
				float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
				vec2 disp = (r - s) * kBelow;
				vec2 warped = s + disp * gain;
				float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
				float m = mix(m0, m1, kMix);
				col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
			}
			a = (uTransparent > 0) ? max(max(col.r, col.g), col.b) : 1.0;
		}

		if (uNoise > 0.0001) {
			float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
			col += (n - 0.5) * uNoise;
			col = clamp(col, 0.0, 1.0);
		}
		vec3 rgb = (uTransparent > 0) ? col * a : col;
		fragColor = vec4(rgb, a);
	}`;

	function compile(type, src) {
		const sh = gl.createShader(type);
		gl.shaderSource(sh, src);
		gl.compileShader(sh);
		if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(sh));
			gl.deleteShader(sh);
			return null;
		}
		return sh;
	}
	function link(vs, fs) {
		const p = gl.createProgram();
		gl.attachShader(p, vs);
		gl.attachShader(p, fs);
		gl.linkProgram(p);
		if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(p));
			gl.deleteProgram(p);
			return null;
		}
		return p;
	}

	const vs = compile(gl.VERTEX_SHADER, vertSrc);
	const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
	const prog = link(vs, fs);
	gl.deleteShader(vs); gl.deleteShader(fs);
	if (!prog) {
		return { detach() { try { container.removeChild(canvas); } catch (e) {} } };
	}
	gl.useProgram(prog);

	// full screen triangle
	const posLoc = gl.getAttribLocation(prog, 'position');
	const vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	// uniforms
	const uCanvas = gl.getUniformLocation(prog, 'uCanvas');
	const uTime = gl.getUniformLocation(prog, 'uTime');
	const uSpeed = gl.getUniformLocation(prog, 'uSpeed');
	const uRot = gl.getUniformLocation(prog, 'uRot');
	const uColorCount = gl.getUniformLocation(prog, 'uColorCount');
	const uColors = gl.getUniformLocation(prog, 'uColors[0]');
	const uTransparent = gl.getUniformLocation(prog, 'uTransparent');
	const uScale = gl.getUniformLocation(prog, 'uScale');
	const uFrequency = gl.getUniformLocation(prog, 'uFrequency');
	const uWarpStrength = gl.getUniformLocation(prog, 'uWarpStrength');
	const uPointer = gl.getUniformLocation(prog, 'uPointer');
	const uMouseInfluence = gl.getUniformLocation(prog, 'uMouseInfluence');
	const uParallax = gl.getUniformLocation(prog, 'uParallax');
	const uNoise = gl.getUniformLocation(prog, 'uNoise');

	// helpers
	function hexToRgb01(hex) {
		let h = String(hex || '').trim();
		if (h[0] === '#') h = h.slice(1);
		if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
		const v = parseInt(h, 16);
		if (isNaN(v)) return [1,1,1];
		return [((v>>16)&255)/255, ((v>>8)&255)/255, (v&255)/255];
	}

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const w = Math.max(1, Math.floor((container.clientWidth || window.innerWidth) * dpr));
		const h = Math.max(1, Math.floor((container.clientHeight || window.innerHeight) * dpr));
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w; canvas.height = h;
		}
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.useProgram(prog);
		gl.uniform2f(uCanvas, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}

	// init static uniforms
	gl.useProgram(prog);
	gl.uniform1f(uSpeed, options.speed);
	gl.uniform1f(uScale, options.scale);
	gl.uniform1f(uFrequency, options.frequency);
	gl.uniform1f(uWarpStrength, options.warpStrength);
	gl.uniform1f(uMouseInfluence, options.mouseInfluence);
	gl.uniform1f(uParallax, options.parallax);
	gl.uniform1f(uNoise, options.noise);
	gl.uniform1i(uTransparent, options.transparent ? 1 : 0);

	// colors
	const cols = (options.colors || []).slice(0, MAX_COLORS);
	const arr = new Float32Array(MAX_COLORS * 3);
	for (let i = 0; i < MAX_COLORS; i++) {
		const [r,g,b] = i < cols.length ? hexToRgb01(cols[i]) : [0,0,0];
		arr[i*3+0] = r; arr[i*3+1] = g; arr[i*3+2] = b;
	}
	gl.uniform1iv(uColorCount, new Int32Array([cols.length]));
	gl.uniform3fv(uColors, arr);

	// time and rotation
	let raf = 0;
	let start = performance.now();
	let pointer = [0,0];
	let pointerTarget = [0,0];

	function onMove(e){
		const rect = canvas.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
		const y = -(((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
		pointerTarget = [x, y];
	}
	window.addEventListener('pointermove', onMove, { passive: true });

	function loop(now){
		const t = (now - start) * 0.001;
		// rotation
		const deg = (options.rotation % 360) + options.autoRotate * t;
		const rad = deg * Math.PI / 180;
		const c = Math.cos(rad), s = Math.sin(rad);

		// smooth pointer
		const alpha = 0.1;
		pointer[0] += (pointerTarget[0] - pointer[0]) * alpha;
		pointer[1] += (pointerTarget[1] - pointer[1]) * alpha;

		gl.useProgram(prog);
		gl.uniform1f(uTime, t);
		gl.uniform2f(uRot, c, s);
		gl.uniform2f(uPointer, pointer[0], pointer[1]);
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		raf = requestAnimationFrame(loop);
	}

	const ro = new ResizeObserver(resize);
	ro.observe(container);
	resize();
	raf = requestAnimationFrame(loop);
	// Делегируем плавное появление после первого кадра
	try { requestAnimationFrame(() => canvas.classList.add('loaded')); } catch(e){}

	return {
		detach(){
			cancelAnimationFrame(raf);
			try { ro.disconnect(); } catch(e){}
			window.removeEventListener('pointermove', onMove);
			try { gl.deleteBuffer(vbo); gl.deleteProgram(prog); } catch(e){}
			try { container.removeChild(canvas); } catch(e){}
		}
	};
}


