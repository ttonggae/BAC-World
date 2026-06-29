import { intersects } from "../core/AABB.js";

export class CombatSystem {
  constructor() {
    this.hitboxes = [];
    this.projectiles = [];
    this.areas = [];
    this.hitEvents = [];
    this.lastHit = null;
  }

  spawnHitbox(hitbox) {
    const hitTargetIds =
      hitbox.hitTargetIds instanceof Set ? hitbox.hitTargetIds : new Set();
    this.hitboxes.push({
      ...hitbox,
      remaining: hitbox.duration,
      remainingTicks: Number.isInteger(hitbox.durationTicks)
        ? hitbox.durationTicks
        : null,
      hitTargetIds,
    });
  }

  spawnProjectile(projectile) {
    this.projectiles.push({
      ...projectile,
      hitTargetIds:
        projectile.hitTargetIds instanceof Set
          ? projectile.hitTargetIds
          : new Set(),
    });
  }

  spawnArea(area) {
    this.areas.push({
      ...area,
      remainingTicks: area.durationTicks,
      elapsedTicks: 0,
      lastDamageTickByTargetId:
        area.lastDamageTickByTargetId instanceof Map
          ? area.lastDamageTickByTargetId
          : new Map(),
    });
  }

  update(dt, characters, map) {
    this.lastHit = null;
    this.updateAreas(characters);
    this.updateProjectiles(dt, characters, map);

    for (const hitbox of this.hitboxes) {
      updateFollowHitbox(hitbox);
      if (Number.isInteger(hitbox.remainingTicks)) {
        hitbox.remainingTicks -= 1;
        hitbox.remaining = hitbox.remainingTicks / (hitbox.tickRate ?? 60);
      } else {
        hitbox.remaining -= dt;
      }
      for (const target of characters) {
        const targetId = getTargetId(target);
        if (
          target === hitbox.owner ||
          !target.isAlive ||
          target.isInvincible ||
          target.isHurtboxDisabled ||
          hitbox.hitTargetIds.has(targetId) ||
          !intersects(hitbox, target.bounds)
        ) {
          continue;
        }

        const knockback = getKnockback(hitbox, target);
        const effectResult = applyHitEffects(hitbox, target);
        const damage =
          effectResult.replacesDamage
            ? applyEffectHitReaction(hitbox, target, knockback, effectResult.hpStolen)
            : target.takeHit({
                ...hitbox,
                knockback,
              });
        hitbox.hitTargetIds.add(targetId);
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

  updateAreas(characters) {
    for (const area of this.areas) {
      for (const target of characters) {
        const targetId = getTargetId(target);
        if (
          (target === area.owner && !area.friendlyFireSelf) ||
          !target.isAlive ||
          target.isInvincible ||
          target.isHurtboxDisabled ||
          !area.hitboxes.some((box) => intersects(box, target.bounds))
        ) {
          continue;
        }
        const lastTick = area.lastDamageTickByTargetId.get(targetId);
        if (
          Number.isInteger(lastTick) &&
          area.elapsedTicks - lastTick < area.damageIntervalTicks
        ) {
          continue;
        }
        const damage = target.takeHit(area);
        area.lastDamageTickByTargetId.set(targetId, area.elapsedTicks);
        const hitEvent = createHitEvent(area, target, damage);
        this.hitEvents.push(hitEvent);
        this.lastHit = { attacker: area.owner, target, hitEvent };
      }
      area.elapsedTicks += 1;
      area.remainingTicks -= 1;
    }
    this.areas = this.areas.filter((area) => area.remainingTicks > 0);
  }

  updateProjectiles(dt, characters, map) {
    for (const projectile of this.projectiles) {
      updateHoming(projectile, characters);
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
        destroyProjectile(projectile);
        continue;
      }

      if (projectile.manualDetonate) {
        continue;
      }

      for (const target of characters) {
        const targetId = getTargetId(target);
        if (
          target === projectile.owner ||
          !target.isAlive ||
          target.isInvincible ||
          target.isHurtboxDisabled ||
          projectile.hitTargetIds.has(targetId) ||
          !intersects(projectile, target.bounds)
        ) {
          continue;
        }

        const effectResult = applyHitEffects(projectile, target);
        const damage = effectResult.replacesDamage
          ? applyEffectHitReaction(
              projectile,
              target,
              projectile.knockback,
              effectResult.hpStolen,
            )
          : target.takeHit(projectile);
        projectile.hitTargetIds.add(targetId);
        const hitEvent = createHitEvent(projectile, target, damage, effectResult);
        this.hitEvents.push(hitEvent);
        this.lastHit = { attacker: projectile.owner, target, hitEvent };
        if (projectile.destroyOnHit !== false || (projectile.pierce ?? 0) <= 0) {
          destroyProjectile(projectile);
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

function destroyProjectile(projectile) {
  projectile.life = 0;
  if (Number.isInteger(projectile.lifeTicks)) {
    projectile.lifeTicks = 0;
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
      replacesDamage: false,
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
  let chargeGained = 0;
  let replacesDamage = false;
  for (const effect of effects) {
    if (effect.type === "stealStamina") {
      replacesDamage = true;
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
      replacesDamage = true;
      const amount = Math.max(0, Math.min(effect.maxAmount ?? 0, target.health));
      const before = owner.health;
      target.health -= amount;
      owner.health = Math.min(owner.maxHealth, owner.health + amount);
      hpStolen += amount;
      hpRecovered += owner.health - before;
    } else if (effect.type === "recoverStamina") {
      const amount =
        effect.restore === "full"
          ? owner.maxStamina
          : Math.max(0, effect.maxAmount ?? 0);
      const before = owner.stamina;
      owner.stamina = Math.min(owner.maxStamina, owner.stamina + amount);
      staminaRecovered += owner.stamina - before;
    } else if (effect.type === "addCharge") {
      chargeGained += owner.addChargeStack?.(effect.amount ?? 0, effect.max) ?? 0;
    } else if (effect.type === "status" && effect.statusId) {
      target.addStatus({
        ...effect,
        sourceId: `${hitbox.owner.playerIndex}:${hitbox.abilityId}:${effect.statusId}`,
      });
    } else if (effect.type === "pullToOwner") {
      if ((effect.durationTicks ?? 0) > 0) {
        target.addStatus({
          ...effect,
          statusId: "harpoonPull",
          sourceId: `${hitbox.owner.playerIndex}:${hitbox.abilityId}:pull`,
          sourcePlayerIndex: hitbox.owner.playerIndex,
          sourceFacing: hitbox.owner.facing,
        });
      } else {
        const distance = Math.max(0, effect.distance ?? 42);
        if (owner.facing >= 0) {
          target.x = owner.x + owner.w + distance;
        } else {
          target.x = owner.x - target.w - distance;
        }
        target.vx = 0;
      }
    }
  }

  return {
    replacesDamage,
    staminaStolen,
    hpStolen,
    staminaRecovered,
    hpRecovered,
    chargeGained,
  };
}

function getTargetId(target) {
  return Number.isInteger(target.playerIndex) ? target.playerIndex : target.id;
}

function updateFollowHitbox(hitbox) {
  if (!hitbox.followOwner || !hitbox.owner || !hitbox.sourceHitbox) return;
  const source = hitbox.sourceHitbox;
  const direction = hitbox.sourceFacing ?? hitbox.owner.facing;
  hitbox.x =
    direction > 0
      ? hitbox.owner.x + source.x
      : hitbox.owner.x + hitbox.owner.w - source.x - source.w;
  hitbox.y = hitbox.owner.y + source.y;
}

function updateHoming(projectile, characters) {
  const homing = projectile.homing;
  if (
    !homing ||
    projectile.homingActive === false ||
    projectile.hasReleasedHoming ||
    !(projectile.speed > 0)
  ) {
    return;
  }

  const centerX = projectile.x + projectile.w / 2;
  const centerY = projectile.y + projectile.h / 2;
  let target =
    projectile.lockedTargetId === null
      ? null
      : characters.find(
          (character) =>
            getTargetId(character) === projectile.lockedTargetId &&
            character.isAlive,
        );

  if (projectile.lockedTargetId !== null && !target) {
    releaseHoming(projectile);
    return;
  }

  if (!target) {
    const rangeSquared = (homing.range ?? 0) ** 2;
    let bestDistance = rangeSquared;
    for (const character of characters) {
      if (character === projectile.owner || !character.isAlive) continue;
      const dx = character.x + character.w / 2 - centerX;
      const dy = character.y + character.h / 2 - centerY;
      const distance = dx * dx + dy * dy;
      if (distance <= bestDistance) {
        bestDistance = distance;
        target = character;
      }
    }
    if (target) {
      projectile.lockedTargetId = getTargetId(target);
    }
  }
  if (!target) return;

  const dx = target.x + target.w / 2 - centerX;
  const dy = target.y + target.h / 2 - centerY;
  const length = Math.hypot(dx, dy) || 1;
  if (length <= (homing.releaseDistance ?? 0)) {
    releaseHoming(projectile);
    return;
  }
  const desiredX = (dx / length) * projectile.speed;
  const desiredY = (dy / length) * projectile.speed;
  const factor = Math.max(0, Math.min(1, homing.factor ?? 0.1));
  const blendedX = projectile.vx + (desiredX - projectile.vx) * factor;
  const blendedY = projectile.vy + (desiredY - projectile.vy) * factor;
  const blendedLength = Math.hypot(blendedX, blendedY) || 1;
  projectile.vx = (blendedX / blendedLength) * projectile.speed;
  projectile.vy = (blendedY / blendedLength) * projectile.speed;
}

function releaseHoming(projectile) {
  projectile.homingActive = false;
  projectile.hasReleasedHoming = true;
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
