import { horizontalOverlap } from "../core/AABB.js";
import { updateAbilityState, useAbility } from "../abilities/AbilityBase.js";

const DROP_THROUGH_TIME = 0.22;
const GROUND_EPSILON = 5;
const DEFAULT_STAMINA = {
  regenRate: 25,
  regenDelay: 0.6,
};
const DEFAULT_MOVEMENT = {
  acceleration: 1850,
  friction: 1450,
  gravity: 1750,
  maxFallSpeed: 900,
};

export class CharacterBase {
  constructor(data, spawn, controls, playerIndex) {
    const stats = data.stats;
    this.id = data.id;
    this.label = data.name;
    this.color = data.color;
    this.controls = controls;
    this.abilities = { ...data.abilities };
    this.cooldowns = {};
    this.buffs = {};
    this.pendingAbility = null;
    this.weight = stats.weight;
    this.movement = {
      speed: stats.moveSpeed,
      acceleration: stats.acceleration ?? DEFAULT_MOVEMENT.acceleration,
      friction: stats.friction ?? DEFAULT_MOVEMENT.friction,
      jumpVelocity: stats.jumpPower,
      gravity: stats.gravity ?? DEFAULT_MOVEMENT.gravity,
      maxFallSpeed: stats.maxFallSpeed ?? DEFAULT_MOVEMENT.maxFallSpeed,
    };
    this.maxHealth = stats.maxHp;
    this.health = stats.maxHp;
    const staminaConfig = {
      ...DEFAULT_STAMINA,
      regenRate: stats.staminaRegenRate ?? DEFAULT_STAMINA.regenRate,
      regenDelay: stats.staminaRegenDelay ?? DEFAULT_STAMINA.regenDelay,
    };
    this.maxStamina = stats.maxStamina;
    this.stamina = stats.maxStamina;
    this.staminaRegenRate = staminaConfig.regenRate;
    this.staminaRegenDelay = staminaConfig.regenDelay;
    this.staminaRegenTimer = 0;
    this.staminaFlash = 0;
    this.w = data.size.w;
    this.h = data.size.h;
    this.x = spawn.x;
    this.y = spawn.y;
    this.vx = 0;
    this.vy = 0;
    this.facing = spawn.facing;
    this.playerIndex = playerIndex;
    this.decoration = data.decoration ?? null;
    this.onGround = false;
    this.dropTimer = 0;
    this.groundPlatform = null;
    this.dashTimer = 0;
    this.hitStun = 0;
    this.hitFlash = 0;
    this.attackFlash = 0;
    this.skillFlash = 0;
    this.guardFlash = 0;
    this.weaponFlash = 0;
  }

  get bounds() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get isAlive() {
    return this.health > 0;
  }

