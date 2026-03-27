const CONFIG = {
  width: 960,
  height: 540,
  groundY: 430,
  gravity: 1800,
  dogSpeed: 280,
  catPlayerSpeed: 250,
  jumpPower: 700,
  spawnMin: 0.95,
  spawnMax: 1.85,
  humanHealth: 5,
  petDuration: 1.2,
  humanPaceSpeed: 36,
  humanPaceRange: 48,
  catSpeedMin: 110,
  catSpeedMax: 195,
  scareBounce: 200,
  catRespawnDelay: 0.9,
  catJumpChancePerSecond: 0.65,
  catJumpPower: 980,
  normalCatHits: 2,
  strongCatHits: 3,
  strongCatEvery: 10,
  catHitCooldown: 0.35,
  ninjaSuitCost: 50,
  astronautSuitCost: 100,
  capeCost: 25,
  blueyCost: 15,
  basketballCost: 10,
  wizardCost: 150
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const SAVE_KEY = "defend-my-human-progress";
const mobileButtons = Array.from(document.querySelectorAll("[data-key]"));
const catControls = document.querySelector(".cat-controls");

const keys = {
  dogLeft: false,
  dogRight: false,
  dogJump: false,
  catLeft: false,
  catRight: false,
  catJump: false
};

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
      if (keys.dogLeft) this.vx -= CONFIG.dogSpeed;
      if (keys.dogRight) this.vx += CONFIG.dogSpeed;
      if (this.vx !== 0) this.facing = Math.sign(this.vx);

      if (game.state === "playing" && keys.dogJump && this.onGround) {
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

    ctx.fillStyle = "#c9935f";
    ctx.fillRect(12, 14, 38, 20);
    ctx.fillStyle = "#f8f3e7";
    ctx.fillRect(18, 18, 18, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(38, 8, 20, 20);
    ctx.fillRect(44, 24, 10, 6);
    ctx.fillStyle = "#7a5134";
    ctx.fillRect(38, 6, 10, 10);
    ctx.fillRect(46, 6, 10, 10);
    ctx.fillRect(6, 18, 10, 10);

    // Floppy ears help the dog read as a beagle silhouette.
    ctx.fillStyle = "#5a3a26";
    ctx.fillRect(42, 12, 6, 18);
    ctx.fillRect(52, 12, 6, 16);

    // Face details: black eyes and a dark beagle-like snout.
    ctx.fillStyle = "#111";
    ctx.fillRect(46, 14, 3, 3);
    ctx.fillRect(53, 14, 3, 3);
    ctx.fillRect(56, 18, 6, 6);
    ctx.fillRect(51, 20, 6, 4);

    ctx.fillStyle = "#4f3728";
    ctx.fillRect(9, 34, 8, 12);
    ctx.fillRect(22, 34, 8, 12);
    ctx.fillRect(35, 34, 8, 12);
    ctx.fillRect(46, 34, 8, 12);

    const tailAngle = Math.sin(this.tailSwing * 2) * 0.45 + (game.isPetting ? 0.3 : 0);
    ctx.save();
    ctx.translate(10, 20);
    ctx.rotate(-tailAngle);
    ctx.fillStyle = "#f7f7f7";
    ctx.fillRect(-16, -3, 18, 6);
    ctx.fillStyle = "#8a5b3d";
    ctx.fillRect(-16, -3, 12, 6);
    ctx.restore();

    ctx.restore();
  }
}

class Human {
  constructor(x, groundY) {
    this.width = 42;
    this.height = 100;
    this.baseX = x;
    this.x = x;
    this.y = groundY - this.height;
    this.maxHealth = CONFIG.humanHealth;
    this.reset();
  }

  reset() {
    this.x = this.baseX;
    this.health = this.maxHealth;
    this.hitFlash = 0;
    this.paceDirection = 1;
  }

  damage() {
    this.health -= 1;
    this.hitFlash = 0.25;
  }

  update(dt, game) {
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    if (game.state === "playing") {
      this.x += this.paceDirection * CONFIG.humanPaceSpeed * dt;
      const leftEdge = this.baseX - CONFIG.humanPaceRange;
      const rightEdge = this.baseX + CONFIG.humanPaceRange;

      if (this.x <= leftEdge) {
        this.x = leftEdge;
        this.paceDirection = 1;
      }

      if (this.x >= rightEdge) {
        this.x = rightEdge;
        this.paceDirection = -1;
      }
    }
  }

  draw(ctx, petting, petTime, outfit = "default", hasCape = false) {
    const flash = this.hitFlash > 0 ? "#ffd1d1" : "#ffd9b8";
    const armOffset = petting ? Math.sin(petTime * 12) * 4 : 0;
    const shirtColor =
      outfit === "ninja" ? "#15171f" :
      outfit === "astronaut" ? "#edf3fb" :
      outfit === "bluey" ? "#5a98d6" :
      outfit === "basketball" ? "#1c5b39" :
      outfit === "wizard" ? "#2f2320" :
      "#3f6ea8";
    const pantsColor =
      outfit === "ninja" ? "#0f1117" :
      outfit === "astronaut" ? "#d8e2ef" :
      outfit === "bluey" ? "#2d5f9c" :
      outfit === "basketball" ? "#ffffff" :
      outfit === "wizard" ? "#1c1718" :
      "#224b74";
    const armColor =
      outfit === "ninja" ? "#11131a" :
      outfit === "astronaut" ? "#edf3fb" :
      outfit === "bluey" ? "#5a98d6" :
      outfit === "wizard" ? "#2f2320" :
      "#ffd9b8";

    if (hasCape) {
      ctx.fillStyle = "#d63f5c";
      ctx.fillRect(this.x + 6, this.y + 30, 8, 44);
      ctx.fillRect(this.x + 2, this.y + 38, 12, 36);
    }

    ctx.fillStyle = shirtColor;
    ctx.fillRect(this.x + 10, this.y + 30, 22, 42);
    ctx.fillStyle = pantsColor;
    ctx.fillRect(this.x + 10, this.y + 72, 9, 28);
    ctx.fillRect(this.x + 23, this.y + 72, 9, 28);
    ctx.fillStyle = flash;
    ctx.fillRect(this.x + 8, this.y + 4, 26, 26);
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(this.x + 6, this.y, 30, 10);
    ctx.fillStyle = armColor;
    ctx.fillRect(this.x + 2, this.y + 34, 8, 24);

    if (outfit === "ninja") {
      ctx.fillStyle = "#11131a";
      ctx.fillRect(this.x + 6, this.y + 10, 30, 14);
      ctx.fillStyle = flash;
      ctx.fillRect(this.x + 16, this.y + 14, 10, 5);
      ctx.fillStyle = "#c14b3f";
      ctx.fillRect(this.x + 9, this.y + 48, 24, 4);
    }

    if (outfit === "astronaut") {
      ctx.fillStyle = "#c4d4e6";
      ctx.fillRect(this.x + 6, this.y + 2, 30, 28);
      ctx.fillStyle = "#7db4dc";
      ctx.fillRect(this.x + 11, this.y + 8, 20, 14);
      ctx.fillStyle = "#96a9bc";
      ctx.fillRect(this.x + 16, this.y + 24, 10, 6);
      ctx.fillRect(this.x + 9, this.y + 50, 24, 4);
      ctx.fillRect(this.x + 8, this.y + 72, 4, 10);
      ctx.fillRect(this.x + 30, this.y + 72, 4, 10);
    }

    if (outfit === "bluey") {
      ctx.fillStyle = "#2c5d8f";
      ctx.fillRect(this.x + 7, this.y + 4, 7, 10);
      ctx.fillRect(this.x + 28, this.y + 4, 7, 10);
      ctx.fillRect(this.x + 8, this.y + 18, 5, 8);
      ctx.fillRect(this.x + 30, this.y + 18, 4, 8);
      ctx.fillStyle = "#9fd0f2";
      ctx.fillRect(this.x + 15, this.y + 12, 12, 6);
      ctx.fillRect(this.x + 14, this.y + 40, 14, 6);
    }

    if (outfit === "basketball") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(this.x + 14, this.y + 36, 14, 18);
      ctx.fillStyle = "#1c5b39";
      ctx.fillRect(this.x + 16, this.y + 38, 10, 3);
      ctx.fillRect(this.x + 17, this.y + 44, 8, 3);
      ctx.fillRect(this.x + 18, this.y + 50, 6, 3);
      ctx.fillRect(this.x + 10, this.y + 72, 9, 12);
      ctx.fillRect(this.x + 23, this.y + 72, 9, 12);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(this.x + 17, this.y + 38, 8, 2);
      ctx.fillRect(this.x + 17, this.y + 38, 2, 4);
      ctx.fillRect(this.x + 17, this.y + 41, 7, 2);
      ctx.fillRect(this.x + 22, this.y + 41, 2, 4);
      ctx.fillRect(this.x + 16, this.y + 44, 8, 2);
      ctx.fillRect(this.x + 10, this.y + 72, 9, 3);
      ctx.fillRect(this.x + 23, this.y + 72, 9, 3);
    }

    if (outfit === "wizard") {
      ctx.fillStyle = "#1e1819";
      ctx.fillRect(this.x + 6, this.y + 30, 30, 56);
      ctx.fillStyle = "#8a7b37";
      ctx.fillRect(this.x + 20, this.y + 34, 3, 48);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(this.x + 12, this.y + 34, 5, 20);
      ctx.fillRect(this.x + 26, this.y + 34, 5, 20);
      ctx.fillRect(this.x + 18, this.y + 34, 2, 10);
      ctx.fillRect(this.x + 23, this.y + 34, 2, 10);
      ctx.fillStyle = "#2f2320";
      ctx.fillRect(this.x + 8, this.y + 6, 26, 5);
      ctx.fillRect(this.x + 7, this.y + 10, 5, 6);
      ctx.fillRect(this.x + 30, this.y + 10, 5, 6);
      ctx.fillStyle = "#1f1f1f";
      ctx.fillRect(this.x + 11, this.y + 13, 6, 1);
      ctx.fillRect(this.x + 11, this.y + 18, 6, 1);
      ctx.fillRect(this.x + 11, this.y + 14, 1, 4);
      ctx.fillRect(this.x + 16, this.y + 14, 1, 4);
      ctx.fillRect(this.x + 17, this.y + 15, 6, 1);
      ctx.fillRect(this.x + 23, this.y + 13, 6, 1);
      ctx.fillRect(this.x + 23, this.y + 18, 6, 1);
      ctx.fillRect(this.x + 23, this.y + 14, 1, 4);
      ctx.fillRect(this.x + 28, this.y + 14, 1, 4);
      ctx.fillStyle = "#cf3f37";
      ctx.fillRect(this.x + 17, this.y + 8, 2, 4);
      ctx.fillRect(this.x + 19, this.y + 10, 2, 2);
      ctx.fillRect(this.x + 18, this.y + 12, 2, 4);
    }

    ctx.save();
    ctx.translate(this.x + 32, this.y + 40);
    ctx.rotate(-0.45 + armOffset * 0.03);
    ctx.fillStyle = armColor;
    ctx.fillRect(0, 0, 8, 28);
    if (outfit === "wizard") {
      ctx.fillStyle = "#6a472c";
      ctx.fillRect(7, 16, 12, 2);
      ctx.fillStyle = "#f5de8a";
      ctx.fillRect(18, 15, 2, 3);
    }
    ctx.restore();
  }
}

