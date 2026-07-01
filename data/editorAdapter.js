import {
  BAC_EDITOR_SCHEMA,
  EDITOR_ACTION_DATA,
  EDITOR_CHARACTER_DATA,
  EDITOR_WEAPON_DATA,
} from "./editorThief.js";
import {
  WIZARD_ACTION_DATA,
  WIZARD_CHARACTER_DATA,
  WIZARD_WEAPON_DATA,
} from "./editorWizard.js";
import {
  FIGHTER_ACTION_DATA,
  FIGHTER_CHARACTER_DATA,
  FIGHTER_WEAPON_DATA,
} from "./editorFighter.js";
import {
  FYLANG_ACTION_DATA,
  FYLANG_CHARACTER_DATA,
  FYLANG_OTHER_IMAGE_DATA,
  FYLANG_WEAPON_DATA,
} from "./editorFylang.js";
import {
  INQUISITOR_ACTION_DATA,
  INQUISITOR_CHARACTER_DATA,
  INQUISITOR_WEAPON_DATA,
} from "./editorInquisitor.js";
import {
  HAI_HT2_ACTION_DATA,
  HAI_HT2_CHARACTER_DATA,
  HAI_HT2_OTHER_IMAGE_DATA,
  HAI_HT2_WEAPON_DATA,
} from "./editorHaiHt2.js";
import {
  W_CORP_CLEANER_ACTION_DATA,
  W_CORP_CLEANER_CHARACTER_DATA,
  W_CORP_CLEANER_OTHER_IMAGE_DATA,
  W_CORP_CLEANER_WEAPON_DATA,
} from "./editorWCorpCleaner.js";
import {
  ACTION_DATA as BLADE_HAND_ACTION_DATA,
  CHARACTER_DATA as BLADE_HAND_CHARACTER_DATA,
  OTHER_IMAGE_DATA as BLADE_HAND_OTHER_IMAGE_DATA,
  WEAPON_DATA as BLADE_HAND_WEAPON_DATA,
} from "./editorBladeHand.js";
import {
  ACTION_DATA as INDIGO_ELDER_ACTION_DATA,
  CHARACTER_DATA as INDIGO_ELDER_CHARACTER_DATA,
  OTHER_IMAGE_DATA as INDIGO_ELDER_OTHER_IMAGE_DATA,
  WEAPON_DATA as INDIGO_ELDER_WEAPON_DATA,
} from "./editorIndigoElder.js";
import {
  ACTION_DATA as UNDERBOSS_ACTION_DATA,
  CHARACTER_DATA as UNDERBOSS_CHARACTER_DATA,
  OTHER_IMAGE_DATA as UNDERBOSS_OTHER_IMAGE_DATA,
  WEAPON_DATA as UNDERBOSS_WEAPON_DATA,
} from "./editorUnderboss.js";

const TICK_RATE = BAC_EDITOR_SCHEMA.timing.tickRate;
const ticksToSeconds = (ticks = 0) => ticks / TICK_RATE;
const DATA_SOURCES = [
  {
    characters: EDITOR_CHARACTER_DATA,
    actions: EDITOR_ACTION_DATA,
    weapons: EDITOR_WEAPON_DATA,
    otherImages: {},
    namespace: "",
  },
  {
    characters: WIZARD_CHARACTER_DATA,
    actions: WIZARD_ACTION_DATA,
    weapons: WIZARD_WEAPON_DATA,
    otherImages: {},
    namespace: "",
  },
  {
    characters: FIGHTER_CHARACTER_DATA,
    actions: FIGHTER_ACTION_DATA,
    weapons: FIGHTER_WEAPON_DATA,
    otherImages: {},
    namespace: "fighter",
  },
  {
    characters: FYLANG_CHARACTER_DATA,
    actions: FYLANG_ACTION_DATA,
    weapons: FYLANG_WEAPON_DATA,
    otherImages: FYLANG_OTHER_IMAGE_DATA,
    namespace: "fylang",
  },
  {
    characters: INQUISITOR_CHARACTER_DATA,
    actions: INQUISITOR_ACTION_DATA,
    weapons: INQUISITOR_WEAPON_DATA,
    otherImages: {},
    namespace: "inquisitor",
  },
  {
    characters: HAI_HT2_CHARACTER_DATA,
    actions: HAI_HT2_ACTION_DATA,
    weapons: HAI_HT2_WEAPON_DATA,
    otherImages: HAI_HT2_OTHER_IMAGE_DATA,
    namespace: "hai",
  },
  {
    characters: W_CORP_CLEANER_CHARACTER_DATA,
    actions: W_CORP_CLEANER_ACTION_DATA,
    weapons: W_CORP_CLEANER_WEAPON_DATA,
    otherImages: W_CORP_CLEANER_OTHER_IMAGE_DATA,
    namespace: "wcorp",
  },
  {
    characters: BLADE_HAND_CHARACTER_DATA,
    actions: BLADE_HAND_ACTION_DATA,
    weapons: BLADE_HAND_WEAPON_DATA,
    otherImages: BLADE_HAND_OTHER_IMAGE_DATA,
    namespace: "blade",
    skipActionIds: ["sinho"],
  },
  {
    characters: INDIGO_ELDER_CHARACTER_DATA,
    actions: INDIGO_ELDER_ACTION_DATA,
    weapons: INDIGO_ELDER_WEAPON_DATA,
    otherImages: INDIGO_ELDER_OTHER_IMAGE_DATA,
    namespace: "indigo",
  },
  {
    characters: UNDERBOSS_CHARACTER_DATA,
    actions: UNDERBOSS_ACTION_DATA,
    weapons: UNDERBOSS_WEAPON_DATA,
    otherImages: UNDERBOSS_OTHER_IMAGE_DATA,
    namespace: "underboss",
  },
];

