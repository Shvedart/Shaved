/* Шумовая подложка на canvas поверх контейнера (full size) */
export function attachNoiseOverlay(container, { alpha = 18, refreshInterval = 2 } = {}) {
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


