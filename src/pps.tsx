const MAP_SIZE = 750;
const PARTICLES_COUNT = 5000;
const DEFAULT_MAX_PARTICLES = 6000;

function fixAngle(a: number) {
	while(a <= -Math.PI)
		a += Math.PI*2;
	while(a > Math.PI)
		a -= Math.PI*2;
	return a;
}

class Particle {
	static radius = 0.003;
	static interactionRadius = 5*3;
	public x: number;
	public y: number;
	public angle = Math.PI*2*Math.random();
	readonly alpha = Math.PI;
	readonly beta = Math.PI * 0.094444444444; //17/180 * Math.PI;
	readonly speed = 0.67*3;

	constructor(_x: number, _y: number) {
		this.x = _x;
		this.y = _y;
	}

	update(delta: number, L: number, R: number) {
		this.angle = fixAngle(this.angle);
		this.angle += this.alpha + this.beta * (L+R) * (R >= L ? 1 : -1);
		this.x += Math.cos(this.angle) * this.speed;
		this.y += Math.sin(this.angle) * this.speed;

		if(this.x < 0)
			this.x += 5;
		if(this.x >= MAP_SIZE)
			this.x -= 5;
		if(this.y < 0)
			this.y += 5;
		if(this.y >= MAP_SIZE)
			this.y -= 5;
	}

	static generateRandom() {
		let random_particle = new Particle(Math.random()*MAP_SIZE, Math.random()*MAP_SIZE);

		return random_particle;
	}
}

function generateEmptyChunks(size: number) {
	let arr: Particle[][][] = [];
	for(var i=0; i<size; i++) {
		arr.push( [] );
		for(var j=0; j<size; j++) {
			arr[i].push([]);
		}
	}
	return arr;
}

class Simulation {
	private ctx: CanvasRenderingContext2D;
	private running = false;
	public iterations = 1;
	private particles: Particle[];
	private readonly chunks_size = MAP_SIZE / (Particle.interactionRadius*2);
	private chunks: Particle[][][] = generateEmptyChunks(this.chunks_size);

	private width: number;
	private height: number;

	private MAX_PARTICLES = DEFAULT_MAX_PARTICLES;

	constructor(canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext('2d', {
			antialias: true,
			alpha: false
		}) as CanvasRenderingContext2D;
		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = '#888';
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = '#fff';
		this.ctx.fillRect(0, 0, canvas.width, canvas.height);
		this.width = canvas.width;
		this.height = canvas.height;

		//initializing
		this.particles = [];
		for(var i=0; i<PARTICLES_COUNT; i++)
			this.particles.push( Particle.generateRandom() );

		console.log(this.chunks_size);
		for(var particle of this.particles) {
			let x_i = Math.floor( particle.x / (Particle.interactionRadius*2) );
			let y_i = Math.floor( particle.y / (Particle.interactionRadius*2) );
			this.chunks[x_i][y_i].push(particle);
		}
		//console.log(this.chunks);
		

		this.start();
	}

	particlesCount() {
		return this.particles.length;
	}

	setMaxParticles(value: number) {
		this.MAX_PARTICLES = value;
	}

	private start() {
		this.running = true;

		let last = 0, dt = 0;
		const fixedDelta = 1000.0/60.0;
		let tick = (time: number) => {
			dt += time - last;
			last = time;
			if(dt > 1000)
				dt = 0;
			//while(dt >= fixedDelta) {
				for(let i=0; i<this.iterations; i++)
					this.update(fixedDelta);
				//dt -= fixedDelta;
			//}
			if(this.running)
				requestAnimationFrame(tick);
		};

		tick(0);
	}