export function adaptEditorCharacters() {
  return Object.fromEntries(
    DATA_SOURCES.flatMap(({ characters, actions, namespace }) =>
      Object.values(characters).map((character) => {
        const getInput = (actionId) =>
          actionId ? actions[actionId]?.input?.toUpperCase() ?? null : null;
        return [
        character.id,
        {
          id: character.id,
          name: character.name,
          role: character.role ?? character.ui?.role ?? null,
          description: character.description ?? character.ui?.description ?? "",
          difficulty: character.difficulty ?? character.ui?.difficulty ?? null,
          tags: [...(character.tags ?? character.ui?.tags ?? [])],
          color: character.color,
          size: { ...character.size },
          stats: {
            maxHp: character.stats.hp,
            maxStamina: character.stats.stamina,
            moveSpeed: character.stats.moveSpeed,
            jumpPower: character.stats.jumpPower,
            weight: character.stats.weight,
            staminaRegenRate: character.stats.staminaRegen,
            staminaRegenDelay: character.stats.staminaRegenDelay,
            maxChargeStack:
              namespace === "underboss" ? 5 : character.stats.maxChargeStack ?? 0,
            maxAmmo: namespace === "underboss" ? 10 : character.stats.maxAmmo ?? 0,
            ammoReloadAmount:
              namespace === "underboss" ? 5 : character.stats.ammoReloadAmount ?? 0,
            chargeStackSpeedBonus:
              namespace === "underboss" ? 20 : character.stats.chargeStackSpeedBonus ?? 0,
            chargeStackDecayTicks:
              namespace === "underboss" ? 300 : character.stats.chargeStackDecayTicks ?? 0,
          },
          abilities: {
            basicAttack: getRuntimeId(namespace, character.actionSlots.basicAttack),
            skill1: getRuntimeId(namespace, character.actionSlots.skill1),
            skill2: getRuntimeId(namespace, character.actionSlots.skill2),
            movementSkill: getRuntimeId(
              namespace,
              character.actionSlots.movementSkill,
            ),
            extra: getRuntimeId(namespace, character.actionSlots.extra),
            extra2: getRuntimeId(namespace, character.actionSlots.extra2),
            special: getRuntimeId(namespace, character.actionSlots.special),
          },
          actionIds: (character.actionIds ?? []).map((id) => getRuntimeId(namespace, id)),
          extraActionIds: (character.extraActionIds ?? []).map((id) =>
            getRuntimeId(namespace, id),
          ),
          defaultWeaponId: getRuntimeId(namespace, character.defaultWeaponId),
          passiveWeaponIds: (character.passiveWeaponIds ?? []).map((id) =>
            getRuntimeId(namespace, id),
          ),
          defaultActionId: getRuntimeId(namespace, character.defaultActionId),
          sourceActionSlots: { ...character.actionSlots },
          actionInputs: {
            basicAttack: getInput(character.actionSlots.basicAttack),
            skill1: getInput(character.actionSlots.skill1),
            skill2: getInput(character.actionSlots.skill2),
            extra: getInput(character.actionSlots.extra),
            extra2: getInput(character.actionSlots.extra2),
            special: getInput(character.actionSlots.special),
            movementSkill: getInput(character.actionSlots.movementSkill),
          },
          sourceDefaultWeaponId: character.defaultWeaponId,
          sourceDefaultActionId: character.defaultActionId,
          defaultOtherImageId:
            namespace === "underboss"
              ? getRuntimeId(namespace, "fight_pose")
              : getRuntimeId(namespace, character.defaultOtherImageId),
          stance: adaptStance(character.stance, namespace),
          visual: character.visual,
          editorSchemaVersion: BAC_EDITOR_SCHEMA.version,
        },
      ];
      }),
    ),
  );
}

