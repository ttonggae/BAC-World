import {
  BAC_EDITOR_SCHEMA,
  EDITOR_ACTION_DATA,
  EDITOR_CHARACTER_DATA,
  EDITOR_WEAPON_DATA,
} from "./editorThief.js";

const TICK_RATE = BAC_EDITOR_SCHEMA.timing.tickRate;
const ticksToSeconds = (ticks = 0) => ticks / TICK_RATE;

export function adaptEditorCharacters() {
  return Object.fromEntries(
    Object.values(EDITOR_CHARACTER_DATA).map((character) => [
      character.id,
      {
        id: character.id,
        name: character.name,
        description: character.description,
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
          basicAttack: character.actionSlots.basicAttack,
          skill1: character.actionSlots.skill1,
          skill2: character.actionSlots.skill2,
          movementSkill: character.actionSlots.movementSkill ?? null,
          special: null,
        },
        actionIds: [...character.actionIds],
        extraActionIds: [...character.extraActionIds],
        defaultWeaponId: character.defaultWeaponId,
        visual: character.visual,
        editorSchemaVersion: BAC_EDITOR_SCHEMA.version,
      },
    ]),
  );
}

export function adaptEditorActions() {
  return Object.fromEntries(
    Object.values(EDITOR_ACTION_DATA).map((action) => [
      action.id,
      {
        id: action.id,
        name: action.name,
        description: action.description,
        type: adaptActionType(action.kind),
        behavior: action.behavior ?? null,
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
              lifetimeSeconds: ticksToSeconds(action.projectile.lifetime),
            }
          : null,
        effects: action.effects?.map((effect) => ({ ...effect })) ?? [],
        effectsImplemented: true,
        castLockTicks:
          action.kind === "projectile" ? action.startup + action.recovery : 0,
        stun: action.kind === "projectile" ? ticksToSeconds(5) : ticksToSeconds(4),
        screenShake: action.kind === "projectile" ? 3 : action.kind === "melee" ? 2 : 0,
        effectType: action.kind === "projectile" ? "slashHit" : "smallHit",
        useEffectType:
          action.kind === "projectile"
            ? "projectileCast"
            : action.kind === "movement"
              ? "dashAfterimage"
              : "slashWind",
      },
    ]),
  );
}

export const EDITOR_WEAPONS = EDITOR_WEAPON_DATA;

function adaptActionType(kind) {
  if (kind === "effectMelee") return "effectMelee";
  return kind;
}
