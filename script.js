const CONFIG = {
  width: 960,
  height: 540,
  groundY: 430,
  gravity: 1800,
  dogSpeed: 280,
  jumpPower: 700,
  spawnMin: 0.95,
  spawnMax: 1.85,
  humanHealth: 5,
  petDuration: 1.2,
  catSpeedMin: 110,
  catSpeedMax: 195,
  scareBounce: 200
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = { left: false, right: false, jump: false };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const rand = (min, max) => Math.random() * (max - min) + min;
const rectsOverlap = (a, b) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

class Dog {
  constructor(x, groundY) {
    this.width = 68;
    this.height = 40;
    this.reset(x, groundY);
  }

  reset(x, groundY) {
    this.x = x;
    this.y = groundY - this.height;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = true;
    this.petTimer = 0;
    this.tailSwing = 0;
  }

  getBounds() {
    return { x: this.x + 6, y: this.y + 6, width: this.width - 12, height: this.height - 6 };
  }

  update(dt, game) {
    this.tailSwing += dt * 8;

    if ((game.state === "intro" && !game.isPetting) || game.state === "playing") {
      this.vx = 0;
      if (keys.left) this.vx -= CONFIG.dogSpeed;
      if (keys.right) this.vx += CONFIG.dogSpeed;
      if (this.vx !== 0) this.facing = Math.sign(this.vx);

      if (game.state === "playing" && keys.jump && this.onGround) {
        this.vy = -CONFIG.jumpPower;
        this.onGround = false;
      }
    } else {
      this.vx = 0;
    }

    if (game.isPetting) {
      this.vx = 0;
      this.petTimer += dt;
    } else {
      this.petTimer = 0;
    }

    this.x += this.vx * dt;
    this.vy += CONFIG.gravity * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, 20, CONFIG.width - 20 - this.width);

    const groundLevel = CONFIG.groundY - this.height;
    if (this.y >= groundLevel) {
      this.y = groundLevel;
      this.vy = 0;
      this.onGround = true;
    }
  }

  draw(ctx, game) {
    const bob = this.onGround ? Math.sin(this.tailSwing) * 1.5 : 0;
    const petBounce = game.isPetting ? Math.sin(this.petTimer * 16) * 4 : 0;
    const y = this.y + bob - petBounce;
    const faceX = this.facing >= 0 ? 1 : -1;

    ctx.save();
    ctx.translate(this.x + this.width / 2, y + this.height / 2);
    ctx.scale(faceX, 1);
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.fillStyle = "#8d6748";
    ctx.fillRect(10, 14, 42, 20);
    ctx.fillStyle = "#f2d0a7";
    ctx.fillRect(40, 10, 20, 16);
    ctx.fillStyle = "#6e4c34";
    ctx.fillRect(4, 18, 10, 10);
    ctx.fillStyle = "#4b3525";
    ctx.fillRect(50, 6, 6, 8);
    ctx.fillRect(54, 8, 4, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(46, 14, 6, 4);
    ctx.fillStyle = "#222";
    ctx.fillRect(50, 14, 2, 2);
    ctx.fillRect(8, 34, 8, 12);
    ctx.fillRect(22, 34, 8, 12);
    ctx.fillRect(36, 34, 8, 12);
    ctx.fillRect(48, 34, 8, 12);

    const tailAngle = Math.sin(this.tailSwing * 2) * 0.45 + (game.isPetting ? 0.3 : 0);
    ctx.save();
    ctx.translate(8, 20);
    ctx.rotate(-tailAngle);
    ctx.fillStyle = "#6e4c34";
    ctx.fillRect(-16, -3, 18, 6);
    ctx.restore();

    ctx.restore();
  }
}

class Human {
  constructor(x, groundY) {
    this.width = 42;
    this.height = 100;
    this.x = x;
    this.y = groundY - this.height;
    this.maxHealth = CONFIG.humanHealth;
    this.reset();
  }

  reset() {
    this.health = this.maxHealth;
    this.hitFlash = 0;
  }

  damage() {
    this.health -= 1;
    this.hitFlash = 0.25;
  }

  update(dt) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);
  }

  draw(ctx, petting, petTime) {
    const flash = this.hitFlash > 0 ? "#ffd1d1" : "#ffd9b8";
    const armOffset = petting ? Math.sin(petTime * 12) * 4 : 0;

    ctx.fillStyle = "#3f6ea8";
    ctx.fillRect(this.x + 10, this.y + 30, 22, 42);
    ctx.fillStyle = "#224b74";
    ctx.fillRect(this.x + 10, this.y + 72, 9, 28);
    ctx.fillRect(this.x + 23, this.y + 72, 9, 28);
    ctx.fillStyle = flash;
    ctx.fillRect(this.x + 8, this.y + 4, 26, 26);
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(this.x + 6, this.y, 30, 10);
    ctx.fillStyle = "#ffd9b8";
    ctx.fillRect(this.x + 2, this.y + 34, 8, 24);

    ctx.save();
    ctx.translate(this.x + 32, this.y + 40);
    ctx.rotate(-0.45 + armOffset * 0.03);
    ctx.fillStyle = "#ffd9b8";
    ctx.fillRect(0, 0, 8, 28);
    ctx.restore();
  }
}