class Cat {
  constructor(x, groundY, speed, hitsToDefeat = CONFIG.normalCatHits) {
    this.width = 48;
    this.height = 30;
    this.spawnX = x;
    this.reset(x, groundY, speed, hitsToDefeat);
  }

  reset(x, groundY, speed = this.speed || CONFIG.catSpeedMin, hitsToDefeat = this.maxHits || CONFIG.normalCatHits) {
    this.x = x;
    this.y = groundY - this.height;
    this.speed = speed;
    this.maxHits = hitsToDefeat;
    this.hitsRemaining = hitsToDefeat;
    this.isStrong = hitsToDefeat >= CONFIG.strongCatHits;
    this.scared = false;
    this.vx = -speed;
    this.vy = 0;
    this.dead = false;
    this.wiggle = rand(0, Math.PI * 2);
    this.onGround = true;
    this.jumpCooldown = rand(0.2, 1.1);
    this.hitCooldown = 0;
  }

  getBounds() {
    return { x: this.x + 4, y: this.y + 4, width: this.width - 8, height: this.height - 4 };
  }

  bonk(direction) {
    if (this.hitCooldown > 0 || this.scared) {
      return false;
    }

    this.hitCooldown = CONFIG.catHitCooldown;
    this.hitsRemaining -= 1;
    if (this.hitsRemaining <= 0) {
      this.scare(direction);
      return true;
    }

    this.vx = -Math.abs(this.speed) * 0.65;
    this.vy = -150;
    this.onGround = false;
    return false;
  }

