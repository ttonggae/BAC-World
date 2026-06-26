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

  if ((player.castLockTicks ?? 0) > 0) {
    return false;
  }

  if (
    player.pendingAbility ||
    (player.cooldowns[abilityId] ?? 0) > 0 ||
    (player.cooldownTicks[abilityId] ?? 0) > 0
  ) {
    return false;
  }

  if (!player.trySpendStamina(ability.staminaCost ?? 0)) {
    return false;
  }

  if (ability.type === "stanceSwitch") {
    applyStanceSwitch(player, ability);
    pushUseEffect(player, ability, context);
    player.cooldowns[abilityId] = ability.cooldown ?? 0;
    if (ability.editorAction) {
      player.cooldownTicks[abilityId] = ability.cooldownTicks ?? 0;
    }
    player.skillFlash = 0.18;
    return true;
  }

  applyAbilityMovement(player, ability);
  pushUseEffect(player, ability, context);
  if (ability.activeWeaponVisualId) {
    player.actionWeaponVisualId = ability.activeWeaponVisualId;
    player.actionWeaponVisualTicks =
      (ability.startupTicks ?? 0) +
      (ability.activeTicks ?? 0) +
      (ability.recoveryTicks ?? 0);
  }
  player.cooldowns[abilityId] = ability.cooldown ?? 0;
  if (ability.editorAction) {
    player.cooldownTicks[abilityId] = ability.cooldownTicks ?? 0;
    if ((ability.castLockTicks ?? 0) > 0) {
      player.castLockTicks = ability.castLockTicks;
    }
  }

  if (ability.type === "projectile") {
    if ((ability.startup ?? 0) > 0) {
      beginPendingAbility(player, ability);
    } else {
      fireProjectile(player, ability, context);
    }
    player.skillFlash = (ability.startup ?? 0) + 0.16;
    return true;
  }

  if (ability.type === "buff") {
    applyBuff(player, ability);
    player.skillFlash = ability.duration;
    player.guardFlash = ability.duration;
    return true;
  }

  if (ability.type === "movement") {
    if ((ability.startup ?? 0) > 0) {
      beginPendingAbility(player, ability);
    } else {
      applyMovementAbility(player, ability);
    }
    player.skillFlash =
      ability.movement?.durationSeconds ?? ability.moveTime ?? 0.16;
    return true;
  }

  beginPendingAbility(player, ability);
  player.attackFlash = (ability.startup ?? 0) + ability.duration;
  player.skillFlash = ability.id === player.abilities.basicAttack ? 0 : player.attackFlash;

  if (player.pendingAbility.startupRemaining === 0) {
    releasePendingAbility(player, ability, context);
  }

  return true;
}

function applyAbilityMovement(player, ability) {
  if (ability.type !== "dashMelee") return;

  const movement = ability.movement;
  const direction = movement?.direction === "backward" ? -player.facing : player.facing;
  const speed = movement?.speed ?? ability.dashSpeed;
  player.vx = speed * direction;
  if (ability.editorAction) {
    player.dashTicks = movement?.duration ?? ability.activeTicks ?? 0;
    player.dashStopOnEnd = Boolean(movement?.stopOnEnd);
    player.dashTimer = 0;
  } else {
    player.dashTimer = ability.dashTime;
  }
}

