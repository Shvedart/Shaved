/* Призматический интерактивный фон (vanilla WebGL2), адаптация идеи из prismatic-burst.txt */

export function mountPrismaticBurst(container, options = {}){
	const opts = Object.assign({
		intensity: 2,
		speed: 0.5,
		animationType: 'hover', // 'rotate' | 'rotate3d' | 'hover'
		colors: ['#ff007a', '#4d3dff', '#ffffff'],
		distort: 1.0,
		paused: false,
		offset: { x: 0, y: 0 },
		hoverDampness: 0.25,
		rayCount: 24,
		mixBlendMode: 'lighten',
		noiseAmount: 0.8
	}, options || {});

	const canvas = document.createElement('canvas');
	canvas.style.position = 'absolute';
	canvas.style.inset = '0';
	canvas.style.width = '100%';
	canvas.style.height = '100%';
	canvas.style.pointerEvents = 'none';
	canvas.style.mixBlendMode = opts.mixBlendMode && opts.mixBlendMode !== 'none' ? opts.mixBlendMode : '';
	// Плавное появление
	try { canvas.classList.add('media-fade'); } catch(e){}
	container.appendChild(canvas);

	const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true });
	if(!gl){
		// Fallback: ничего не делаем
		return { detach(){ try{ container.removeChild(canvas);}catch(e){} } };
	}

	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	function resize(){
		const w = Math.max(1, Math.floor(container.clientWidth * dpr));
		const h = Math.max(1, Math.floor(container.clientHeight * dpr));
		if(canvas.width !== w || canvas.height !== h){
			canvas.width = w;
			canvas.height = h;
		}
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}

	const vertSrc = `#version 300 es
	in vec2 position;
	void main(){
		gl_Position = vec4(position, 0.0, 1.0);
	}`;

	const fragSrc = `#version 300 es
	precision highp float;
	precision highp int;
	out vec4 fragColor;
	uniform vec2  uResolution;
	uniform float uTime;
	uniform float uIntensity;
	uniform float uSpeed;
	uniform int   uAnimType;
	uniform vec2  uMouse;
	uniform int   uColorCount;
	uniform float uDistort;
	uniform vec2  uOffset;
	uniform sampler2D uGradient;
	uniform float uNoiseAmount;
	uniform int   uRayCount;

	float hash21(vec2 p){
		p = floor(p);
		float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
		return fract(f);
	}
	mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }
	float layeredNoise(vec2 fragPx){
		vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
		vec2 q = rot30() * p;
		float n = 0.0;
		n += 0.40 * hash21(q);
		n += 0.25 * hash21(q * 2.0 + 17.0);
		n += 0.20 * hash21(q * 4.0 + 47.0);
		n += 0.10 * hash21(q * 8.0 + 113.0);
		n += 0.05 * hash21(q * 16.0 + 191.0);
		return n;
	}
	vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
		float focal = res.y * max(dist, 1e-3);
		return normalize(vec3(2.0 * (frag - offset) - res, focal));
	}
	float edgeFade(vec2 frag, vec2 res, vec2 offset){
		vec2 toC = frag - 0.5 * res - offset;
		float r = length(toC) / (0.5 * min(res.x, res.y));
		float x = clamp(r, 0.0, 1.0);
		float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
		float s = q * 0.5;
		s = pow(s, 1.5);
		float tail = 1.0 - pow(1.0 - s, 2.0);
		s = mix(s, tail, 0.2);
		float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
		return clamp(s + dn, 0.0, 1.0);
	}
	mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
	mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
	mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }
	vec2 rot2(vec2 v, float a){ float s = sin(a), c = cos(a); return mat2(c, -s, s, c) * v; }
	vec3 sampleGradient(float t){ t = clamp(t, 0.0, 1.0); return texture(uGradient, vec2(t, 0.5)).rgb; }
	float bendAngle(vec3 q, float t){
		float a = 0.8 * sin(q.x * 0.55 + t * 0.6)
					 + 0.7 * sin(q.y * 0.50 - t * 0.5)
					 + 0.6 * sin(q.z * 0.60 + t * 0.7);
		return a;
	}
	void main(){
		vec2 frag = gl_FragCoord.xy;
		float t = uTime * uSpeed;
		float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
		vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
		float marchT = 0.0;
		vec3 col = vec3(0.0);
		float n = layeredNoise(frag);
		vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
		mat2 M2 = mat2(c.x, c.y, c.z, c.w);
		float amp = clamp(uDistort, 0.0, 50.0) * 0.15;
		mat3 rot3dMat = mat3(1.0);
		if(uAnimType == 1){
			vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
			rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
		}
		mat3 hoverMat = mat3(1.0);
		if(uAnimType == 2){
			vec2 m = uMouse * 2.0 - 1.0;
			vec3 ang = vec3(m.y * 0.6, m.x * 0.6, 0.0);
			hoverMat = rotY(ang.y) * rotX(ang.x);
		}
		for (int i = 0; i < 44; ++i) {
			vec3 P = marchT * dir;
			P.z -= 2.0;
			float rad = length(P);
			vec3 Pl = P * (10.0 / max(rad, 1e-6));
			if(uAnimType == 0){
				Pl.xz *= M2;
			} else if(uAnimType == 1){
				Pl = rot3dMat * Pl;
			} else {
				Pl = hoverMat * Pl;
			}
			float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;
			float grow = smoothstep(0.35, 3.0, marchT);
			float a1 = amp * grow * bendAngle(Pl * 0.6, t);
			float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
			vec3 Pb = Pl;
			Pb.xz = rot2(Pb.xz, a1);
			Pb.xy = rot2(Pb.xy, a2);
			float rayPattern = smoothstep(0.5, 0.7,
				sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
				sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
			);
			if (uRayCount > 0) {
				float ang = atan(Pb.y, Pb.x);
				float comb = 0.5 + 0.5 * cos(float(uRayCount) * ang);
				comb = pow(comb, 3.0);
				rayPattern *= smoothstep(0.15, 0.95, comb);
			}
			vec3 spectralDefault = 1.0 + vec3(
				cos(marchT * 3.0 + 0.0),
				cos(marchT * 3.0 + 1.0),
				cos(marchT * 3.0 + 2.0)
			);
			float saw = fract(marchT * 0.25);
			float tRay = saw * saw * (3.0 - 2.0 * saw);
			vec3 userGradient = 2.0 * sampleGradient(tRay);
			vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;
			vec3 base = (0.05 / (0.4 + stepLen))
								* smoothstep(5.0, 0.0, rad)
								* spectral;
			col += base * rayPattern;
			marchT += stepLen;
		}
		col *= edgeFade(frag, uResolution, uOffset);
		col *= uIntensity;
		fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
	}`;

	function compile(type, src){
		const shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			console.error(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}
	function link(vs, fs){
		const prog = gl.createProgram();
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){
			console.error(gl.getProgramInfoLog(prog));
			gl.deleteProgram(prog);
			return null;
		}
		return prog;
	}

	const vs = compile(gl.VERTEX_SHADER, vertSrc);
	const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
	const prog = link(vs, fs);
	gl.deleteShader(vs); gl.deleteShader(fs);
	if(!prog){
		return { detach(){ try{ container.removeChild(canvas);}catch(e){} } };
	}
	gl.useProgram(prog);

	// Фуллскрин-треугольник
	const posLoc = gl.getAttribLocation(prog, 'position');
	const vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	// Большой треугольник, покрывающий весь экран
	const vertices = new Float32Array([
		-1, -1,
		 3, -1,
		-1,  3
	]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

	// Юниформы
	const uResolution = gl.getUniformLocation(prog, 'uResolution');
	const uTime = gl.getUniformLocation(prog, 'uTime');
	const uIntensity = gl.getUniformLocation(prog, 'uIntensity');
	const uSpeed = gl.getUniformLocation(prog, 'uSpeed');
	const uAnimType = gl.getUniformLocation(prog, 'uAnimType');
	const uMouse = gl.getUniformLocation(prog, 'uMouse');
	const uColorCount = gl.getUniformLocation(prog, 'uColorCount');
	const uDistort = gl.getUniformLocation(prog, 'uDistort');
	const uOffset = gl.getUniformLocation(prog, 'uOffset');
	const uGradient = gl.getUniformLocation(prog, 'uGradient');
	const uNoiseAmount = gl.getUniformLocation(prog, 'uNoiseAmount');
	const uRayCount = gl.getUniformLocation(prog, 'uRayCount');

	// Градиент
	function hexToRgb01(hex){
		let h = String(hex || '').trim();
		if(h.startsWith('#')) h = h.slice(1);
		if(h.length === 3){
			const r=h[0], g=h[1], b=h[2];
			h = r+r+g+g+b+b;
		}
		const intVal = parseInt(h, 16);
		if(isNaN(intVal) || (h.length !== 6 && h.length !== 8)) return [1,1,1];
		const r = ((intVal >> 16) & 255) / 255;
		const g = ((intVal >> 8) & 255) / 255;
		const b = (intVal & 255) / 255;
		return [r,g,b];
	}
	const gradientTex = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, gradientTex);
	let colorCount = 0;
	if(Array.isArray(opts.colors) && opts.colors.length > 0){
		const capped = opts.colors.slice(0, 64);
		colorCount = capped.length;
		const data = new Uint8Array(colorCount * 4);
		for(let i=0;i<colorCount;i++){
			const [r,g,b] = hexToRgb01(capped[i]);
			data[i*4+0] = Math.round(r*255);
			data[i*4+1] = Math.round(g*255);
			data[i*4+2] = Math.round(b*255);
			data[i*4+3] = 255;
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, colorCount, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
	} else {
		const data = new Uint8Array([255,255,255,255]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
	}
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.uniform1i(uGradient, 0);

	// Статические юниформы
	const animTypeMap = { rotate:0, rotate3d:1, hover:2 };
	const animType = animTypeMap[opts.animationType] ?? 2;
	gl.uniform1f(uIntensity, opts.intensity);
	gl.uniform1f(uSpeed, opts.speed);
	gl.uniform1i(uAnimType, animType);
	gl.uniform1i(uColorCount, colorCount);
	gl.uniform1f(uDistort, opts.distort || 0);
	gl.uniform2f(uOffset, parseFloat(opts.offset?.x || 0), parseFloat(opts.offset?.y || 0));
	gl.uniform1f(uNoiseAmount, opts.noiseAmount);
	gl.uniform1i(uRayCount, Math.max(0, Math.floor(opts.rayCount || 0)));

	// Интерактивность
	let mouseTarget = [0.5, 0.5];
	let mouseSmooth = [0.5, 0.5];
	function onPointer(e){
		const r = container.getBoundingClientRect();
		const x = (e.clientX - r.left) / Math.max(1, r.width);
		const y = (e.clientY - r.top) / Math.max(1, r.height);
		mouseTarget = [Math.min(Math.max(x,0),1), Math.min(Math.max(y,0),1)];
	}
	container.addEventListener('pointermove', onPointer, { passive:true });

	// Анимация
	let last = performance.now();
	let accum = 0;
	let raf = 0;
	let stopped = false;
	const hoverTau = 0.02 + Math.max(0, Math.min(1, opts.hoverDampness)) * 0.5;
	function loop(now){
		if(stopped) return;
		const dt = Math.max(0, now - last) * 0.001;
		last = now;
		if(!opts.paused) accum += dt;
		// Smoothing
		const alpha = 1 - Math.exp(-dt / hoverTau);
		mouseSmooth[0] += (mouseTarget[0] - mouseSmooth[0]) * alpha;
		mouseSmooth[1] += (mouseTarget[1] - mouseSmooth[1]) * alpha;

		gl.useProgram(prog);
		gl.uniform2f(uResolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.uniform1f(uTime, accum);
		gl.uniform2f(uMouse, mouseSmooth[0], mouseSmooth[1]);

		gl.drawArrays(gl.TRIANGLES, 0, 3);
		raf = requestAnimationFrame(loop);
	}

	const ro = new ResizeObserver(() => { resize(); });
	ro.observe(container);
	resize();
	raf = requestAnimationFrame(loop);
	// Отложенно помечаем как загруженный для мягкого появления
	try { requestAnimationFrame(() => canvas.classList.add('loaded')); } catch(e){}

	return {
		detach(){
			stopped = true;
			cancelAnimationFrame(raf);
			try{ ro.disconnect(); }catch(e){}
			container.removeEventListener('pointermove', onPointer);
			try{ container.removeChild(canvas); }catch(e){}
			try{
				gl.deleteTexture(gradientTex);
				gl.deleteBuffer(vbo);
				gl.deleteProgram(prog);
			}catch(e){}
		}
	};
}