  scare(direction) {
    this.scared = true;
    this.vx = Math.max(180, this.speed + 90) * direction;
    this.vy = -CONFIG.scareBounce;
    this.onGround = false;
  }

  update(dt) {
    this.wiggle += dt * 10;
    this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (!this.scared) {
      this.jumpCooldown -= dt;
      if (this.onGround && this.jumpCooldown <= 0 && Math.random() < CONFIG.catJumpChancePerSecond * dt) {
        this.vy = -CONFIG.catJumpPower;
        this.onGround = false;
        this.jumpCooldown = rand(0.8, 1.8);
      }

      this.vy += CONFIG.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      const groundLevel = CONFIG.groundY - this.height;
      if (this.y >= groundLevel) {
        this.y = groundLevel;
        this.vy = 0;
        this.onGround = true;
      }
    } else {
      this.vy += CONFIG.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const groundLevel = CONFIG.groundY - this.height;
      if (this.y >= groundLevel) {
        this.y = groundLevel;
        this.vy = 0;
        this.onGround = true;
      }
      if (this.x > CONFIG.width + 80 || this.x + this.width < -80) this.dead = true;
    }
  }

  draw(ctx, tint = null) {
    const bounce = Math.sin(this.wiggle) * 1.5;
    const y = this.y + bounce;
    const bodyColor = tint || (this.scared ? "#c7c7c7" : this.isStrong ? "#d5a46a" : "#8b8b9f");
    const stripeColor = this.isStrong ? "#8c5a2d" : "#444";

    ctx.fillStyle = bodyColor;
    ctx.fillRect(this.x + 8, y + 10, 28, 16);
    ctx.fillRect(this.x + 30, y + 6, 14, 12);
    ctx.fillRect(this.x + 32, y + 2, 4, 6);
    ctx.fillRect(this.x + 40, y + 2, 4, 6);
    ctx.fillStyle = stripeColor;
    ctx.fillRect(this.x + 35, y + 10, 2, 2);
    ctx.fillRect(this.x + 41, y + 10, 2, 2);
    ctx.fillRect(this.x + 12, y + 24, 6, 8);
    ctx.fillRect(this.x + 24, y + 24, 6, 8);
    ctx.fillRect(this.x + 34, y + 24, 6, 8);

    if (!this.scared && this.isStrong) {
      ctx.fillRect(this.x + 14, y + 12, 14, 3);
      ctx.fillRect(this.x + 17, y + 17, 10, 3);
      ctx.fillRect(this.x + 32, y + 8, 8, 2);
    }

    ctx.save();
    ctx.translate(this.x + 8, y + 14);
    ctx.rotate(Math.sin(this.wiggle) * 0.4 + (this.scared ? 0.7 : 0));
    ctx.fillStyle = this.isStrong ? "#8c5a2d" : "#666";
    ctx.fillRect(-14, -2, 16, 4);
    ctx.restore();

    if (!this.scared && this.maxHits > 1) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillRect(this.x + 8, y - 8, 20, 10);
      ctx.fillStyle = "#173042";
      ctx.font = "bold 10px Trebuchet MS";
      ctx.fillText(String(this.hitsRemaining), this.x + 15, y);
    }