export function adaptEditorActions() {
  return Object.fromEntries(
    DATA_SOURCES.flatMap(({ actions, namespace, skipActionIds = [] }) =>
      Object.values(actions)
        .filter((action) => !skipActionIds.includes(action.id))
        .map((action) => {
        const runtimeId = getRuntimeId(namespace, action.id);
        const underbossMeta = adaptUnderbossAction(action, namespace);
        return [
          runtimeId,
          {
            id: runtimeId,
            sourceActionId: action.id,
            name: action.name,
            description: action.description,
            type: adaptActionType(action),
            behavior: action.behavior ?? null,
            startupWeaponVisualId: getRuntimeId(
              namespace,
              action.startupWeaponVisualId,
            ),
            activeWeaponVisualId:
              underbossMeta.activeWeaponVisualId ??
              getRuntimeId(namespace, action.activeWeaponVisualId),
            editorAction: true,
            tickRate: TICK_RATE,
            damage: action.damage,
            staminaCost: action.staminaCost,
            startup: ticksToSeconds(action.startup),
            duration: ticksToSeconds(action.active),
            recovery: ticksToSeconds(action.recovery),
            cooldown: ticksToSeconds(action.cooldown),
            startupTicks: action.startup,
            activeTicks: action.active,
            recoveryTicks: action.recovery,
            cooldownTicks: action.cooldown,
            hitboxes: action.hitboxes.map((hitbox) => ({ ...hitbox })),
            knockback: action.knockback ? { ...action.knockback } : { x: 0, y: 0 },
            comboStep: action.comboStep ?? null,
            nextComboActionId: getRuntimeId(namespace, action.nextComboActionId),
            comboWindowTicks: action.comboWindowTicks ?? 0,
            comboResetActionId: getRuntimeId(namespace, action.comboResetActionId),
            mirrorHitboxes: action.mirrorHitboxes !== false,
            oncePerMatch: Boolean(action.oncePerMatch),
            requiresHpPercentAtOrBelow: action.requiresHpPercentAtOrBelow ?? null,
            fallingPillarHazard: action.fallingPillarHazard
              ? {
                  ...action.fallingPillarHazard,
                  hitbox: action.fallingPillarHazard.hitbox
                    ? { ...action.fallingPillarHazard.hitbox }
                    : null,
                  visualSequence: [
                    ...(action.fallingPillarHazard.visualSequence ?? []),
                  ].map((id) => getRuntimeId(namespace, id)),
                }
              : null,
            movement: adaptMovement(action),
            stanceSwitch: action.stanceSwitch
              ? {
                  ...action.stanceSwitch,
                  modes: [...(action.stanceSwitch.modes ?? [])],
                }
              : null,
            projectile: adaptProjectile(action, namespace),
            area: action.area
              ? {
                  ...action.area,
                  hitbox: action.area.hitbox ? { ...action.area.hitbox } : null,
                  visualWeaponId: getRuntimeId(
                    namespace,
                    action.area.visualWeaponId,
                  ),
                }
              : null,
            detonation: action.detonation
              ? {
                  ...action.detonation,
                  hitbox: action.detonation.hitbox
                    ? { ...action.detonation.hitbox }
                    : null,
                }
              : null,
            reload: underbossMeta.reload ?? (action.reload ? { ...action.reload } : null),
            ammoCost: underbossMeta.ammoCost ?? action.ammoCost ?? 0,
            consumeAllAmmo: Boolean(underbossMeta.consumeAllAmmo ?? action.consumeAllAmmo),
            requiresAmmo: Boolean(underbossMeta.requiresAmmo ?? action.requiresAmmo),
            requireMaxChargeStack:
              underbossMeta.requireMaxChargeStack ?? action.requireMaxChargeStack ?? false,
            consumeAllChargeStacks: Boolean(
              underbossMeta.consumeAllChargeStacks ?? action.consumeAllChargeStacks,
            ),
            moveSpeedBonus: action.moveSpeedBonus ?? 0,
            sustainStaminaCostPerSecond:
              action.sustainStaminaCostPerSecond ?? 0,
            chargeCost: action.chargeCost ?? 0,
            chargeOnUse: action.chargeOnUse ?? 0,
            selfDamageOnChargeFail: action.selfDamageOnChargeFail ?? 0,
            effects: [...adaptEffects(action, namespace), ...underbossMeta.effects],
            effectsImplemented: true,
            castLockTicks:
              underbossMeta.castLockTicks ??
              (action.lockActions
                ? action.startup + action.recovery
                : action.kind === "projectile"
                  ? action.startup + action.recovery
                  : 0),
            invincibleTicks:
              underbossMeta.invincibleTicks ??
              action.invincibleTicks ??
              (action.kind === "movement" ? action.active ?? 0 : 0),
            statusImmuneTicks:
              underbossMeta.statusImmuneTicks ?? action.statusImmuneTicks ?? 0,
            hurtboxDisabledTicks: action.hurtboxDisabledTicks ?? 0,
            superArmorDuringStartup: action.superArmorDuringStartup
              ? { ...action.superArmorDuringStartup }
              : null,
            stun: ticksToSeconds(
              action.stunTicks ?? (action.kind === "projectile" ? 5 : 4),
            ),
            screenShake:
              action.screenShake ??
              (action.kind === "projectile"
                ? 3
                : action.kind === "melee"
                  ? 2
                  : 0),
            effectType:
              action.effectType ??
              (action.kind === "projectile" ? "slashHit" : "smallHit"),
            useEffectType:
              action.useEffectType ??
              (action.kind === "projectile"
                ? "projectileCast"
                : action.kind === "movement"
                  ? "dashAfterimage"
                  : "slashWind"),
          },
        ];
      }),
    ),
  );
}