class Cat {
  constructor(x, groundY, speed) {
    this.width = 48;
    this.height = 30;
    this.x = x;
    this.y = groundY - this.height;
    this.speed = speed;
    this.scared = false;
    this.vx = -speed;
    this.vy = 0;
    this.dead = false;
    this.wiggle = rand(0, Math.PI * 2);
  }

  getBounds() {
    return { x: this.x + 4, y: this.y + 4, width: this.width - 8, height: this.height - 4 };
  }

  scare(direction) {
    this.scared = true;
    this.vx = Math.max(180, this.speed + 90) * direction;
    this.vy = -CONFIG.scareBounce;
  }

  update(dt) {
    this.wiggle += dt * 10;
    if (!this.scared) {
      this.x += this.vx * dt;
    } else {
      this.vy += CONFIG.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const groundLevel = CONFIG.groundY - this.height;
      if (this.y >= groundLevel) {
        this.y = groundLevel;
        this.vy = 0;
      }
      if (this.x > CONFIG.width + 80 || this.x + this.width < -80) this.dead = true;
    }
  }

  draw(ctx) {
    const bounce = Math.sin(this.wiggle) * 1.5;
    const y = this.y + bounce;

    ctx.fillStyle = this.scared ? "#c7c7c7" : "#8b8b9f";
    ctx.fillRect(this.x + 8, y + 10, 28, 16);
    ctx.fillRect(this.x + 30, y + 6, 14, 12);
    ctx.fillRect(this.x + 32, y + 2, 4, 6);
    ctx.fillRect(this.x + 40, y + 2, 4, 6);
    ctx.fillStyle = "#444";
    ctx.fillRect(this.x + 35, y + 10, 2, 2);
    ctx.fillRect(this.x + 41, y + 10, 2, 2);
    ctx.fillRect(this.x + 12, y + 24, 6, 8);
    ctx.fillRect(this.x + 24, y + 24, 6, 8);
    ctx.fillRect(this.x + 34, y + 24, 6, 8);

    ctx.save();
    ctx.translate(this.x + 8, y + 14);
    ctx.rotate(Math.sin(this.wiggle) * 0.4 + (this.scared ? 0.7 : 0));
    ctx.fillStyle = "#666";
    ctx.fillRect(-14, -2, 16, 4);
    ctx.restore();
  }
}

class Game {
  constructor() {
    this.human = new Human(220, CONFIG.groundY);
    this.dog = new Dog(100, CONFIG.groundY);
    this.clouds = [
      { x: 120, y: 78, speed: 10, size: 42 },
      { x: 430, y: 110, speed: 14, size: 52 },
      { x: 760, y: 65, speed: 8, size: 34 }
    ];
    this.reset();
  }

  reset() {
    this.state = "intro";
    this.isPetting = false;
    this.score = 0;
    this.spawnTimer = rand(CONFIG.spawnMin, CONFIG.spawnMax);
    this.cats = [];
    this.human.reset();
    this.dog.reset(100, CONFIG.groundY);
  }

  startPetting() {
    this.isPetting = true;
    this.dog.facing = 1;
    this.dog.x = this.human.x - this.dog.width + 12;
  }

  beginPlaying() {
    this.isPetting = false;
    this.state = "playing";
  }

  spawnCat() {
    this.cats.push(new Cat(CONFIG.width + 10, CONFIG.groundY, rand(CONFIG.catSpeedMin, CONFIG.catSpeedMax)));
  }