    if (!this.scared && this.isStrong) {
      ctx.fillStyle = "#ffb347";
      ctx.fillRect(this.x + 30, y - 8, 12, 10);
      ctx.fillStyle = "#173042";
      ctx.font = "bold 10px Trebuchet MS";
      ctx.fillText("!", this.x + 34, y);
    }
  }
}

class PlayerCat extends Cat {
  constructor(x, groundY) {
    super(x, groundY, CONFIG.catPlayerSpeed, CONFIG.normalCatHits);
    this.respawnTimer = 0;
    this.visible = true;
  }

  respawn(hitsToDefeat = this.maxHits || CONFIG.normalCatHits) {
    this.reset(CONFIG.width - 110, CONFIG.groundY, CONFIG.catPlayerSpeed, hitsToDefeat);
    this.facing = -1;
    this.visible = true;
    this.respawnTimer = 0;
  }

  getBounds() {
    if (!this.visible) {
      return { x: -9999, y: -9999, width: 0, height: 0 };
    }
    return super.getBounds();
  }

  taggedByDog(direction) {
    const defeated = this.bonk(direction);
    if (!defeated) return false;

    this.visible = false;
    this.respawnTimer = CONFIG.catRespawnDelay;
    this.scared = false;
    this.vx = 0;
    this.vy = 0;
    this.facing = direction;
    return true;
  }