export const EDITOR_WEAPONS = Object.fromEntries(
  DATA_SOURCES.flatMap(({ weapons, namespace }) =>
    Object.values(weapons).map((weapon) => {
      const runtimeId = getRuntimeId(namespace, weapon.id);
      return [runtimeId, { ...weapon, id: runtimeId, sourceWeaponId: weapon.id }];
    }),
  ),
);

export const EDITOR_OTHER_IMAGES = Object.fromEntries(
  DATA_SOURCES.flatMap(({ otherImages = {}, namespace }) =>
    Object.values(otherImages).map((image) => {
      const runtimeId = getRuntimeId(namespace, image.id);
      return [runtimeId, { ...image, id: runtimeId, sourceImageId: image.id }];
    }),
  ),
);

function adaptActionType(action) {
  if (action.id === "reload") return "reload";
  if (action.id === "sting_dash") return "dashMelee";
  if (action.id === "baekskip") return "dashMelee";
  if (action.kind === "effectMelee") return "effectMelee";
  return action.kind;
}

function adaptUnderbossAction(action, namespace) {
  if (namespace !== "underboss") {
    return { effects: [] };
  }

  const attackIds = new Set(["normal_attack", "vertical_cut", "sting_dash"]);
  const ammoSkillIds = new Set([
    "normal_attack",
    "vertical_cut",
    "sting_dash",
    "disposal_backstep",
  ]);

  if (action.id === "reload") {
    return {
      effects: [],
      reload: { ammo: 5, delayTicks: 120 },
      ammoCost: 0,
      requiresAmmo: false,
      activeWeaponVisualId: getRuntimeId(namespace, "reload_pose"),
      castLockTicks: 120,
    };
  }

  if (action.id === "evasion_execute") {
    return {
      effects: [
        { type: "status", statusId: "stun", durationTicks: 60, refreshRule: "refresh" },
        { type: "addCharge", amount: 5, max: 5 },
        { type: "restoreAmmo", amount: 10 },
      ],
      ammoCost: 0,
      requiresAmmo: true,
      requireMaxChargeStack: true,
      consumeAllAmmo: true,
      consumeAllChargeStacks: true,
      activeWeaponVisualId: getRuntimeId(namespace, "evasion_pose"),
      castLockTicks: 72,
    };
  }

  const visualByAction = {
    normal_attack: "horizontal_slash_effect",
    vertical_cut: "vertical_slash_effect",
    sting_dash: "sting_pose",
  };

  return {
    effects: attackIds.has(action.id) ? [{ type: "addCharge", amount: 1, max: 5 }] : [],
    ammoCost: ammoSkillIds.has(action.id) ? 1 : 0,
    requiresAmmo: ammoSkillIds.has(action.id),
    activeWeaponVisualId: visualByAction[action.id]
      ? getRuntimeId(namespace, visualByAction[action.id])
      : null,
    invincibleTicks: action.id === "disposal_backstep" ? 12 : null,
    statusImmuneTicks: action.id === "disposal_backstep" ? 12 : null,
  };
}

