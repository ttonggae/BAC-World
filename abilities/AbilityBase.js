import { ABILITIES } from "../data/abilities.js";

export function updateAbilityState(player, dt, context) {
  updateCooldowns(player, dt);
  updatePendingAbility(player, dt, context);
}

export function useAbility(player, abilityId, context) {
  if (!abilityId) return false;

  const ability = ABILITIES[abilityId];
  if (!ability) {
    throw new Error(`Unknown ability: ${abilityId}`);
  }

  if (player.pendingAbility || (player.cooldowns[abilityId] ?? 0) > 0) {
    return false;
  }

  if (!player.trySpendStamina(ability.staminaCost ?? 0)) {
    return false;
  }

  applyAbilityMovement(player, ability);
  pushUseEffect(player, ability, context);
  player.cooldowns[abilityId] = ability.cooldown ?? 0;

  if (ability.type === "projectile") {
    fireProjectile(player, ability, context);
    player.skillFlash = 0.16;
    return true;
  }

  if (ability.type === "buff") {
    applyBuff(player, ability);
    player.skillFlash = ability.duration;
    player.guardFlash = ability.duration;
    return true;
  }

  if (ability.type === "movement") {
    applyMovementAbility(player, ability);
    player.skillFlash = ability.moveTime ?? 0.16;
    return true;
  }

  player.pendingAbility = {
    abilityId,
    startupRemaining: ability.startup ?? 0,
    released: false,
  };
  player.attackFlash = (ability.startup ?? 0) + ability.duration;
  player.skillFlash = ability.id === player.abilities.basicAttack ? 0 : player.attackFlash;

  if (player.pendingAbility.startupRemaining === 0) {
    releaseAbilityHitbox(player, ability, context);
  }

  return true;
}

function applyAbilityMovement(player, ability) {
  if (ability.type !== "dashMelee") return;

  player.vx = ability.dashSpeed * player.facing;
  player.dashTimer = ability.dashTime;
}

function applyMovementAbility(player, ability) {
  const moveTime = ability.moveTime ?? 0.12;
  player.vx = -player.facing * ability.moveSpeed;
  player.dashTimer = moveTime;
}

function applyBuff(player, ability) {
  player.addBuff(ability.id, {
    remaining: ability.duration,
    damageMultiplier: ability.damageMultiplier,
    knockbackMultiplier: ability.knockbackMultiplier,
    moveSpeedMultiplier: ability.moveSpeedMultiplier,
  });
}

function fireProjectile(player, ability, context) {
  const direction = player.facing;
  const size = ability.projectileSize;
  context.combat.spawnProjectile({
    owner: player,
    abilityId: ability.id,
    type: ability.type,
    x: direction > 0 ? player.x + player.w + 8 : player.x - size.w - 8,
    y: player.y + player.h * 0.42,
    w: size.w,
    h: size.h,
    vx: ability.projectileSpeed * direction,
    vy: 0,
    damage: ability.damage,
    knockback: {
      x: ability.knockback.x * direction,
      y: ability.knockback.y,
    },
    life: ability.projectileLife,
    stun: ability.stun,
    effectType: ability.effectType,
    screenShake: ability.screenShake,
  });
}

function updateCooldowns(player, dt) {
  for (const abilityId of Object.keys(player.cooldowns)) {
    player.cooldowns[abilityId] = Math.max(0, player.cooldowns[abilityId] - dt);
  }
}

function updatePendingAbility(player, dt, context) {
  const pending = player.pendingAbility;
  if (!pending) return;

  pending.startupRemaining = Math.max(0, pending.startupRemaining - dt);
  if (pending.startupRemaining === 0 && !pending.released) {
    const ability = ABILITIES[pending.abilityId];
    releaseAbilityHitbox(player, ability, context);
  }
}

function releaseAbilityHitbox(player, ability, context) {
  player.pendingAbility.released = true;
  const { hitbox, damage, knockback, duration, stun } = ability;
  const direction = player.facing;
  const attackBox = createAttackBox(player, ability);

  context.combat.spawnHitbox({
    owner: player,
    abilityId: ability.id,
    type: ability.type,
    x: attackBox.x,
    y: attackBox.y,
    w: attackBox.w,
    h: attackBox.h,
    damage,
    knockback: {
      x: knockback.x * direction,
      y: knockback.y,
    },
    knockbackMode: ability.type === "areaAttack" ? "awayFromOwner" : "facing",
    effectType: ability.effectType,
    screenShake: ability.screenShake,
    duration,
    stun,
  });
  player.pendingAbility = null;
}

function pushUseEffect(player, ability, context) {
  if (!context.visualEvents || !ability.useEffectType) return;

  context.visualEvents.push({
    type: "abilityUse",
    effectType: ability.useEffectType,
    abilityType: ability.type,
    x: player.x + player.w / 2,
    y: player.y + player.h / 2,
    facing: player.facing,
    size: Math.max(player.w, player.h),
  });
}

function createAttackBox(player, ability) {
  const { hitbox } = ability;
  if (ability.type === "areaAttack") {
    return {
      x: player.x + player.w / 2 - hitbox.w / 2,
      y: player.y + hitbox.yOffset,
      w: hitbox.w,
      h: hitbox.h,
    };
  }

  const direction = player.facing;
  return {
    x:
      direction > 0
        ? player.x + player.w + hitbox.xOffset - player.w
        : player.x - hitbox.xOffset - hitbox.w + player.w,
    y: player.y + hitbox.yOffset,
    w: hitbox.w,
    h: hitbox.h,
  };
}