  update(dt) {
    this.wiggle += dt * 10;

    if (!this.visible) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    this.vx = 0;
    if (keys.catLeft) this.vx -= CONFIG.catPlayerSpeed;
    if (keys.catRight) this.vx += CONFIG.catPlayerSpeed;
    if (this.vx !== 0) this.facing = Math.sign(this.vx);

    if (keys.catJump && this.onGround) {
      this.vy = -CONFIG.jumpPower;
      this.onGround = false;
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

  draw(ctx) {
    if (!this.visible) return;
    super.draw(ctx, "#b383c7");
  }
}

class Game {
  constructor() {
    this.human = new Human(220, CONFIG.groundY);
    this.dog = new Dog(100, CONFIG.groundY);
    this.playerCat = new PlayerCat(CONFIG.width - 110, CONFIG.groundY);
    this.clouds = [
      { x: 120, y: 78, speed: 10, size: 42 },
      { x: 430, y: 110, speed: 14, size: 52 },
      { x: 760, y: 65, speed: 8, size: 34 }
    ];
    this.mode = "single";
    this.coins = 0;
    this.roundCoinsEarned = 0;
    this.totalCatsDefeated = 0;
    this.nextShopBreakAt = 25;
    this.catSpawnCount = 0;
    this.menuSelection = 0;
    this.shopSelection = 0;
    this.ownedItems = { ninjaSuit: false, astronautSuit: false, cape: false, bluey: false, basketball: false, wizard: false };
    this.equippedOutfit = "default";
    this.capeEquipped = false;
    this.loadProgress();
    this.enterMenu();
  }

  get isTwoPlayer() {
    return this.mode === "two-player";
  }

  resetRound(nextMode = this.mode) {
    this.mode = nextMode;
    this.state = "intro";
    this.isPetting = false;
    this.score = 0;
    this.catScore = 0;
    this.roundCoinsEarned = 0;
    this.catSpawnCount = 0;
    this.spawnTimer = rand(CONFIG.spawnMin, CONFIG.spawnMax);
    this.cats = [];
    this.human.reset();
    this.dog.reset(100, CONFIG.groundY);
    this.playerCat.respawn(CONFIG.normalCatHits);
    this.playerCat.visible = false;
  }

  setMode(mode) {
    this.mode = mode;
  }

  loadProgress() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);
      this.coins = typeof data.coins === "number" ? data.coins : this.coins;
      this.ownedItems = { ...this.ownedItems, ...(data.ownedItems || {}) };
      this.equippedOutfit = typeof data.equippedOutfit === "string" ? data.equippedOutfit : this.equippedOutfit;
      this.capeEquipped = Boolean(data.capeEquipped);
    } catch (error) {
      console.warn("Could not load saved progress.", error);
    }
  }

  saveProgress() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: this.coins,
        ownedItems: this.ownedItems,
        equippedOutfit: this.equippedOutfit,
        capeEquipped: this.capeEquipped
      }));
    } catch (error) {
      console.warn("Could not save progress.", error);
    }
  }

  enterMenu() {
    this.state = "menu";
    this.menuSelection = 0;
    this.isPetting = false;
    this.score = 0;
    this.catScore = 0;
    this.roundCoinsEarned = 0;
    this.cats = [];
    this.human.reset();
    this.dog.reset(110, CONFIG.groundY);
    this.dog.facing = 1;
    this.playerCat.respawn(CONFIG.normalCatHits);
    this.playerCat.visible = false;
  }

  openShop() {
    this.state = "shop";
    this.shopSelection = 0;
    this.human.reset();
    this.human.x = 260;
    this.dog.reset(130, CONFIG.groundY);
    this.dog.facing = 1;
  }

  startGame() {
    this.resetRound(this.mode);
  }

  awardCatDefeat() {
    this.score += 1;
    this.coins += 1;
    this.roundCoinsEarned += 1;
    this.totalCatsDefeated += 1;
    this.saveProgress();

    if (this.totalCatsDefeated >= this.nextShopBreakAt) {
      this.nextShopBreakAt += 25;
      this.state = "shop-break";
    }
  }

  buyOrToggleItem(itemKey) {
    if (itemKey === "ninjaSuit") {
      if (!this.ownedItems.ninjaSuit) {
        if (this.coins >= CONFIG.ninjaSuitCost) {
          this.coins -= CONFIG.ninjaSuitCost;
          this.ownedItems.ninjaSuit = true;
          this.equippedOutfit = "ninja";
          this.saveProgress();
        }
        return;
      }

      this.equippedOutfit = this.equippedOutfit === "ninja" ? "default" : "ninja";
      this.saveProgress();
    }

    if (itemKey === "astronautSuit") {
      if (!this.ownedItems.astronautSuit) {
        if (this.coins >= CONFIG.astronautSuitCost) {
          this.coins -= CONFIG.astronautSuitCost;
          this.ownedItems.astronautSuit = true;
          this.equippedOutfit = "astronaut";
          this.saveProgress();
        }
        return;
      }

      this.equippedOutfit = this.equippedOutfit === "astronaut" ? "default" : "astronaut";
      this.saveProgress();
    }

    if (itemKey === "cape") {
      if (!this.ownedItems.cape) {
        if (this.coins >= CONFIG.capeCost) {
          this.coins -= CONFIG.capeCost;
          this.ownedItems.cape = true;
          this.capeEquipped = true;
          this.saveProgress();
        }
        return;
      }

      this.capeEquipped = !this.capeEquipped;
      this.saveProgress();
    }

    if (itemKey === "bluey") {
      if (!this.ownedItems.bluey) {
        if (this.coins >= CONFIG.blueyCost) {
          this.coins -= CONFIG.blueyCost;
          this.ownedItems.bluey = true;
          this.equippedOutfit = "bluey";
          this.saveProgress();
        }
        return;
      }

      this.equippedOutfit = this.equippedOutfit === "bluey" ? "default" : "bluey";
      this.saveProgress();
    }

    if (itemKey === "basketball") {
      if (!this.ownedItems.basketball) {
        if (this.coins >= CONFIG.basketballCost) {
          this.coins -= CONFIG.basketballCost;
          this.ownedItems.basketball = true;
          this.equippedOutfit = "basketball";
          this.saveProgress();
        }
        return;
      }

      this.equippedOutfit = this.equippedOutfit === "basketball" ? "default" : "basketball";
      this.saveProgress();
    }

    if (itemKey === "wizard") {
      if (!this.ownedItems.wizard) {
        if (this.coins >= CONFIG.wizardCost) {
          this.coins -= CONFIG.wizardCost;
          this.ownedItems.wizard = true;
          this.equippedOutfit = "wizard";
          this.saveProgress();
        }
        return;
      }

      this.equippedOutfit = this.equippedOutfit === "wizard" ? "default" : "wizard";
      this.saveProgress();
    }
  }

  startPetting() {
    this.isPetting = true;
    this.dog.facing = 1;
    this.dog.x = this.human.x - this.dog.width + 12;
  }

  beginPlaying() {
    this.isPetting = false;
    this.state = "playing";
    if (this.isTwoPlayer) this.playerCat.respawn();
  }

  spawnCat() {
    this.catSpawnCount += 1;
    const hitsToDefeat = this.catSpawnCount % CONFIG.strongCatEvery === 0 ? CONFIG.strongCatHits : CONFIG.normalCatHits;
    this.cats.push(new Cat(CONFIG.width + 10, CONFIG.groundY, rand(CONFIG.catSpeedMin, CONFIG.catSpeedMax), hitsToDefeat));
  }

  update(dt) {
    this.updateClouds(dt);

    if (this.state === "menu" || this.state === "shop" || this.state === "shop-break") {
      return;
    }

    this.dog.update(dt, this);
    this.human.update(dt, this);

    if (this.state === "intro") {
      const closeEnough = this.dog.x + this.dog.width > this.human.x - 4;
      if (!this.isPetting && closeEnough) this.startPetting();
      if (this.isPetting && this.dog.petTimer >= CONFIG.petDuration) this.beginPlaying();
      return;
    }

    if (this.state === "playing") {
      if (this.isTwoPlayer) {
        this.playerCat.update(dt);
        this.handleTwoPlayerCollisions();
      } else {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnCat();
          this.spawnTimer = rand(CONFIG.spawnMin, CONFIG.spawnMax);
        }

        for (const cat of this.cats) cat.update(dt);
        this.handleSinglePlayerCollisions();
        this.cats = this.cats.filter(cat => !cat.dead);
      }

      if (this.human.health <= 0) this.finishRound();
      return;
    }

    if (this.state === "game over" && !this.isTwoPlayer) {
      for (const cat of this.cats) cat.update(dt);
      this.cats = this.cats.filter(cat => !cat.dead);
    }
  }

  finishRound() {
    this.state = "game over";
  }

  updateClouds(dt) {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x - cloud.size * 2 > CONFIG.width) cloud.x = -cloud.size * 3;
    }
  }

  handleSinglePlayerCollisions() {
    const dogBounds = this.dog.getBounds();
    const dogIsActive = Math.abs(this.dog.vx) > 10 || !this.dog.onGround;

    for (const cat of this.cats) {
      if (!cat.scared && rectsOverlap(dogBounds, cat.getBounds()) && dogIsActive) {
        const defeated = cat.bonk(this.dog.facing >= 0 ? 1 : -1);
        if (defeated) this.awardCatDefeat();
      }

      if (!cat.scared && cat.x <= this.human.x + 16) {
        cat.dead = true;
        this.human.damage();
      }
    }
  }

  handleTwoPlayerCollisions() {
    if (!this.playerCat.visible) return;

    const dogBounds = this.dog.getBounds();
    const catBounds = this.playerCat.getBounds();
    const dogIsActive = Math.abs(this.dog.vx) > 10 || !this.dog.onGround;

    if (rectsOverlap(dogBounds, catBounds) && dogIsActive) {
      const defeated = this.playerCat.taggedByDog(this.dog.facing >= 0 ? 1 : -1);
      if (defeated) {
        this.awardCatDefeat();
        this.catSpawnCount += 1;
        const nextHits = this.catSpawnCount % CONFIG.strongCatEvery === 0 ? CONFIG.strongCatHits : CONFIG.normalCatHits;
        this.playerCat.maxHits = nextHits;
      }
      return;
    }

    if (this.playerCat.x <= this.human.x + 16) {
      this.human.damage();
      this.catScore += 1;
      this.playerCat.taggedByDog(-1);
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
    ctx.fillRect(16, 16, this.isTwoPlayer ? 450 : 330, 82);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.12)";
    ctx.strokeRect(16, 16, this.isTwoPlayer ? 450 : 330, 82);

    ctx.fillStyle = "#173042";
    ctx.font = "bold 26px Trebuchet MS";
    ctx.fillText("Eliza Defends Her Human", 30, 46);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Dog Score: " + this.score, 30, 74);
    if (this.isTwoPlayer) {
      ctx.fillText("Cat Score: " + this.catScore, 155, 74);
      ctx.fillText("Mode: 2P", 280, 74);
    } else {
      ctx.fillText("Health: " + this.human.health, 145, 74);
    }
    ctx.fillText("Coins: " + this.coins, this.isTwoPlayer ? 350 : 240, 74);

    for (let i = 0; i < this.human.maxHealth; i++) {
      const x = this.isTwoPlayer ? 480 + i * 26 : 360 + i * 26;
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
    const panelW = 650;
    const panelH = 170;
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

  drawFooterHint(ctx, text) {
    const hintW = 620;
    const hintH = 44;
    const x = (CONFIG.width - hintW) / 2;
    const y = CONFIG.height - 66;

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillRect(x, y, hintW, hintH);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.14)";
    ctx.strokeRect(x, y, hintW, hintH);

    ctx.fillStyle = "#173042";
    ctx.font = "18px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(text, CONFIG.width / 2, y + 28);
    ctx.textAlign = "left";
  }

  drawMenu(ctx) {
    const panelX = 120;
    const panelY = 110;
    const panelW = 380;
    const panelH = 270;
    const options = [
      "Play Game",
      "Shop",
      "Mode: " + (this.isTwoPlayer ? "Two-Player" : "Single-Player")
    ];

    this.human.x = 610;
    this.human.draw(ctx, false, 0, this.equippedOutfit, this.capeEquipped);
    this.dog.x = 520;
    this.dog.draw(ctx, this);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.16)";
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = "#173042";
    ctx.font = "bold 42px Trebuchet MS";
    ctx.fillText("Eliza Defends Her Human", panelX + 28, panelY + 56);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Coins: " + this.coins, panelX + 28, panelY + 92);

    options.forEach((option, index) => {
      const y = panelY + 130 + index * 52;
      const selected = index === this.menuSelection;
      ctx.fillStyle = selected ? "#ffb347" : "rgba(23, 48, 66, 0.08)";
      ctx.fillRect(panelX + 22, y - 28, panelW - 44, 38);
      ctx.fillStyle = "#173042";
      ctx.fillText((selected ? "> " : "") + option, panelX + 36, y);
    });

    this.drawFooterHint(ctx, "Use Up/Down and Enter. Eliza earns coins by defeating cats.");
  }

  drawShop(ctx) {
    const panelX = 110;
    const panelY = 88;
    const panelW = 560;
    const panelH = 300;
    const ninjaLabel = this.ownedItems.ninjaSuit ? (this.equippedOutfit === "ninja" ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.ninjaSuitCost + " coins";
    const astronautLabel = this.ownedItems.astronautSuit ? (this.equippedOutfit === "astronaut" ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.astronautSuitCost + " coins";
    const capeLabel = this.ownedItems.cape ? (this.capeEquipped ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.capeCost + " coins";
    const blueyLabel = this.ownedItems.bluey ? (this.equippedOutfit === "bluey" ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.blueyCost + " coins";
    const basketballLabel = this.ownedItems.basketball ? (this.equippedOutfit === "basketball" ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.basketballCost + " coins";
    const wizardLabel = this.ownedItems.wizard ? (this.equippedOutfit === "wizard" ? "Owned - Equipped" : "Owned - Equip") : "Buy for " + CONFIG.wizardCost + " coins";
    const options = [
      "Bluey Costume  |  " + blueyLabel,
      "Hero Cape  |  " + capeLabel,
      "Basketball Uniform  |  " + basketballLabel,
      "Human Ninja Suit  |  " + ninjaLabel,
      "Astronaut Suit  |  " + astronautLabel,
      "Wizard School Outfit  |  " + wizardLabel,
      "Back"
    ];

    this.human.x = 765;
    const previewOutfit =
      this.shopSelection === 0 ? "bluey" :
      this.shopSelection === 2 ? "basketball" :
      this.shopSelection === 3 ? "ninja" :
      this.shopSelection === 4 ? "astronaut" :
      this.shopSelection === 5 ? "wizard" :
      this.equippedOutfit;
    const previewCape = this.shopSelection === 1 ? true : this.capeEquipped;
    this.human.draw(ctx, false, 0, previewOutfit, previewCape);

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = "rgba(23, 48, 66, 0.16)";
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = "#173042";
    ctx.font = "bold 38px Trebuchet MS";
    ctx.fillText("Human Outfit Shop", panelX + 24, panelY + 52);
    ctx.font = "22px Trebuchet MS";
    ctx.fillText("Coins: " + this.coins, panelX + 24, panelY + 92);

    options.forEach((option, index) => {
      const y = panelY + 112 + index * 26;
      const selected = index === this.shopSelection;
      ctx.fillStyle = selected ? "#ffb347" : "rgba(23, 48, 66, 0.08)";
      ctx.fillRect(panelX + 24, y - 30, 360, 42);
      ctx.fillStyle = "#173042";
      ctx.fillText((selected ? "> " : "") + option, panelX + 38, y);
    });

    ctx.font = "18px Trebuchet MS";
    ctx.fillText("Astronaut plus cape is allowed, and yes, wizard capes are fun too.", panelX + 24, panelY + 274);
    this.drawFooterHint(ctx, "Use Up/Down and Enter. Press Escape to go back to the menu.");
  }

  draw(ctx) {
    this.drawBackground(ctx);
    
    if (this.state === "menu") {
      this.drawMenu(ctx);
      return;
    }

    if (this.state === "shop") {
      this.drawShop(ctx);
      return;
    }

    if (this.state === "shop-break") {
      this.human.draw(ctx, false, 0, this.equippedOutfit, this.capeEquipped);
      if (this.isTwoPlayer) {
        this.playerCat.draw(ctx);
      } else {
        for (const cat of this.cats) cat.draw(ctx);
      }
      this.dog.draw(ctx, this);
      this.drawHud(ctx);
      this.drawMessagePanel(ctx, "Shopping Break", [
        "You have defeated " + this.totalCatsDefeated + " cats and earned " + this.coins + " coins.",
        "Press Up or Enter for the shop menu, or Right to keep playing."
      ]);
      return;
    }

    this.human.draw(ctx, this.isPetting, this.dog.petTimer, this.equippedOutfit, this.capeEquipped);
    if (this.isTwoPlayer) {
      this.playerCat.draw(ctx);
    } else {
      for (const cat of this.cats) cat.draw(ctx);
    }
    this.dog.draw(ctx, this);
    this.drawHud(ctx);

    if (this.state === "intro") {
      this.drawMessagePanel(ctx, "Choose Your Mode", [
        this.mode === "two-player" ? "Two-player: Eliza uses Arrows, Cat uses A / D / W." : "Single-player: Eliza protects her human from sneaky cats.",
        "Press 1 for single-player or 2 for two-player. Walk Eliza to her human to begin."
      ]);
    } else if (this.state === "playing") {
      this.drawMessagePanel(ctx, this.isTwoPlayer ? "Dog Vs Cat" : "Scare Away The Cats", this.isTwoPlayer ? [
        "Eliza: Left / Right / Up Arrow. Cat: A / D / W.",
        "Eliza scores by tagging the cat. Cat scores by reaching the human."
      ] : [
        "Use Eliza to bump into cats while moving or jumping to protect her human.",
        "If cats reach the human, health goes down."
      ]);
    } else if (this.state === "game over") {
      this.drawMessagePanel(ctx, "Game Over", this.isTwoPlayer ? [
        "Dog score: " + this.score + "   Cat score: " + this.catScore,
        "Coins earned this round: " + this.roundCoinsEarned + "   Press Enter to replay or M for menu."
      ] : [
        "Final score: " + this.score + "   Coins earned this round: " + this.roundCoinsEarned,
        "Press Enter to play again, or M for menu."
      ]);
    }
  }
}

const game = new Game();
let lastTime = 0;

function updateInput(key, pressed) {
  if (key === "ArrowLeft") keys.dogLeft = pressed;
  if (key === "ArrowRight") keys.dogRight = pressed;
  if (key === "ArrowUp") keys.dogJump = pressed;
  if (key === "a" || key === "A") keys.catLeft = pressed;
  if (key === "d" || key === "D") keys.catRight = pressed;
  if (key === "w" || key === "W") keys.catJump = pressed;
}

function handleGameCommand(key) {
  if (game.state === "menu") {
    if (key === "ArrowUp") game.menuSelection = (game.menuSelection + 2) % 3;
    if (key === "ArrowDown") game.menuSelection = (game.menuSelection + 1) % 3;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      if (game.menuSelection === 2) game.setMode(game.mode === "single" ? "two-player" : "single");
    }
    if (key === "Enter") {
      if (game.menuSelection === 0) game.startGame();
      if (game.menuSelection === 1) game.openShop();
      if (game.menuSelection === 2) game.setMode(game.mode === "single" ? "two-player" : "single");
    }
    return;
  }

  if (game.state === "shop") {
    if (key === "ArrowUp") game.shopSelection = (game.shopSelection + 6) % 7;
    if (key === "ArrowDown") game.shopSelection = (game.shopSelection + 1) % 7;
    if (key === "Enter") {
      if (game.shopSelection === 0) game.buyOrToggleItem("bluey");
      if (game.shopSelection === 1) game.buyOrToggleItem("cape");
      if (game.shopSelection === 2) game.buyOrToggleItem("basketball");
      if (game.shopSelection === 3) game.buyOrToggleItem("ninjaSuit");
      if (game.shopSelection === 4) game.buyOrToggleItem("astronautSuit");
      if (game.shopSelection === 5) game.buyOrToggleItem("wizard");
      if (game.shopSelection === 6) game.enterMenu();
    }
    if (key === "Escape") game.enterMenu();
    return;
  }

  if (game.state === "shop-break") {
    if (key === "ArrowUp" || key === "Enter" || key === "Escape") game.enterMenu();
    if (key === "ArrowRight") game.state = "playing";
    return;
  }

  if (key === "1" && game.mode !== "single") game.setMode("single");
  if (key === "2" && game.mode !== "two-player") game.setMode("two-player");
  if (game.state === "game over" && key === "Enter") game.startGame();
  if ((game.state === "game over" || game.state === "playing" || game.state === "intro") && key === "Escape") game.enterMenu();
  if (game.state === "game over" && (key === "m" || key === "M")) game.enterMenu();
}

function pressVirtualKey(key) {
  updateInput(key, true);
  handleGameCommand(key);
}

function releaseVirtualKey(key) {
  updateInput(key, false);
}

function syncMobileLayout() {
  document.body.classList.toggle("two-player-mode", game.mode === "two-player");
  if (catControls) {
    catControls.classList.toggle("is-visible", game.mode === "two-player");
  }
}

window.addEventListener("keydown", (event) => {
  const inGameplay = ["intro", "playing", "game over"].includes(game.state);
  if (inGameplay) updateInput(event.key, true);

  if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
    event.preventDefault();
  }
  handleGameCommand(event.key);
});

window.addEventListener("keyup", (event) => {
  updateInput(event.key, false);
});

for (const button of mobileButtons) {
  const { key } = button.dataset;
  let lastTouchAt = 0;
  let lastPressAt = 0;

  const startPress = (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastPressAt < 250) return;
    lastPressAt = now;
    if (event.type.startsWith("touch")) lastTouchAt = Date.now();
    button.classList.add("is-active");
    pressVirtualKey(key);
  };

  const endPress = (event) => {
    event.preventDefault();
    if (event.type.startsWith("touch")) lastTouchAt = Date.now();
    button.classList.remove("is-active");
    releaseVirtualKey(key);
  };

  const tapPress = (event) => {
    event.preventDefault();
    const now = Date.now();
    if (now - lastTouchAt < 500) return;
    if (now - lastPressAt < 250) return;
    lastPressAt = now;
    button.classList.add("is-active");
    pressVirtualKey(key);
    window.setTimeout(() => {
      button.classList.remove("is-active");
      releaseVirtualKey(key);
    }, 120);
  };

  button.addEventListener("pointerdown", startPress);
  button.addEventListener("pointerup", endPress);
  button.addEventListener("pointerleave", endPress);
  button.addEventListener("pointercancel", endPress);
  button.addEventListener("touchstart", startPress, { passive: false });
  button.addEventListener("touchend", endPress, { passive: false });
  button.addEventListener("touchcancel", endPress, { passive: false });
  button.addEventListener("click", tapPress);
}

// The main loop advances the simulation by delta time and redraws every frame.
function frame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = clamp((timestamp - lastTime) / 1000, 0, 0.033);
  lastTime = timestamp;

  syncMobileLayout();
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
