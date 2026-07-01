import { adaptEditorCharacters } from "./editorAdapter.js";

export const CHARACTERS = {
  basic: {
    id: "basic",
    name: "Basic",
    color: "#e85d56",
    size: { w: 42, h: 42 },
    stats: {
      maxHp: 100,
      maxStamina: 100,
      moveSpeed: 230,
      jumpPower: 610,
      weight: 1,
      staminaRegenRate: 25,
      staminaRegenDelay: 0.6,
    },
    abilities: {
      basicAttack: "basic_punch",
      skill1: "dash_punch",
      skill2: "energy_shot",
      special: null,
    },
  },
  heavy: {
    id: "heavy",
    name: "Heavy",
    color: "#4f8df7",
    size: { w: 46, h: 46 },
    stats: {
      maxHp: 130,
      maxStamina: 90,
      moveSpeed: 175,
      jumpPower: 560,
      weight: 1.35,
      staminaRegenRate: 25,
      staminaRegenDelay: 0.6,
    },
    abilities: {
      basicAttack: "heavy_basic_punch",
      skill1: "ground_slam",
      skill2: "iron_guard",
      special: null,
    },
  },
  speedy: {
    id: "speedy",
    name: "Speedy",
    color: "#42d39b",
    size: { w: 38, h: 38 },
    stats: {
      maxHp: 80,
      maxStamina: 120,
      moveSpeed: 275,
      jumpPower: 635,
      weight: 0.8,
      staminaRegenRate: 25,
      staminaRegenDelay: 0.6,
    },
    abilities: {
      basicAttack: "basic_punch",
      skill1: "quick_slash",
      skill2: "back_step",
      special: null,
    },
  },
  ...adaptEditorCharacters(),
};
