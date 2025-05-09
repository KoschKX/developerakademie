class World{

	cvs; ctx; cam; hud;
	keyboard; screen; audio; loadicon;
	gameover = false; 
	cache = true; debug = false; bosstest = false;

	level; levelmap; boss;

	clsnInterval; drawFramesId;

	constructor(cvs,scr,kbd,aud){
		this.cvs = cvs;  this.ctx = cvs.getContext('2d');
    	this.screen = scr; this.keyboard = kbd; this.audio = aud;
    	this.loadicon = new LoadIcon(canvas);
    	this.loadbar = new ProgressBar(canvas);
    	this.cam = new Camera(this);
    	this.hud = new HUD(this);
	}

	destroy(){
		clearInterval(this.clsnInterval);
		cancelAnimationFrame(this.drawFramesId);
	}

	restart(){
		this.gameover = false; 
		this.debug = false; 
		this.bosstest = false; this.boss = null;
		this.audio.reset();
		this.level.reset();
		this.destroy();
		this.init();
		this.player = this.level.player;
		this.player.revive(0);
	}

	init(){
  		if(this.cache){
    		this.draw();
    	}else{
    		if(this.player.img){
		    	this.player.img.onload = () => { this.draw(); this.player.img.onload = null; };
			}
	    };
	    this.audio.playSound(this.level.ambient[0], 1.0, false, true);
		this.audio.playSound(this.level.music[0], 0.4, false, true);

	    this.main();
	}

	main(){
		this.checkCollisions();
	}

	load(levelmap){
		let newlevel = new Level(levelmap);
		this.level = newlevel;
		this.levelmap = levelmap;
		this.player = this.level.player;
	    this.ground = this.level.ground;
		this.level.setWorld(this); 
		this.level.preload(function(){
			this.world.init();
			this.world.screen.showControls();
		}); 
	}

	checkCollisions(){
		this.clsnInterval = setInterval(() => {
			this.checkCollisionsItem();
			this.checkCollisionsProjectile();
			this.checkCollisionsEnemy();
		}, 1000 / 60);
	}

	checkCollisionsItem(){
		this.level.items.forEach((item) => {
			let colIA = this.player.isColliding(item,0,0);
			if(colIA){
				this.player.getItem(item);
			}
		});
	}

	checkCollisionsProjectile(){
		this.level.projectiles.forEach((projectile) => {
			let colPA = this.player.isColliding(projectile,0,0);
			let colPB = this.player.isColliding(projectile,1,0);
			if(colPA){
				this.player.isHit(true);
			}
			if(colPB){
				if(projectile instanceof XMark){
					if(this.keyboard.DOWN) this.player.dig(projectile);
				}
			}
			this.level.enemies.forEach((enemy) => {
				if(enemy.isBoss){ return; }
				let colPC = projectile.isColliding(enemy,0,0);
				if(colPC){
					if(projectile instanceof Cannonball && projectile.hostile && (!enemy.appearing)){
						enemy.isHit();
					}
				}
			});
		});
	}

	checkCollisionsEnemy(){
		this.level.enemies.forEach((enemy) => {
			let colA = this.player.isColliding(enemy,0,0);
			let colB = this.player.isColliding(enemy,1,1);
			if(colB){
				if(this.player.falling){
					let bopPoint = enemy.y+enemy.boxes[1][1]-(this.player.boxes[1][1]);
					if(enemy.isBoss==true && enemy.dead){ 
						this.player.bounce(17.5, bopPoint); 
						enemy.isHit();
					}else {
						if(!this.player.dead && (enemy.bounceoninjured || enemy.hostile) && (!enemy.appearing)){
							if(enemy.health>0){ this.player.bounce(17.5, bopPoint); }
							enemy.isHit();
						}
					}
				}
			}else if(colA){
				if(!((this.player.falling || this.player.bouncing) && colA==1) && enemy.hostile){
					this.player.isHit(true);
				}
			}
		});
	}

	draw() {
		this.ctx.clearRect(0,0,this.cvs.width,this.cvs.height);

		this.ctx.save(); 

		this.updateCamera();

		this.addObjectsToMap(this.level.backgrounds.filter(background => background.layer === 0));
		this.addObjectsToMap(this.level.clouds);

		this.addObjectsToMap(this.level.backgrounds.filter(background => background.layer === 1));

		this.addObjectsToMap(this.level.enemies.filter(enemy => enemy.name === 'Ship'));
		this.addObjectsToMap(this.level.projectiles.filter(projectile => !projectile.falling && projectile.name === 'Cannonball'));
		this.addObjectsToMap(this.level.effects.filter(effect => effect.name === 'Explosion'));

		this.addObjectsToMap(this.level.backgrounds.filter(background => background.layer === 2));

		this.addObjectsToMap(this.level.projectiles.filter(projectile => projectile.name === 'XMark'));

		this.addObjectsToMap(this.level.enemies.filter(enemy => enemy.name === 'SeaTurtle'));

		this.addObjectsToMap(this.level.items.filter(item => item.name === 'Doubloon'));
		this.addObjectsToMap(this.level.items.filter(item => item.name === 'Catnip'));

		this.addObjectsToMap(this.level.enemies.filter(enemy => enemy.dead && enemy.name === 'Crab'));
		this.addToMap(this.player);
		this.addObjectsToMap(this.level.enemies.filter(enemy => !enemy.dead && enemy.name === 'Crab'));

		this.addObjectsToMap(this.level.effects.filter(effect => effect.name === 'Stomp'));
		
		this.addObjectsToMap(this.level.projectiles.filter(projectile => projectile.falling && projectile.name === 'Cannonball'));

		this.addObjectsToMap(this.level.backgrounds.filter(background => background.layer === 3));

		this.ctx.restore();

		this.hud.print();
		this.checkDebugKey();
		this.checkBossTestKey();

		self=this;
		this.drawFramesId = requestAnimationFrame(function(){
			self.draw();
		});
	}

	updateCamera(){
		this.cam.update(
			[this.player.x, this.player.y], 
			[this.player.width*0.5, 0],
			this.level.bounds,
		);
	}

	addObjectsToMap(objects){
		objects.forEach(obj => { this.addToMap(obj); });
	}

	addToMap(mo) {

		// FLICKER IF INVINCIBLE 
			if(mo.flickering&&mo.flicker(1)){ return ;}
	    
	    this.ctx.save(); 
	    mo.draw(this.ctx);

	    if(this.debug && mo instanceof Character){
	    	mo.drawColliders(this.ctx);
	    }
	    this.ctx.restore(); 
	}

	checkBossTestKey(){
		if(!this.boss && !this.bosstest && this.keyboard.TAB){
			this.callBoss();
		}
	}

	callBoss(){
		if(this.bosstest){ return; } 
		let self = this; this.level.preloadBoss(function(){
			console.log('Boss Loaded');
			self.boss = new SeaTurtle(1);
		  	self.boss.world = self;
		  	self.boss.init();

		  	self.boss.callBoss();

		  	self.boss.appearing = false; self.boss.static = true;
		  	self.level.enemies.push(self.boss);
		});
		this.bosstest = true;
	}

	toggleDebug(onoff){
		this.debug = onoff;
	}

	checkDebugKey(){
		if(!this.keyboard.KEYDOWN){ return; }
		this.toggleDebug(this.keyboard.CAPSLOCK);
	}
}