  update(dt) {
    this.dog.update(dt, this);
    this.human.update(dt);
    this.updateClouds(dt);

    if (this.state === "intro") {
      const closeEnough = this.dog.x + this.dog.width > this.human.x - 4;
      if (!this.isPetting && closeEnough) this.startPetting();
      if (this.isPetting && this.dog.petTimer >= CONFIG.petDuration) this.beginPlaying();
    } else if (this.state === "playing") {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnCat();
        this.spawnTimer = rand(CONFIG.spawnMin, CONFIG.spawnMax);
      }

      for (const cat of this.cats) cat.update(dt);
      this.handleCollisions();
      this.cats = this.cats.filter(cat => !cat.dead);
      if (this.human.health <= 0) this.state = "game over";
    } else if (this.state === "game over") {
      for (const cat of this.cats) cat.update(dt);
      this.cats = this.cats.filter(cat => !cat.dead);
    }
  }

  updateClouds(dt) {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cloud.size * 2 > CONFIG.width) cloud.x = -cloud.size * 3;
    }
  }

  handleCollisions() {
    const dogBounds = this.dog.getBounds();
    const dogIsActive = Math.abs(this.dog.vx) > 10 || !this.dog.onGround;

    for (const cat of this.cats) {
      if (!cat.scared && rectsOverlap(dogBounds, cat.getBounds()) && dogIsActive) {
        cat.scare(this.dog.facing >= 0 ? 1 : -1);
        this.score += 1;
      }

      if (!cat.scared && cat.x <= this.human.x + 16) {
        cat.dead = true;
        this.human.damage();
      }
    }
  }

  drawBackground(ctx) {
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    for (const cloud of this.clouds) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size * 0.55, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.6, cloud.y + 4, cloud.size * 0.45, 0, Math.PI * 2);
      ctx.arc(cloud.x - cloud.size * 0.6, cloud.y + 6, cloud.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#b9e39a";
    ctx.fillRect(0, CONFIG.groundY, CONFIG.width, CONFIG.height - CONFIG.groundY);
    ctx.fillStyle = "#7eb85c";
    ctx.fillRect(0, CONFIG.groundY, CONFIG.width, 18);
    ctx.fillStyle = "#a2704d";
    ctx.fillRect(0, CONFIG.groundY + 18, CONFIG.width, CONFIG.height - CONFIG.groundY - 18);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 9; i++) {
      ctx.fillRect(60 + i * 110, 410 + (i % 2) * 4, 32, 10);
    }
  }

  drawHud(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillRect(16, 16, 250, 82);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.12)";
    ctx.strokeRect(16, 16, 250, 82);

    ctx.fillStyle = "#173042";
    ctx.font = "bold 26px Trebuchet MS";
    ctx.fillText("Defend My Human", 30, 46);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Score: " + this.score, 30, 74);
    ctx.fillText("Health: " + this.human.health, 145, 74);

    for (let i = 0; i < this.human.maxHealth; i++) {
      const x = 280 + i * 26;
      const y = 24;
      const active = i < this.human.health;
      ctx.fillStyle = active ? "#ef6f6c" : "rgba(239,111,108,0.28)";
      ctx.beginPath();
      ctx.arc(x + 6, y + 8, 6, Math.PI, 0);
      ctx.arc(x + 16, y + 8, 6, Math.PI, 0);
      ctx.lineTo(x + 11, y + 22);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawMessagePanel(ctx, title, lines) {
    const panelW = 520;
    const panelH = 150;
    const x = (CONFIG.width - panelW) / 2;
    const y = 54;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillRect(x, y, panelW, panelH);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.18)";
    ctx.strokeRect(x, y, panelW, panelH);

    ctx.fillStyle = "#173042";
    ctx.font = "bold 34px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(title, CONFIG.width / 2, y + 42);
    ctx.font = "22px Trebuchet MS";
    lines.forEach((line, index) => ctx.fillText(line, CONFIG.width / 2, y + 82 + index * 30));
    ctx.textAlign = "left";
  }

  draw(ctx) {
    this.drawBackground(ctx);
    this.human.draw(ctx, this.isPetting, this.dog.petTimer);
    for (const cat of this.cats) cat.draw(ctx);
    this.dog.draw(ctx, this);
    this.drawHud(ctx);

    if (this.state === "intro") {
      this.drawMessagePanel(ctx, "Meet Your Human", [
        this.isPetting ? "Good dog. Getting a happy pet..." : "Walk to your human to start the mission.",
        "Move with Arrow Keys or A / D. Jump with Space."
      ]);
    } else if (this.state === "playing") {
      this.drawMessagePanel(ctx, "Scare Away The Cats", [
        "Bump into cats while moving or jumping to protect your human.",
        "If cats reach the human, health goes down."
      ]);
    } else if (this.state === "game over") {
      this.drawMessagePanel(ctx, "Game Over", [
        "Final score: " + this.score,
        "Press Enter to play again."
      ]);
    }
  }
}

const game = new Game();
let lastTime = 0;

function updateInput(key, pressed) {
  if (key === "ArrowLeft" || key === "a" || key === "A") keys.left = pressed;
  if (key === "ArrowRight" || key === "d" || key === "D") keys.right = pressed;
  if (key === " " || key === "Spacebar" || key === "Space") keys.jump = pressed;
}

window.addEventListener("keydown", (event) => {
  updateInput(event.key, true);
  if (["ArrowLeft", "ArrowRight", " ", "Spacebar", "Space"].includes(event.key)) event.preventDefault();
  if (game.state === "game over" && event.key === "Enter") game.reset();
});

window.addEventListener("keyup", (event) => updateInput(event.key, false));

// The main loop advances the simulation by delta time and redraws every frame.
function frame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = clamp((timestamp - lastTime) / 1000, 0, 0.033);
  lastTime = timestamp;
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