  update(dt, context) {
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.hitStun = Math.max(0, this.hitStun - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.attackFlash = Math.max(0, this.attackFlash - dt);
    this.skillFlash = Math.max(0, this.skillFlash - dt);
    this.guardFlash = Math.max(0, this.guardFlash - dt);
    this.weaponFlash = Math.max(0, this.weaponFlash - dt);
    this.staminaFlash = Math.max(0, this.staminaFlash - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.updateBuffs(dt);
    this.updateStamina(dt);

    updateAbilityState(this, dt, context);
    if (!this.isAlive) return;

    if (this.hitStun === 0 && this.dashTimer === 0) {
      this.handleInput(dt, context);
    }

    this.applyGravity(dt);
    this.moveAndCollide(dt, context.map);
  }

  handleInput(dt, context) {
    const input = context.input;
    const left = input.isDown(this.controls.left);
    const right = input.isDown(this.controls.right);
    const direction = Number(right) - Number(left);

    if (direction !== 0) {
      this.facing = direction;
      this.vx = moveToward(
        this.vx,
        direction * this.movement.speed * this.getMoveSpeedMultiplier(),
        this.movement.acceleration * dt,
      );
    } else {
      this.vx = moveToward(this.vx, 0, this.movement.friction * dt);
    }

    if (input.wasPressed(this.controls.jump) && this.onGround) {
      this.vy = -this.movement.jumpVelocity;
      this.onGround = false;
    }

    if (input.wasPressed(this.controls.drop) && this.onGround) {
      this.tryDropThroughPlatform();
    }

    if (input.wasPressed(this.controls.attack)) {
      useAbility(this, this.abilities.basicAttack, context);
    }

    if (input.wasPressed(this.controls.skill1)) {
      useAbility(this, this.abilities.skill1, context);
    }

    if (input.wasPressed(this.controls.skill2)) {
      useAbility(this, this.abilities.skill2, context);
    }
  }

  updateBuffs(dt) {
    for (const [buffId, buff] of Object.entries(this.buffs)) {
      buff.remaining -= dt;
      if (buff.remaining <= 0) {
        delete this.buffs[buffId];
      }
    }
  }

  addBuff(buffId, config) {
    this.buffs[buffId] = { ...config };
  }

  getMoveSpeedMultiplier() {
    return Object.values(this.buffs).reduce(
      (multiplier, buff) => multiplier * (buff.moveSpeedMultiplier ?? 1),
      1,
    );
  }

  tryDropThroughPlatform() {
    if (this.groundPlatform?.type !== "oneWay") return;
    this.dropTimer = DROP_THROUGH_TIME;
    this.y += GROUND_EPSILON;
    this.onGround = false;
    this.groundPlatform = null;
  }

  updateStamina(dt) {
    if (this.staminaRegenTimer > 0) {
      this.staminaRegenTimer = Math.max(0, this.staminaRegenTimer - dt);
      return;
    }

    this.stamina = Math.min(
      this.maxStamina,
      this.stamina + this.staminaRegenRate * dt,
    );
  }

  trySpendStamina(cost) {
    if (this.stamina < cost) {
      this.staminaFlash = 0.22;
      return false;
    }

    this.stamina = Math.max(0, this.stamina - cost);
    this.staminaRegenTimer = this.staminaRegenDelay;
    return true;
  }

  applyGravity(dt) {
    this.vy = Math.min(
      this.vy + this.movement.gravity * dt,
      this.movement.maxFallSpeed,
    );
  }

  moveAndCollide(dt, map) {
    const previousY = this.y;
    this.x += this.vx * dt;
    this.resolveSolidX(map.getSolidPlatforms());

    this.y += this.vy * dt;
    this.onGround = false;
    this.groundPlatform = null;
    this.resolveSolidY(map.getSolidPlatforms());
    this.resolveOneWayY(map.getOneWayPlatforms(), previousY);
    this.resolveMapBounds(map.bounds);
  }

  resolveMapBounds(bounds) {
    if (!bounds) return;

    if (this.x < bounds.left) {
      this.x = bounds.left;
      this.vx = Math.max(0, this.vx);
    }
    if (this.x + this.w > bounds.right) {
      this.x = bounds.right - this.w;
      this.vx = Math.min(0, this.vx);
    }
    if (this.y + this.h > bounds.bottom) {
      this.y = bounds.bottom - this.h;
      this.vy = 0;
      this.onGround = true;
      this.groundPlatform = null;
    }
  }

  resolveSolidX(platforms) {
    for (const platform of platforms) {
      if (!overlaps(this.bounds, platform)) continue;
      if (this.vx > 0) {
        this.x = platform.x - this.w;
      } else if (this.vx < 0) {
        this.x = platform.x + platform.w;
      }
      this.vx = 0;
    }
  }

  resolveSolidY(platforms) {
    for (const platform of platforms) {
      if (!overlaps(this.bounds, platform)) continue;
      if (this.vy > 0) {
        this.y = platform.y - this.h;
        this.onGround = true;
        this.groundPlatform = platform;
      } else if (this.vy < 0) {
        this.y = platform.y + platform.h;
      }
      this.vy = 0;
    }
  }

  resolveOneWayY(platforms, previousY) {
    if (this.dropTimer > 0 || this.vy < 0) return;

    const previousBottom = previousY + this.h;
    for (const platform of platforms) {
      const platformTop = platform.y;
      const crossedTop =
        previousBottom <= platformTop + GROUND_EPSILON &&
        this.y + this.h >= platformTop;
      if (!crossedTop || !horizontalOverlap(this.bounds, platform)) continue;

      this.y = platformTop - this.h;
      this.vy = 0;
      this.onGround = true;
      this.groundPlatform = platform;
      break;
    }
  }

  takeHit(hit) {
    if (!this.isAlive) return 0;
    const damage = Math.ceil(hit.damage * this.getIncomingDamageMultiplier());
    const knockbackMultiplier = this.getIncomingKnockbackMultiplier();
    this.health = Math.max(0, this.health - damage);
    this.vx = (hit.knockback.x * knockbackMultiplier) / this.weight;
    this.vy = (hit.knockback.y * knockbackMultiplier) / Math.sqrt(this.weight);
    this.hitStun = hit.stun;
    this.hitFlash = 0.18;
    this.onGround = false;
    return damage;
  }

  getIncomingDamageMultiplier() {
    return Object.values(this.buffs).reduce(
      (multiplier, buff) => multiplier * (buff.damageMultiplier ?? 1),
      1,
    );
  }

  getIncomingKnockbackMultiplier() {
    return Object.values(this.buffs).reduce(
      (multiplier, buff) => multiplier * (buff.knockbackMultiplier ?? 1),
      1,
    );
  }
}

function moveToward(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return target;
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
