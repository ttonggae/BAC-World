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

const TICK_RATE = BAC_EDITOR_SCHEMA.timing.tickRate;
const ticksToSeconds = (ticks = 0) => ticks / TICK_RATE;
const DATA_SOURCES = [
  {
    characters: EDITOR_CHARACTER_DATA,
    actions: EDITOR_ACTION_DATA,
    weapons: EDITOR_WEAPON_DATA,
    namespace: "",
  },
  {
    characters: WIZARD_CHARACTER_DATA,
    actions: WIZARD_ACTION_DATA,
    weapons: WIZARD_WEAPON_DATA,
    namespace: "",
  },
  {
    characters: FIGHTER_CHARACTER_DATA,
    actions: FIGHTER_ACTION_DATA,
    weapons: FIGHTER_WEAPON_DATA,
    namespace: "fighter",
  },
];

export function adaptEditorCharacters() {
  return Object.fromEntries(
    DATA_SOURCES.flatMap(({ characters, namespace }) =>
      Object.values(characters).map((character) => [
        character.id,
        {
          id: character.id,
          name: character.name,
          role: character.role ?? null,
          description: character.description,
          difficulty: character.difficulty ?? null,
          tags: [...(character.tags ?? [])],
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
            special: null,
          },
          actionIds: character.actionIds.map((id) => getRuntimeId(namespace, id)),
          extraActionIds: character.extraActionIds.map((id) =>
            getRuntimeId(namespace, id),
          ),
          defaultWeaponId: getRuntimeId(namespace, character.defaultWeaponId),
          defaultActionId: getRuntimeId(namespace, character.defaultActionId),
          sourceActionSlots: { ...character.actionSlots },
          sourceDefaultWeaponId: character.defaultWeaponId,
          sourceDefaultActionId: character.defaultActionId,
          visual: character.visual,
          editorSchemaVersion: BAC_EDITOR_SCHEMA.version,
        },
      ]),
    ),
  );
}

export function adaptEditorActions() {
  return Object.fromEntries(
    DATA_SOURCES.flatMap(({ actions, namespace }) =>
      Object.values(actions).map((action) => {
        const runtimeId = getRuntimeId(namespace, action.id);
        return [
          runtimeId,
          {
            id: runtimeId,
            sourceActionId: action.id,
            name: action.name,
            description: action.description,
            type: adaptActionType(action.kind),
            behavior: action.behavior ?? null,
            startupWeaponVisualId: getRuntimeId(
              namespace,
              action.startupWeaponVisualId,
            ),
            activeWeaponVisualId: getRuntimeId(
              namespace,
              action.activeWeaponVisualId,
            ),
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
            knockback: { ...action.knockback },
            movement: action.movement
              ? {
                  ...action.movement,
                  durationSeconds: ticksToSeconds(action.movement.duration),
                }
              : null,
            projectile: action.projectile
              ? {
                  ...action.projectile,
                  spawn: { ...action.projectile.spawn },
                  homing: action.projectile.homing
                    ? { ...action.projectile.homing }
                    : null,
                  lifetimeSeconds: ticksToSeconds(action.projectile.lifetime),
                }
              : null,
            effects: action.effects?.map((effect) => ({ ...effect })) ?? [],
            effectsImplemented: true,
            castLockTicks: action.lockActions
              ? action.startup + action.recovery
              : action.kind === "projectile"
                ? action.startup + action.recovery
                : 0,
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

function adaptActionType(kind) {
  if (kind === "effectMelee") return "effectMelee";
  return kind;
}

function getRuntimeId(namespace, id) {
  if (!id) return null;
  return namespace ? `${namespace}_${id}` : id;
}