function adaptMovement(action) {
  if (action.movement) {
    return {
      ...action.movement,
      durationSeconds: ticksToSeconds(action.movement.duration),
    };
  }

  if (action.id === "baekskip") {
    return {
      type: "dash",
      direction: "backward",
      duration: action.active ?? 8,
      durationSeconds: ticksToSeconds(action.active ?? 8),
      speed: 520,
      stopOnEnd: true,
    };
  }

  if (action.id === "disposal_backstep") {
    return {
      type: "dash",
      direction: "backward",
      duration: action.active ?? 12,
      durationSeconds: ticksToSeconds(action.active ?? 12),
      speed: 250,
      stopOnEnd: true,
    };
  }

  if (action.id === "sting_dash") {
    return {
      type: "dash",
      direction: "facing",
      duration: action.active ?? 18,
      durationSeconds: ticksToSeconds(action.active ?? 18),
      speed: 668,
      stopOnEnd: true,
    };
  }

  if (action.kind !== "movement") return null;
  return {
    type: "dash",
    direction: "facing",
    duration: action.active ?? 0,
    durationSeconds: ticksToSeconds(action.active ?? 0),
    speed: action.moveSpeed ?? 650,
    stopOnEnd: true,
  };
}

function adaptProjectile(action, namespace) {
  if (action.projectile) {
    return {
      ...action.projectile,
      spawn: { ...action.projectile.spawn },
      visualWeaponId: getRuntimeId(namespace, action.projectile.visualWeaponId),
      homing: action.projectile.homing ? { ...action.projectile.homing } : null,
      lifetimeSeconds: ticksToSeconds(action.projectile.lifetime),
    };
  }

  if (action.kind !== "projectile") return null;
  const visual = action.projectileVisual ?? {};
  return {
    spawn: { ...(action.spawnPoint ?? { x: 0, y: 0 }) },
    visualWeaponId: getRuntimeId(
      namespace,
      visual.otherImageId ?? visual.weaponId ?? null,
    ),
    excludePartNames: [...(visual.excludePartNames ?? [])],
    speed: action.projectileSpeed ?? 680,
    lifetime: action.projectileLifetime ?? action.active ?? 60,
    lifetimeSeconds: ticksToSeconds(action.projectileLifetime ?? action.active ?? 60),
    pierce: 0,
    destroyOnHit: true,
    destroyOnWall: true,
  };
}

function adaptEffects(action, namespace = "") {
  const effects = action.effects?.map((effect) => ({
    ...effect,
    visualWeaponId: getRuntimeId(namespace, effect.visualWeaponId),
  })) ?? [];
  if (action.statusOnHit) {
    const status = action.statusOnHit;
    effects.push({
      type: "status",
      statusId: "bleed",
      damagePerTick: status.damage ?? 0,
      tickInterval: status.intervalTicks ?? 30,
      maxTicks: status.ticks ?? 1,
      durationTicks: (status.intervalTicks ?? 30) * (status.ticks ?? 1),
      refreshRule: status.stacking === "refresh" ? "refresh" : undefined,
    });
  }
  return effects;
}

function getRuntimeId(namespace, id) {
  if (!id) return null;
  return namespace ? `${namespace}_${id}` : id;
}

function adaptStance(stance, namespace) {
  if (!stance) return null;
  return {
    defaultMode: stance.defaultMode,
    modes: Object.fromEntries(
      Object.entries(stance.modes ?? {}).map(([modeId, mode]) => [
        modeId,
        {
          weaponId: getRuntimeId(namespace, mode.weaponId),
          indicatorId: getRuntimeId(namespace, mode.indicatorId),
          actionSlots: {
            basicAttack: getRuntimeId(namespace, mode.actionSlots.basicAttack),
            skill1: getRuntimeId(namespace, mode.actionSlots.skill1),
            skill2: getRuntimeId(namespace, mode.actionSlots.skill2),
            movementSkill: getRuntimeId(namespace, mode.actionSlots.movementSkill),
            extra: getRuntimeId(namespace, mode.actionSlots.extra),
            extra2: getRuntimeId(namespace, mode.actionSlots.extra2),
            special: getRuntimeId(namespace, mode.actionSlots.special),
          },
        },
      ]),
    ),
  };
}
