import { intersects } from "../core/AABB.js";

export class CombatSystem {
  constructor() {
    this.hitboxes = [];
    this.projectiles = [];
    this.hitEvents = [];
    this.lastHit = null;
  }

  spawnHitbox(hitbox) {
    this.hitboxes.push({
      ...hitbox,
      remaining: hitbox.duration,
      remainingTicks: Number.isInteger(hitbox.durationTicks)
        ? hitbox.durationTicks
        : null,
      hitTargets: new Set(),
    });
  }

  spawnProjectile(projectile) {
    this.projectiles.push({ ...projectile });
  }

  update(dt, characters, map) {
    this.lastHit = null;
    this.updateProjectiles(dt, characters, map);

    for (const hitbox of this.hitboxes) {
      if (Number.isInteger(hitbox.remainingTicks)) {
        hitbox.remainingTicks -= 1;
        hitbox.remaining = hitbox.remainingTicks / (hitbox.tickRate ?? 60);
      } else {
        hitbox.remaining -= dt;
      }
      for (const target of characters) {
        if (
          target === hitbox.owner ||
          !target.isAlive ||
          hitbox.hitTargets.has(target) ||
          !intersects(hitbox, target.bounds)
        ) {
          continue;
        }

        const knockback = getKnockback(hitbox, target);
        const effectResult = applyHitEffects(hitbox, target);
        const damage =
          effectResult.handled
            ? applyEffectHitReaction(hitbox, target, knockback, effectResult.hpStolen)
            : target.takeHit({
                ...hitbox,
                knockback,
              });
        hitbox.hitTargets.add(target);
        const hitEvent = createHitEvent(hitbox, target, damage, effectResult);
        this.hitEvents.push(hitEvent);
        this.lastHit = { attacker: hitbox.owner, target, hitEvent };
      }
    }

    this.hitboxes = this.hitboxes.filter((hitbox) =>
      Number.isInteger(hitbox.remainingTicks)
        ? hitbox.remainingTicks > 0
        : hitbox.remaining > 0,
    );
  }

  updateProjectiles(dt, characters, map) {
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (Number.isInteger(projectile.lifeTicks)) {
        projectile.lifeTicks -= 1;
        projectile.life = projectile.lifeTicks / (projectile.tickRate ?? 60);
      } else {
        projectile.life -= dt;
      }

      if (
        isOutOfBounds(projectile, map.bounds) ||
        (projectile.destroyOnWall !== false &&
          hitsSolid(projectile, map.getSolidPlatforms()))
      ) {
        projectile.life = 0;
        continue;
      }

      for (const target of characters) {
        if (target === projectile.owner || !target.isAlive || !intersects(projectile, target.bounds)) {
          continue;
        }

        const damage = target.takeHit(projectile);
        const hitEvent = createHitEvent(projectile, target, damage);
        this.hitEvents.push(hitEvent);
        this.lastHit = { attacker: projectile.owner, target, hitEvent };
        if (projectile.destroyOnHit !== false || (projectile.pierce ?? 0) <= 0) {
          projectile.life = 0;
        } else {
          projectile.pierce -= 1;
        }
        break;
      }
    }

    this.projectiles = this.projectiles.filter((projectile) =>
      Number.isInteger(projectile.lifeTicks)
        ? projectile.lifeTicks > 0
        : projectile.life > 0,
    );
  }
}

function createHitEvent(hitbox, target, damage = hitbox.damage, effectResult = null) {
  return {
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
    attackerX: hitbox.owner.x + hitbox.owner.w / 2,
    attackerY: hitbox.owner.y + hitbox.owner.h / 2,
    damage,
    abilityId: hitbox.abilityId,
    effectType: hitbox.effectType,
    screenShake: hitbox.screenShake ?? 0,
    staminaStolen: effectResult?.staminaStolen ?? 0,
    hpStolen: effectResult?.hpStolen ?? 0,
    staminaRecovered: effectResult?.staminaRecovered ?? 0,
    hpRecovered: effectResult?.hpRecovered ?? 0,
  };
}

function applyHitEffects(hitbox, target) {
  const effects = hitbox.effects ?? [];
  if (effects.length === 0) {
    return {
      handled: false,
      staminaStolen: 0,
      hpStolen: 0,
      staminaRecovered: 0,
      hpRecovered: 0,
    };
  }

  const owner = hitbox.owner;
  let staminaStolen = 0;
  let hpStolen = 0;
  let staminaRecovered = 0;
  let hpRecovered = 0;
  for (const effect of effects) {
    if (effect.type === "stealStamina") {
      const amount = Math.max(0, Math.min(effect.maxAmount ?? 0, target.stamina));
      const before = owner.stamina;
      target.stamina -= amount;
      owner.stamina = Math.min(owner.maxStamina, owner.stamina + amount);
      staminaStolen += amount;
      staminaRecovered += owner.stamina - before;
      if (amount > 0) {
        target.staminaRegenTimer = Math.max(
          target.staminaRegenTimer,
          target.staminaRegenDelay,
        );
      }
    } else if (effect.type === "stealHp") {
      const amount = Math.max(0, Math.min(effect.maxAmount ?? 0, target.health));
      const before = owner.health;
      target.health -= amount;
      owner.health = Math.min(owner.maxHealth, owner.health + amount);
      hpStolen += amount;
      hpRecovered += owner.health - before;
    }
  }

  return {
    handled: true,
    staminaStolen,
    hpStolen,
    staminaRecovered,
    hpRecovered,
  };
}

function applyEffectHitReaction(hitbox, target, knockback, hpStolen) {
  if (target.isAlive) {
    target.takeHit({
      ...hitbox,
      damage: 0,
      knockback,
    });
  } else {
    target.hitFlash = 0.18;
  }
  return hpStolen;
}

function isOutOfBounds(projectile, bounds) {
  if (!bounds) return false;
  return (
    projectile.x + projectile.w < bounds.left ||
    projectile.x > bounds.right ||
    projectile.y + projectile.h < bounds.top ||
    projectile.y > bounds.bottom
  );
}

function hitsSolid(projectile, platforms) {
  return platforms.some((platform) => intersects(projectile, platform));
}

function getKnockback(hitbox, target) {
  if (hitbox.knockbackMode !== "awayFromOwner") {
    return hitbox.knockback;
  }

  const ownerCenter = hitbox.owner.x + hitbox.owner.w / 2;
  const targetCenter = target.x + target.w / 2;
  const direction = targetCenter >= ownerCenter ? 1 : -1;
  return {
    x: Math.abs(hitbox.knockback.x) * direction,
    y: hitbox.knockback.y,
  };
}