function applyMovementAbility(player, ability) {
  const movement = ability.movement;
  const moveTime = movement?.durationSeconds ?? ability.moveTime ?? 0.12;
  const speed = movement?.speed ?? ability.moveSpeed;
  const direction = movement?.direction === "facing" ? player.facing : -player.facing;
  player.vx = direction * speed;
  player.dashTimer = ability.editorAction ? 0 : moveTime;
  if (ability.editorAction) {
    player.dashTicks = movement?.duration ?? 0;
    player.dashStopOnEnd = Boolean(movement?.stopOnEnd);
  }
  if ((ability.invincibleTicks ?? 0) > 0) {
    player.invincibleTicks = ability.invincibleTicks;
  }
  if ((ability.hurtboxDisabledTicks ?? 0) > 0) {
    player.hurtboxDisabledTicks = ability.hurtboxDisabledTicks;
  }
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
  if (ability.editorAction) {
    fireEditorProjectile(player, ability, context);
    player.pendingAbility = null;
    return;
  }
  const size = ability.projectileSize;
  const spawnTick = Number(context.simulationTick) || 0;
  const instanceId = `${player.playerIndex}_${ability.id}_${spawnTick}`;
  context.combat.spawnProjectile({
    id: instanceId,
    attackInstanceId: instanceId,
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
  player.pendingAbility = null;
}

function updateCooldowns(player, dt) {
  for (const abilityId of Object.keys(player.cooldowns)) {
    if ((player.cooldownTicks[abilityId] ?? 0) > 0) {
      player.cooldownTicks[abilityId] -= 1;
      const ability = ABILITIES[abilityId];
      player.cooldowns[abilityId] =
        player.cooldownTicks[abilityId] / (ability?.tickRate ?? 60);
    } else {
      player.cooldowns[abilityId] = Math.max(0, player.cooldowns[abilityId] - dt);
    }
  }
}

function updatePendingAbility(player, dt, context) {
  const pending = player.pendingAbility;
  if (!pending) return;

  if (Number.isInteger(pending.startupTicksRemaining)) {
    pending.startupTicksRemaining = Math.max(0, pending.startupTicksRemaining - 1);
    pending.startupRemaining =
      pending.startupTicksRemaining / (ABILITIES[pending.abilityId]?.tickRate ?? 60);
  } else {
    pending.startupRemaining = Math.max(0, pending.startupRemaining - dt);
  }
  if (pending.startupRemaining === 0 && !pending.released) {
    const ability = ABILITIES[pending.abilityId];
    releasePendingAbility(player, ability, context);
  }
}

function beginPendingAbility(player, ability) {
  player.pendingAbility = {
    abilityId: ability.id,
    startupRemaining: ability.startup ?? 0,
    startupTicksRemaining: ability.editorAction ? ability.startupTicks : null,
    released: false,
  };
}

function releasePendingAbility(player, ability, context) {
  if (ability.type === "projectile") {
    player.pendingAbility.released = true;
    fireProjectile(player, ability, context);
    return;
  }
  if (ability.type === "movement") {
    player.pendingAbility.released = true;
    applyMovementAbility(player, ability);
    player.pendingAbility = null;
    return;
  }
  if (ability.type === "areaHazard") {
    player.pendingAbility.released = true;
    releaseEditorAreaHazard(player, ability, context);
    player.pendingAbility = null;
    return;
  }
  releaseAbilityHitbox(player, ability, context);
}

function releaseAbilityHitbox(player, ability, context) {
  player.pendingAbility.released = true;
  if (ability.editorAction) {
    releaseEditorHitboxes(player, ability, context);
    player.pendingAbility = null;
    return;
  }
  const { hitbox, damage, knockback, duration, stun } = ability;
  const direction = player.facing;
  const attackBox = createAttackBox(player, ability);
  const spawnTick = Number(context.simulationTick) || 0;
  const attackInstanceId = `${player.playerIndex}_${ability.id}_${spawnTick}`;

  context.combat.spawnHitbox({
    attackInstanceId,
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

function releaseEditorHitboxes(player, ability, context) {
  const direction = player.facing;
  const spawnTick = Number(context.simulationTick) || 0;
  const attackInstanceId = `${player.playerIndex}_${ability.id}_${spawnTick}`;
  const hitTargetIds = new Set();
  const damage = getAbilityDamage(player, ability);
  for (const hitbox of ability.hitboxes ?? []) {
    const x =
      direction > 0
        ? player.x + hitbox.x
        : player.x + player.w - hitbox.x - hitbox.w;
    context.combat.spawnHitbox({
      attackInstanceId,
      hitTargetIds,
      owner: player,
      abilityId: ability.id,
      type: ability.type,
      x,
      y: player.y + hitbox.y,
      w: hitbox.w,
      h: hitbox.h,
      followOwner: ability.type === "dashMelee",
      sourceHitbox: { ...hitbox },
      sourceFacing: direction,
      damage,
      knockback: {
        x: ability.knockback.x * direction,
        y: ability.knockback.y,
      },
      knockbackMode: "facing",
      effectType: ability.effectType,
      screenShake: ability.screenShake,
      duration: ability.duration,
      durationTicks: ability.activeTicks,
      tickRate: ability.tickRate,
      effects: ability.effects.map((effect) => ({ ...effect })),
      stun: ability.stun,
    });
  }
  consumeModeSwapBonus(player, ability);
}

function fireEditorProjectile(player, ability, context) {
  const projectile = ability.projectile;
  const hitbox = ability.hitboxes?.[0];
  if (!projectile || !hitbox) return;

  const direction = player.facing;
  const spawnX =
    direction > 0
      ? player.x + projectile.spawn.x
      : player.x + player.w - projectile.spawn.x - hitbox.w;
  const spawnTick = Number(context.simulationTick) || 0;
  const instanceId = `${player.playerIndex}_${ability.id}_${spawnTick}`;
  const damage = getAbilityDamage(player, ability);
  context.combat.spawnProjectile({
    id: instanceId,
    attackInstanceId: instanceId,
    owner: player,
    abilityId: ability.id,
    type: ability.type,
    x: spawnX + hitbox.x,
    y: player.y + projectile.spawn.y + hitbox.y,
    w: hitbox.w,
    h: hitbox.h,
    vx: projectile.speed * direction,
    vy: 0,
    damage,
    knockback: {
      x: ability.knockback.x * direction,
      y: ability.knockback.y,
    },
    life: projectile.lifetimeSeconds,
    lifeTicks: projectile.lifetime,
    tickRate: ability.tickRate,
    stun: ability.stun,
    effectType: ability.effectType,
    screenShake: ability.screenShake,
    destroyOnHit: projectile.destroyOnHit,
    destroyOnWall: projectile.destroyOnWall,
    pierce: projectile.pierce,
    speed: projectile.speed,
    homing: projectile.homing ? { ...projectile.homing } : null,
    homingActive: Boolean(projectile.homing),
    hasReleasedHoming: false,
    lockedTargetId: null,
    projectileColor: projectile.color ?? null,
    effects: ability.effects.map((effect) => ({ ...effect })),
    visualWeaponId: projectile.visualWeaponId,
    excludePartNames: [...(projectile.excludePartNames ?? [])],
    facing: direction,
  });
  consumeModeSwapBonus(player, ability);
}

function applyStanceSwitch(player, ability) {
  const stance = player.stance;
  if (!stance?.modes) return;

  const modeIds = ability.stanceSwitch?.modes?.length
    ? ability.stanceSwitch.modes
    : Object.keys(stance.modes);
  const currentIndex = Math.max(0, modeIds.indexOf(player.currentStanceMode));
  const nextModeId = modeIds[(currentIndex + 1) % modeIds.length];
  const nextMode = stance.modes[nextModeId];
  if (!nextMode) return;

  player.currentStanceMode = nextModeId;
  player.abilities = { ...player.abilities, ...nextMode.actionSlots };
  player.defaultWeaponId = nextMode.weaponId ?? player.defaultWeaponId;
  player.currentStanceIndicatorId = nextMode.indicatorId ?? null;
  player.modeSwapBonusBasicAttackReady = Boolean(
    ability.stanceSwitch?.bonusNextBasic,
  );
  player.modeSwapBonusActionId = nextMode.actionSlots.basicAttack ?? null;
  player.modeSwapBonusDamage = ability.stanceSwitch?.bonusDamage ?? 0;
}

function releaseEditorAreaHazard(player, ability, context) {
  const spawnTick = Number(context.simulationTick) || 0;
  const direction = player.facing;
  const areaInstanceId = `${player.playerIndex}_${ability.id}_${spawnTick}`;
  context.combat.spawnArea({
    id: areaInstanceId,
    areaInstanceId,
    owner: player,
    abilityId: ability.id,
    x: player.x,
    y: player.y,
    w: player.w,
    h: player.h,
    facing: direction,
    hitboxes: (ability.hitboxes ?? []).map((hitbox) => ({
      x:
        direction > 0
          ? player.x + hitbox.x
          : player.x + player.w - hitbox.x - hitbox.w,
      y: player.y + hitbox.y,
      w: hitbox.w,
      h: hitbox.h,
    })),
    damage: ability.damage,
    knockback: {
      x: ability.knockback.x * direction,
      y: ability.knockback.y,
    },
    durationTicks: ability.area.durationTicks,
    damageIntervalTicks: ability.area.damageIntervalTicks,
    tickRate: ability.tickRate,
    visualWeaponId: ability.area.visualWeaponId,
    effectType: ability.effectType,
    screenShake: ability.screenShake,
    stun: ability.stun,
  });
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

function getAbilityDamage(player, ability) {
  const bonus =
    player.modeSwapBonusBasicAttackReady &&
    ability.id === player.modeSwapBonusActionId
      ? player.modeSwapBonusDamage ?? 0
      : 0;
  return (ability.damage ?? 0) + bonus;
}

function consumeModeSwapBonus(player, ability) {
  if (
    player.modeSwapBonusBasicAttackReady &&
    ability.id === player.modeSwapBonusActionId
  ) {
    player.modeSwapBonusBasicAttackReady = false;
    player.modeSwapBonusActionId = null;
    player.modeSwapBonusDamage = 0;
  }
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
