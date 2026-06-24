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
      hitbox.remaining -= dt;
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
        const damage = target.takeHit({
          ...hitbox,
          knockback,
        });
        hitbox.hitTargets.add(target);
        const hitEvent = createHitEvent(hitbox, target, damage);
        this.hitEvents.push(hitEvent);
        this.lastHit = { attacker: hitbox.owner, target, hitEvent };
      }
    }

    this.hitboxes = this.hitboxes.filter((hitbox) => hitbox.remaining > 0);
  }

  updateProjectiles(dt, characters, map) {
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;

      if (isOutOfBounds(projectile, map.bounds) || hitsSolid(projectile, map.getSolidPlatforms())) {
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
        projectile.life = 0;
        break;
      }
    }

    this.projectiles = this.projectiles.filter((projectile) => projectile.life > 0);
  }
}

function createHitEvent(hitbox, target, damage = hitbox.damage) {
  return {
    x: target.x + target.w / 2,
    y: target.y + target.h / 2,
    damage,
    abilityId: hitbox.abilityId,
    effectType: hitbox.effectType,
    screenShake: hitbox.screenShake ?? 0,
  };
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
