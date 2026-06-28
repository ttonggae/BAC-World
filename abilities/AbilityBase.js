import { ABILITIES } from "../data/abilities.js";

export function updateAbilityState(player, dt, context) {
  updateCooldowns(player, dt);
  updateActiveHazards(player, context);
  if (player.isActionRestricted?.()) {
    player.pendingAbility = null;
    return;
  }
  updatePendingAbility(player, dt, context);
}

export function useAbility(player, abilityId, context) {
  if (!abilityId) return false;
  if (
    abilityId === player.abilities?.basicAttack &&
    player.comboNextActionId &&
    (player.comboWindowTicks ?? 0) > 0
  ) {
    abilityId = player.comboNextActionId;
  }

  const ability = ABILITIES[abilityId];
  if (!ability) {
    throw new Error(`Unknown ability: ${abilityId}`);
  }

  if (player.isActionRestricted?.()) {
    return false;
  }

  if ((player.castLockTicks ?? 0) > 0) {
    return false;
  }

  if (ability.oncePerMatch && player.usedOnceAbilities?.[ability.id]) {
    return false;
  }

  if (
    ability.requiresHpPercentAtOrBelow !== null &&
    ability.requiresHpPercentAtOrBelow !== undefined
  ) {
    const healthPercent = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0;
    if (healthPercent > ability.requiresHpPercentAtOrBelow) {
      player.staminaFlash = 0.22;
      return false;
    }
  }

  if (ability.behavior === "recastDetonate") {
    return useRecastDetonateAbility(player, ability, context);
  }

  if (
    player.pendingAbility ||
    (player.cooldowns[abilityId] ?? 0) > 0 ||
    (player.cooldownTicks[abilityId] ?? 0) > 0
  ) {
    return false;
  }

  if (!trySpendAbilityCharge(player, ability)) {
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
  applyChargeOnUse(player, ability);
  activatePersistentHazard(player, ability, context);
  if (ability.oncePerMatch) {
    player.usedOnceAbilities = {
      ...(player.usedOnceAbilities ?? {}),
      [ability.id]: true,
    };
  }
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
    if (ability.superArmorDuringStartup?.ignoreCrowdControl) {
      player.crowdControlArmorTicks = Math.max(
        player.crowdControlArmorTicks ?? 0,
        ability.startupTicks ?? 0,
      );
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

  if (ability.type === "reload") {
    if ((ability.startup ?? 0) > 0) {
      beginPendingAbility(player, ability);
    } else {
      applyReload(player, ability);
    }
    player.skillFlash = (ability.startup ?? 0) + 0.16;
    return true;
  }

  if (ability.type === "holdSprint") {
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

function activatePersistentHazard(player, ability, context) {
  const hazard = ability.fallingPillarHazard;
  if (!hazard || !context?.map) return;
  const state = {
    abilityId: ability.id,
    nextInTicks: hazard.warningTicks ?? 45,
    spawnCount: 0,
  };
  player.activeHazards = {
    ...(player.activeHazards ?? {}),
    [ability.id]: state,
  };
}

function updateActiveHazards(player, context) {
  const hazards = player.activeHazards ?? {};
  for (const [abilityId, state] of Object.entries(hazards)) {
    const ability = ABILITIES[abilityId];
    const hazard = ability?.fallingPillarHazard;
    if (!ability || !hazard || !context?.combat || !context?.map) continue;
    state.nextInTicks = Math.max(0, (state.nextInTicks ?? 0) - 1);
    if (state.nextInTicks > 0) continue;

    spawnFallingPillar(player, ability, hazard, state, context);
    state.spawnCount = (state.spawnCount ?? 0) + 1;
    state.nextInTicks = getNextHazardInterval(ability, hazard, state);
  }
}

function spawnFallingPillar(player, ability, hazard, state, context) {
  const bounds = context.map.bounds ?? {
    left: 0,
    right: context.map.width ?? 960,
    bottom: context.map.height ?? 540,
  };
  const hitbox = hazard.hitbox ?? { w: 18, h: 86 };
  const spawnTick = Number(context.simulationTick) || 0;
  const seedValue = deterministicUnit(
    `${player.playerIndex}:${ability.id}:${state.spawnCount ?? 0}:${spawnTick}`,
  );
  const minX = bounds.left;
  const maxX = Math.max(minX, bounds.right - hitbox.w);
  const x = minX + Math.floor(seedValue * Math.max(1, maxX - minX));
  const y = Math.max(bounds.top ?? 0, (bounds.bottom ?? 540) - hitbox.h);
  const instanceId = `${player.playerIndex}_${ability.id}_pillar_${spawnTick}_${state.spawnCount ?? 0}`;

  context.combat.spawnArea({
    id: instanceId,
    areaInstanceId: instanceId,
    owner: player,
    abilityId: ability.id,
    x,
    y,
    w: hitbox.w,
    h: hitbox.h,
    hitboxes: [{ x, y, w: hitbox.w, h: hitbox.h }],
    damage: hazard.damage ?? ability.damage ?? 0,
    knockback: {
      x: 0,
      y: hazard.knockdown ? 420 : ability.knockback?.y ?? -120,
    },
    durationTicks: 8,
    damageIntervalTicks: 9999,
    tickRate: ability.tickRate,
    friendlyFireSelf: Boolean(hazard.friendlyFireSelf),
    fillColor: "rgba(255, 246, 210, 0.34)",
    strokeColor: "rgba(255, 255, 255, 0.82)",
    effectType: ability.effectType,
    screenShake: ability.screenShake,
    stun: ability.stun,
  });
}

function getNextHazardInterval(ability, hazard, state) {
  const min = hazard.intervalMinTicks ?? 120;
  const max = Math.max(min, hazard.intervalMaxTicks ?? min);
  const t = deterministicUnit(`${ability.id}:interval:${state.spawnCount ?? 0}`);
  return min + Math.floor(t * (max - min + 1));
}

function deterministicUnit(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
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
  if (ability.type === "reload") {
    player.pendingAbility.released = true;
    applyReload(player, ability);
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
      ability.mirrorHitboxes === false
        ? player.x + hitbox.x
        : direction > 0
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
  updateComboState(player, ability);
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
    damage: projectile.contactDamage ?? damage,
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
    manualDetonate: Boolean(projectile.manualDetonate),
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
  updateComboState(player, ability);
}

function useRecastDetonateAbility(player, ability, context) {
  const activeProjectile = findManualProjectile(player, ability, context);
  if (activeProjectile) {
    detonateEditorProjectile(player, ability, activeProjectile, context);
    player.cooldowns[ability.id] = ability.cooldown ?? 0;
    if (ability.editorAction) {
      player.cooldownTicks[ability.id] = ability.cooldownTicks ?? 0;
    }
    player.skillFlash = 0.16;
    pushUseEffect(player, ability, context);
    return true;
  }

  if (
    player.pendingAbility ||
    (player.cooldowns[ability.id] ?? 0) > 0 ||
    (player.cooldownTicks[ability.id] ?? 0) > 0
  ) {
    return false;
  }

  if (!trySpendAbilityCharge(player, ability)) {
    return false;
  }

  if (!player.trySpendStamina(ability.staminaCost ?? 0)) {
    return false;
  }

  applyChargeOnUse(player, ability);
  if (ability.activeWeaponVisualId) {
    player.actionWeaponVisualId = ability.activeWeaponVisualId;
    player.actionWeaponVisualTicks =
      (ability.startupTicks ?? 0) +
      (ability.activeTicks ?? 0) +
      (ability.recoveryTicks ?? 0);
  }
  pushUseEffect(player, ability, context);
  if ((ability.startup ?? 0) > 0) {
    beginPendingAbility(player, ability);
  } else {
    fireProjectile(player, ability, context);
  }
  player.skillFlash = (ability.startup ?? 0) + 0.16;
  return true;
}

function findManualProjectile(player, ability, context) {
  return context.combat.projectiles.find(
    (projectile) =>
      projectile.owner === player &&
      projectile.abilityId === ability.id &&
      projectile.manualDetonate &&
      (Number.isInteger(projectile.lifeTicks)
        ? projectile.lifeTicks > 0
        : projectile.life > 0),
  );
}

function detonateEditorProjectile(player, ability, projectile, context) {
  projectile.life = 0;
  projectile.lifeTicks = 0;
  const detonation = ability.detonation ?? {};
  const hitbox = detonation.hitbox;
  const spawnTick = Number(context.simulationTick) || 0;
  const centerX = projectile.x + projectile.w / 2;
  const centerY = projectile.y + projectile.h / 2;
  const attackInstanceId = `${player.playerIndex}_${ability.id}_detonate_${spawnTick}`;

  if (hitbox) {
    context.combat.spawnHitbox({
      attackInstanceId,
      owner: player,
      abilityId: ability.id,
      type: "areaAttack",
      x: centerX + hitbox.x,
      y: centerY + hitbox.y,
      w: hitbox.w,
      h: hitbox.h,
      damage: detonation.damage ?? ability.damage ?? 0,
      knockback: {
        x: Math.abs(ability.knockback.x) * player.facing,
        y: ability.knockback.y,
      },
      knockbackMode: "awayFromOwner",
      effectType: detonation.effectType ?? ability.effectType,
      screenShake: detonation.screenShake ?? ability.screenShake,
      duration: detonation.durationTicks
        ? detonation.durationTicks / (ability.tickRate ?? 60)
        : ability.duration,
      durationTicks: detonation.durationTicks ?? ability.activeTicks ?? 1,
      tickRate: ability.tickRate,
      stun: ability.stun,
    });
  }

  if (ability.area?.hitbox) {
    const areaBox = ability.area.hitbox;
    context.combat.spawnArea({
      id: `${player.playerIndex}_${ability.id}_area_${spawnTick}`,
      areaInstanceId: `${player.playerIndex}_${ability.id}_area_${spawnTick}`,
      owner: player,
      abilityId: ability.id,
      x: centerX + areaBox.x,
      y: centerY + areaBox.y,
      w: areaBox.w,
      h: areaBox.h,
      facing: player.facing,
      hitboxes: [
        {
          x: centerX + areaBox.x,
          y: centerY + areaBox.y,
          w: areaBox.w,
          h: areaBox.h,
        },
      ],
      damage: ability.area.damage ?? ability.damage ?? 0,
      knockback: {
        x: Math.abs(ability.knockback.x) * player.facing,
        y: ability.knockback.y,
      },
      durationTicks: ability.area.durationTicks,
      damageIntervalTicks: ability.area.damageIntervalTicks,
      tickRate: ability.tickRate,
      visualWeaponId: ability.area.visualWeaponId,
      fillColor: ability.area.fillColor,
      strokeColor: ability.area.strokeColor,
      effectType: ability.effectType,
      screenShake: ability.screenShake,
      stun: ability.stun,
    });
  }

  consumeModeSwapBonus(player, ability);
}

function applyReload(player, ability) {
  if (ability.reload?.restore === "full") {
    player.stamina = player.maxStamina;
    player.staminaRegenTimer = 0;
  }
}

function trySpendAbilityCharge(player, ability) {
  const cost = ability.chargeCost ?? 0;
  if (!(cost > 0)) return true;
  if (player.trySpendChargeStack?.(cost)) return true;

  const selfDamage = ability.selfDamageOnChargeFail ?? 0;
  if (selfDamage > 0) {
    player.takeSelfDamage?.(selfDamage);
  }
  return false;
}

function applyChargeOnUse(player, ability) {
  const amount = ability.chargeOnUse ?? 0;
  if (amount > 0) {
    player.addChargeStack?.(amount);
  }
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
        ability.mirrorHitboxes === false
          ? player.x + hitbox.x
          : direction > 0
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
    fillColor: ability.area.fillColor,
    strokeColor: ability.area.strokeColor,
    effectType: ability.effectType,
    screenShake: ability.screenShake,
    stun: ability.stun,
  });
  updateComboState(player, ability);
}

function updateComboState(player, ability) {
  if (!ability.editorAction) return;
  if (ability.nextComboActionId && (ability.comboWindowTicks ?? 0) > 0) {
    player.comboNextActionId = ability.nextComboActionId;
    player.comboWindowTicks = ability.comboWindowTicks;
    player.comboResetActionId = ability.comboResetActionId ?? player.abilities.basicAttack;
    return;
  }
  player.comboNextActionId = null;
  player.comboWindowTicks = 0;
  player.comboResetActionId = ability.comboResetActionId ?? null;
  if (
    ability.comboResetActionId &&
    ability.comboResetActionId !== ability.id &&
    (ability.cooldownTicks ?? 0) > 0
  ) {
    player.cooldownTicks[ability.comboResetActionId] = ability.cooldownTicks;
    player.cooldowns[ability.comboResetActionId] =
      ability.cooldownTicks / (ability.tickRate ?? 60);
  }
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