	private update(delta: number) {
		//console.log(delta, this.ctx);
		this.ctx.fillStyle = '#fff';
		this.ctx.globalAlpha = 0.05;
		this.ctx.fillRect(0, 0, this.width, this.height);
		this.ctx.fillStyle = '#000';
		this.ctx.globalAlpha = 1;

		if(this.particles.length < this.MAX_PARTICLES) {
			for(var i=0; i<5; i++) {
				let p = Particle.generateRandom();
				//p.x = MAP_SIZE/2;
				//p.y = MAP_SIZE/2;
				this.particles.push( p );
			}
		}
		else if(this.particles.length > this.MAX_PARTICLES) {
			let n=10;
			while(this.particles.length > this.MAX_PARTICLES && n-- > 0)
				this.particles.splice((Math.random()*this.particles.length)|0, 1);
		}

		let next_chunks = generateEmptyChunks(this.chunks_size);

		for(var particle of this.particles) {
			let x_i = Math.floor( particle.x / (Particle.interactionRadius*2) );
			let y_i = Math.floor( particle.y / (Particle.interactionRadius*2) );
			next_chunks[x_i][y_i].push(particle);

			var L = 0, R = 0;
			
			for(var xx=-1; xx<=1; xx++) {
				for(var yy=-1; yy<=1; yy++) {
					if(x_i+xx < 0 || x_i+xx>=this.chunks_size || 
						y_i+yy < 0 || y_i+yy>=this.chunks_size) continue;

					for(var p2 of this.chunks[x_i+xx][y_i+yy]) {
						if(particle !== p2) {
							var dx = p2.x-particle.x;
							var dy = p2.y-particle.y;
							var dst = dx*dx + dy*dy;
							if(dst <= Particle.interactionRadius*Particle.interactionRadius) {
								let angle_dif = fixAngle( Math.atan2(dy, dx) ) - particle.angle;
								//this.running = false;
								//(particle === this.particles[0]) && 
								//	console.log(fixAngle( Math.atan2(dy, dx) ), particle.angle);
								if(fixAngle(angle_dif) > 0)
									R++;
								else
									L++;
							}
						}
					}
				}
			}

			this.ctx.fillStyle = `rgb(${(L+R)*10}, ${(L+R)*5}, 0)`;
			//(particle === this.particles[0]) && (this.ctx.fillStyle = '#00f');
			particle.update(delta, L, R);

			var rel_x = particle.x;//(this.width-this.height)/2 + particle.x*this.height;
			var rel_y = particle.y;//particle.y*this.height;

			this.ctx.beginPath();
			this.ctx.arc(rel_x, rel_y, Particle.radius * this.height, 0, Math.PI*2, false);
			this.ctx.fill();

			//if(particle === this.particles[0]) {
				/*this.ctx.beginPath();
					this.ctx.moveTo(rel_x, rel_y);
					this.ctx.lineTo(
						rel_x + Math.cos(particle.angle)*15, 
						rel_y + Math.sin(particle.angle)*15
					);
				this.ctx.stroke();*/

				/*this.ctx.beginPath();
				this.ctx.arc(rel_x, rel_y, 
					Particle.interactionRadius * this.height, 0, Math.PI*2, false);
				this.ctx.stroke();

				this.ctx.fillText(L.toString(), rel_x-10, rel_y);
				this.ctx.fillText(R.toString(), rel_x+10, rel_y);*/
			//}
		}

		this.chunks = next_chunks;
	}

	destroy() {
		this.running = false;
	}
}

window.addEventListener('load', () => {
	let max_particles = DEFAULT_MAX_PARTICLES;

	let page = document.getElementById('page');
	if(!page) {
		page = document.createElement('div');
		page.setAttribute('id', 'page');
		document.body.appendChild(page);
	}

	let canvas = document.createElement('canvas');
	canvas.width = MAP_SIZE;
	canvas.height = MAP_SIZE;
	page.appendChild(canvas);

	let simulation = new Simulation(canvas);
	//let particles = simulation.particlesCount();

	let span = document.createElement('span');
	//@ts-ignore
	span.style.float = 'right';
	page.appendChild(span);

	let particles_info = document.createElement('div');
	
	span.appendChild(particles_info);

	let max_particles_container = document.createElement('div');
	max_particles_container.innerText = 'Max particles: ';
	span.appendChild(max_particles_container);

	let max_particles_input = document.createElement('input');
	max_particles_input.setAttribute('type', 'number');
	max_particles_input.setAttribute('placeholder', 'max particles');
	max_particles_input.setAttribute('value', max_particles.toString());

	function updateMaxParticles(value: number) {
		max_particles = value;
		simulation.setMaxParticles(value);
		//max_particles_input.setAttribute('value', max_particles.toString());
	}

	max_particles_input.addEventListener('change', event => {
		//@ts-ignore
		let v: number = event.target.value;
		//this.setState({max_particles: v});
		//if(this.simulation)
		
		updateMaxParticles(v);
	});
	max_particles_container.appendChild(max_particles_input);

	

	let increaseParticles = function() {
		// particles = simulation.particlesCount();
		particles_info.innerText = 'Particles: ' + simulation.particlesCount();
		setTimeout(increaseParticles, 1000);
	};

	increaseParticles();
});