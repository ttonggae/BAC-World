// BAC World 캐릭터 에디터 출력 기반 구현 요청 - refined v1

/*
Refined by ChatGPT for BAC World.
핵심 수정:
- blade_hand 이름/기본 액션 정리
- 기본 3타 콤보 actionIds 포함
- bomb 입력 충돌 해결: B로 변경
- skip movement hitbox 제거
- bomb 준비 상태를 완전무적이 아니라 CC 면역(superArmor)으로 명확화
- sinho cooldown 1e+29 제거, oncePerMatch + hp 조건으로 변경
- sinho 랜덤 낙하를 seeded random hazard로 명확화
- OTHER_IMAGE_DATA 중복 id 제거 및 part name 고유화
*/

export const BAC_EDITOR_SCHEMA = {
  "version": "v8",
  "purpose": "BAC World simplified character editor export",
  "timing": {
    "unit": "ticks",
    "tickRate": 60
  },
  "coordinateSystem": {
    "characterParts": "character hitbox top-left",
    "weaponAnchor": "character hitbox top-left",
    "weaponParts": "weapon anchor",
    "meleeActionHitboxes": "character hitbox top-left",
    "customActionHitboxes": "character hitbox top-left",
    "projectileSpawnPoint": "character hitbox top-left",
    "projectileHitboxes": "projectile top-left",
    "otherImageParts": "other image local top-left, positioned on character preview canvas"
  },
  "facingRules": {
    "authoredFacing": "right",
    "mirrorWhenFacingLeft": true,
    "hitboxMirrorFormula": "mirroredX = character.size.w - hitbox.x - hitbox.w",
    "weaponAnchorMirrorFormula": "mirroredAnchorX = character.size.w - weapon.anchor.x"
  },
  "separationRules": {
    "character": "identity, concept, stats, AABB size, visual parts, default references; actionSlots are derived from ACTION_DATA.slot/input",
    "weapon": "visual parts, anchor, layer only",
    "action": "input, slot, kind, description, basic combat numbers, hitboxes, optional projectile visual/spawn data",
    "otherImage": "editor-only extra visual references/assets; no gameplay logic or physics"
  },
  "editorScope": {
    "included": [
      "character appearance",
      "character stats",
      "weapon appearance",
      "weapon anchor/layer",
      "action description",
      "basic action stats",
      "hitboxes",
      "projectile spawn and visual part filter",
      "action input/slot mapping",
      "editor-only other images / reference parts"
    ],
    "excluded": [
      "complex effect implementation",
      "status effect system",
      "rollback internals",
      "seeded random internals",
      "full cancel rule system",
      "character-specific exception logic"
    ]
  }
};

export const EDITOR_SELECTION = {
  "characterId": "blade_hand",
  "weaponId": "none_weapon",
  "actionId": "sinho",
  "otherImageId": "sinho7"
};

export const CHARACTER_DATA = {
  "blade_hand": {
    "id": "blade_hand",
    "name": "블레이즈핸드",
    "size": {
      "w": 42,
      "h": 42
    },
    "color": "#646464",
    "defaultWeaponId": "none_weapon",
    "defaultActionId": "normal_attack",
    "actionIds": [
      "normal_attack",
      "base_atteck2",
      "base_atteck3",
      "skip",
      "baekskip",
      "gun",
      "bomb"
    ],
    "actionSlots": {
      "basicAttack": "normal_attack",
      "movementSkill": "skip",
      "extra": "baekskip",
      "skill2": "gun",
      "skill1": "bomb",
      "special": null
    },
    "ui": {
      "role": "묵직한 칼날손과 화약으로 전장을 흔드는 조건부 전장 장악형 딜러",
      "description": "블레이즈핸드는 느린 이동 속도와 높은 체력을 가진 보스형 근접 딜러입니다. 칼날 손 3타 콤보와 백스텝 반격으로 근접전을 버티고, 권총과 폭탄으로 중거리를 압박하며, 체력이 낮을 때 한 번만 사용할 수 있는 신호탄으로 전장을 뒤흔듭니다.",
      "difficulty": 2,
      "tags": [
        "melee",
        "heavy",
        "combo",
        "gun",
        "bomb",
        "mid-range"
      ]
    },
    "stats": {
      "hp": 111,
      "stamina": 80,
      "staminaRegen": 30,
      "staminaRegenDelay": 0.5,
      "moveSpeed": 220,
      "jumpPower": 550,
      "weight": 2
    },
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "body",
          "x": 0,
          "y": 0,
          "w": 42,
          "h": 42,
          "rotation": 0.28,
          "radius": 0,
          "fill": "#6b5d51",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_02",
          "x": 4,
          "y": -2,
          "w": 33,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#140900",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_03",
          "x": 40,
          "y": 7,
          "w": 1,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_04",
          "x": 21,
          "y": 19,
          "w": 8,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#9c4a07",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_05",
          "x": 24,
          "y": 20,
          "w": 9,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#833f07",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_06",
          "x": 28,
          "y": 22,
          "w": 9,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#8e4306",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_07",
          "x": 31,
          "y": 24,
          "w": 8,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#653601",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_08",
          "x": 30,
          "y": 17,
          "w": 1,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_09",
          "x": 31,
          "y": 15,
          "w": 1,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_10",
          "x": 29,
          "y": 24,
          "w": 1,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_11",
          "x": 34,
          "y": 20,
          "w": 1,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_12",
          "x": 35,
          "y": 17,
          "w": 1,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_13",
          "x": 32,
          "y": 26,
          "w": 1,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_14",
          "x": 39,
          "y": 16,
          "w": 4,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#474741",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_15",
          "x": 34,
          "y": 26,
          "w": 8,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#723308",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_16",
          "x": 0,
          "y": 31,
          "w": 42,
          "h": 11,
          "rotation": 0,
          "radius": 0,
          "fill": "#222020",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_17",
          "x": 0,
          "y": 30,
          "w": 11,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#403f3f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_18",
          "x": 9,
          "y": 31,
          "w": 16,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#5a5858",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_19",
          "x": 24,
          "y": 30,
          "w": 14,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#453b3b",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_20",
          "x": 36,
          "y": 31,
          "w": 6,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#5a5858",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_21",
          "x": 26,
          "y": 32,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_22",
          "x": 9,
          "y": 31,
          "w": 17,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_23",
          "x": 0,
          "y": 30,
          "w": 9,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_24",
          "x": 21,
          "y": 20,
          "w": 3,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_25",
          "x": 24,
          "y": 29,
          "w": 2,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "body_2",
          "x": 42,
          "y": 8,
          "w": 1,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#6b5d51",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_27",
          "x": 38,
          "y": 14,
          "w": 4,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#474741",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_28",
          "x": 39,
          "y": 15,
          "w": 4,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#a19e92",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_29",
          "x": 40,
          "y": 15,
          "w": 3,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#736e66",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_30",
          "x": 35,
          "y": 13,
          "w": 4,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#474741",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_31",
          "x": 34,
          "y": 13,
          "w": 4,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#736e66",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_32",
          "x": 41,
          "y": 17,
          "w": 4,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#a19e92",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_33",
          "x": 42,
          "y": 18,
          "w": 4,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#474741",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_34",
          "x": 46,
          "y": 17,
          "w": 1,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_35",
          "x": 22,
          "y": 23,
          "w": 2,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_36",
          "x": 23,
          "y": 24,
          "w": 2,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_37",
          "x": 23,
          "y": 27,
          "w": 2,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_38",
          "x": 22,
          "y": 26,
          "w": 2,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#2f2d2d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_39",
          "x": 25,
          "y": 31,
          "w": 2,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_40",
          "x": 26,
          "y": 32,
          "w": 2,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_41",
          "x": 27,
          "y": 35,
          "w": 2,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_42",
          "x": 28,
          "y": 37,
          "w": 1,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_43",
          "x": 16,
          "y": 12,
          "w": 17,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#594e45",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "blade_hand_body_44",
          "x": 0,
          "y": 11,
          "w": 21,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#594e45",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  }
};

export const WEAPON_DATA = {
  "none_weapon": {
    "id": "none_weapon",
    "name": "None Weapon",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "visual": {
      "parts": []
    }
  }
};

export const ACTION_DATA = {
  "normal_attack": {
    "id": "normal_attack",
    "name": "칼날 1타",
    "input": "J",
    "slot": "basicAttack",
    "kind": "melee",
    "description": "칼날손 3타 콤보의 1타입니다. 중단 찌르기 형태로 전방을 공격합니다. 시전 시 콤보 단계가 1타로 기록되며, 2초(120tick) 이내에 J를 다시 누르면 base_atteck2로 연계됩니다. 콤보 단계별 데미지는 1타 13, 2타 14, 3타 15입니다.",
    "uiDescription": "칼날손 1타. 2초 안에 J를 다시 누르면 2타로 연계됩니다.",
    "implementationDescription": "OTHER_IMAGE_DATA의 base_1 이미지를 1타 연출로 사용합니다. normal_attack 적중/미적중과 관계없이 시전 후 120tick 안에 J 재입력 시 base_atteck2를 실행합니다. 같은 attackInstanceId가 같은 대상에게 중복 피해를 주지 않게 합니다.",
    "damage": 13,
    "staminaCost": 10,
    "startup": 12,
    "active": 15,
    "recovery": 12,
    "cooldown": 0,
    "lockActions": true,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox",
        "x": 43,
        "y": 23,
        "w": 38,
        "h": 8
      }
    ],
    "comboStep": 1,
    "nextComboActionId": "base_atteck2",
    "comboWindowTicks": 120,
    "comboResetActionId": "normal_attack"
  },
  "base_atteck2": {
    "id": "base_atteck2",
    "name": "칼날 2타",
    "input": "J",
    "slot": "basicAttack",
    "kind": "melee",
    "description": "칼날손 3타 콤보의 2타입니다. 하단 베기 형태로 전방을 공격합니다. 2초(120tick) 이내에 J를 다시 누르면 base_atteck3으로 연계됩니다.",
    "uiDescription": "칼날손 2타. 2초 안에 J를 다시 누르면 3타로 연계됩니다.",
    "implementationDescription": "OTHER_IMAGE_DATA의 base_2 이미지를 2타 연출로 사용합니다. normal_attack 이후 콤보 창 안에서만 실행되는 후속타로 처리합니다. 같은 attackInstanceId가 같은 대상에게 중복 피해를 주지 않게 합니다.",
    "damage": 14,
    "staminaCost": 10,
    "startup": 12,
    "active": 15,
    "recovery": 12,
    "cooldown": 0,
    "lockActions": true,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox",
        "x": 47,
        "y": 33,
        "w": 30,
        "h": 8
      },
      {
        "type": "rect",
        "name": "hitbox",
        "x": 44,
        "y": 23,
        "w": 9,
        "h": 18
      }
    ],
    "comboStep": 2,
    "nextComboActionId": "base_atteck3",
    "comboWindowTicks": 120,
    "comboResetActionId": "normal_attack"
  },
  "base_atteck3": {
    "id": "base_atteck3",
    "name": "칼날 3타",
    "input": "J",
    "slot": "basicAttack",
    "kind": "melee",
    "description": "칼날손 3타 콤보의 마무리입니다. 상단 베기 형태로 전방을 공격합니다. 사용 후 콤보는 normal_attack으로 초기화됩니다.",
    "uiDescription": "칼날손 3타. 사용 후 콤보가 초기화됩니다.",
    "implementationDescription": "OTHER_IMAGE_DATA의 base_3 이미지를 3타 연출로 사용합니다. base_atteck2 이후 콤보 창 안에서만 실행되는 마무리 후속타로 처리합니다. 같은 attackInstanceId가 같은 대상에게 중복 피해를 주지 않게 합니다.",
    "damage": 15,
    "staminaCost": 10,
    "startup": 12,
    "active": 15,
    "recovery": 12,
    "cooldown": 150,
    "lockActions": true,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox",
        "x": 52,
        "y": 1,
        "w": 27,
        "h": 10
      },
      {
        "type": "rect",
        "name": "hitbox",
        "x": 78,
        "y": 4,
        "w": 23,
        "h": 7
      },
      {
        "type": "rect",
        "name": "hitbox",
        "x": 43,
        "y": 8,
        "w": 18,
        "h": 10
      }
    ],
    "comboStep": 3,
    "nextComboActionId": "normal_attack",
    "comboWindowTicks": 0,
    "comboResetActionId": "normal_attack"
  },
  "skip": {
    "id": "skip",
    "name": "전방 대쉬",
    "input": "Shift",
    "slot": "movementSkill",
    "kind": "movement",
    "description": "순간적으로 신형을 흐리며 전방으로 빠르게 대쉬합니다. active 11tick 동안 전신 무적 판정을 받으며, moveSpeed 3.4배 속도로 전방 질주합니다. 이동기이므로 데미지와 hitbox는 없습니다.",
    "uiDescription": "순간적으로 신형을 흐리며 전방으로 빠르게 대쉬합니다.",
    "implementationDescription": "OTHER_IMAGE_DATA의 skip 이미지를 대쉬 잔상으로 사용합니다. startup 2tick 후 active 11tick 동안 invincible 상태를 적용하고 전방으로 빠르게 이동합니다. hitboxes는 반드시 []로 유지합니다.",
    "damage": 0,
    "staminaCost": 16,
    "startup": 2,
    "active": 11,
    "recovery": 7,
    "cooldown": 150,
    "hitboxes": []
  },
  "baekskip": {
    "id": "baekskip",
    "name": "백스텝 베기",
    "input": "K",
    "slot": "extra",
    "kind": "melee",
    "description": "적의 공격을 비스듬히 베어내며 뒤로 빠르게 물러서는 회피형 타격기입니다. 후방으로 이동하면서 전방에 짧은 칼날 판정이 발생합니다.",
    "uiDescription": "적의 공격을 비스듬히 베어내며 뒤로 빠르게 물러섭니다 ",
    "implementationDescription": "OTHER_IMAGE_DATA의 baekskip_1, baekskip_2를 순서대로 사용합니다. 캐릭터는 바라보는 반대 방향으로 후퇴하고, 공격 판정은 전방 짧은 범위에만 발생합니다. 같은 attackInstanceId가 같은 대상에게 중복 피해를 주지 않게 합니다.",
    "damage": 8,
    "staminaCost": 12,
    "startup": 4,
    "active": 8,
    "recovery": 10,
    "cooldown": 240,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox",
        "x": 18,
        "y": 6,
        "w": 45,
        "h": 32
      }
    ]
  },
  "gun": {
    "id": "gun",
    "name": "권총 사격",
    "input": "L",
    "slot": "skill2",
    "kind": "projectile",
    "description": "왼손의 권총을 발사합니다. startup 10tick 후 빠르게 직진하는 탄환 투사체를 발사하고, 적중 시 기본 피해와 짧은 출혈/도트 피해를 부여합니다.",
    "uiDescription": "왼손의 권총을 발사합니다",
    "implementationDescription": "OTHER_IMAGE_DATA의 gun 이미지를 투사체/발사 이펙트로 사용합니다. projectileInstanceId 기준으로 같은 대상에게 1회만 피해를 줍니다. 도트 피해는 status로 분리하고 collision 루프에서 매 frame 적용하지 않습니다.",
    "damage": 8,
    "staminaCost": 15,
    "startup": 10,
    "active": 40,
    "recovery": 15,
    "cooldown": 150,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox",
        "x": 55,
        "y": 18,
        "w": 20,
        "h": 15
      }
    ],
    "spawnPoint": {
      "x": 0,
      "y": 0
    },
    "projectileVisual": {
      "weaponId": "none_weapon",
      "otherImageId": "gun",
      "excludePartNames": []
    },
    "statusOnHit": {
      "id": "gun_bleed",
      "damage": 2,
      "ticks": 2,
      "intervalTicks": 30,
      "stacking": "refresh"
    }
  },
  "bomb": {
    "id": "bomb",
    "name": "폭약 살포",
    "input": "B",
    "slot": "skill1",
    "kind": "custom",
    "description": "전방에 화약을 길게 뿌린 뒤 중거리 구역을 폭발시킵니다. 내 몸 주변은 안전하지만 전방 중거리 구역의 적은 큰 피해를 입습니다. 준비 중에는 데미지는 받지만 stun/knockback/root/bind 같은 행동 방해 효과를 무시하는 슈퍼아머 상태가 됩니다.",
    "uiDescription": "전방 중거리 폭발. 준비 중에는 피해는 받지만 행동 방해를 무시합니다.",
    "implementationDescription": "OTHER_IMAGE_DATA의 bomb_1을 준비/화약 살포 연출로, bomb_2를 폭발 연출로 사용합니다. startup 90tick 동안 superArmor를 적용합니다. superArmor는 완전 무적이 아니며 damage는 정상적으로 받습니다. 폭발은 캐릭터 주변 0~45px 안전지대를 제외하고 전방 45~135px 중거리 구역에만 발생합니다. 같은 explosionInstanceId가 같은 대상에게 중복 피해를 주지 않게 합니다.",
    "damage": 18,
    "staminaCost": 20,
    "startup": 90,
    "active": 8,
    "recovery": 20,
    "cooldown": 450,
    "mirrorHitboxes": false,
    "hitboxes": [
      {
        "type": "rect",
        "name": "hitbox_right",
        "x": 87,
        "y": 0,
        "w": 90,
        "h": 42
      },
      {
        "type": "rect",
        "name": "hitbox_left",
        "x": -135,
        "y": 0,
        "w": 90,
        "h": 42
      }
    ],
    "superArmorDuringStartup": {
      "ignoreCrowdControl": true,
      "damageStillApplies": true
    }
  },
  "sinho": {
    "id": "sinho",
    "name": "백색 신호탄",
    "input": "N",
    "slot": "special",
    "kind": "custom",
    "description": "체력이 45% 이하일 때 매치당 1회만 사용할 수 있는 결전기입니다. 하늘로 백색 신호탄을 쏘아 올리고, 매치가 끝날 때까지 2~4초마다 seeded random으로 정해진 맵 위치에 거대한 나무기둥을 수직 낙하시킵니다.",
    "uiDescription": "체력 45% 이하에서 1회 사용. 라운드 종료까지 무작위 위치에 나무기둥 낙하.",
    "implementationDescription": "OTHER_IMAGE_DATA의 sinho1을 신호탄 발사 연출로 사용합니다. 이후 라운드 종료까지 전역 hazard 루프를 생성합니다. 낙하 위치는 반드시 seeded random으로 계산해 모든 클라이언트가 같은 tick에 같은 위치를 사용하게 합니다. 각 낙하는 낙하 전 경고 표시를 보여준 뒤 sinho6 → sinho7 연출로 수직 낙하합니다. pillarHazardInstanceId 기준으로 같은 대상에게 1회만 damage 22와 knockdown을 적용합니다. 시전자도 기둥에 맞을 수 있게 처리하는 것을 권장합니다.",
    "damage": 22,
    "staminaCost": 40,
    "startup": 30,
    "active": 5,
    "recovery": 20,
    "cooldown": 0,
    "hitboxes": [],
    "oncePerMatch": true,
    "requiresHpPercentAtOrBelow": 45,
    "fallingPillarHazard": {
      "intervalMinTicks": 120,
      "intervalMaxTicks": 240,
      "warningTicks": 45,
      "damage": 22,
      "knockdown": true,
      "hitbox": {
        "type": "rect",
        "name": "pillar_hitbox",
        "x": 0,
        "y": 0,
        "w": 18,
        "h": 86
      },
      "visualSequence": [
        "sinho6",
        "sinho7"
      ],
      "friendlyFireSelf": true,
      "usesSeededRandom": true
    }
  }
};

export const OTHER_IMAGE_DATA = {
  "base_2": {
    "id": "base_2",
    "name": " base 2 ",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "base_2_01",
          "x": 42,
          "y": 24,
          "w": 3,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_02",
          "x": 44,
          "y": 25,
          "w": 3,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_03",
          "x": 45,
          "y": 27,
          "w": 3,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_04",
          "x": 46,
          "y": 30,
          "w": 3,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_05",
          "x": 46,
          "y": 30,
          "w": 3,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_06",
          "x": 44,
          "y": 29,
          "w": 3,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_07",
          "x": 47,
          "y": 33,
          "w": 3,
          "h": 5,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_08",
          "x": 53,
          "y": 36,
          "w": 12,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_09",
          "x": 50,
          "y": 35,
          "w": 9,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_10",
          "x": 48,
          "y": 35,
          "w": 6,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_2_11",
          "x": 57,
          "y": 37,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "base_1": {
    "id": "base_1",
    "name": "base 1",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "base_1_01",
          "x": 43,
          "y": 25,
          "w": 12,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_02",
          "x": 50,
          "y": 24,
          "w": 16,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_03",
          "x": 52,
          "y": 24,
          "w": 1,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_04",
          "x": 51,
          "y": 26,
          "w": 1,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_05",
          "x": 58,
          "y": 23,
          "w": 10,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_06",
          "x": 63,
          "y": 23,
          "w": 11,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_1_07",
          "x": 64,
          "y": 23,
          "w": 18,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "base_3": {
    "id": "base_3",
    "name": "base 3",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "base_3_01",
          "x": 51,
          "y": 5,
          "w": 16,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_02",
          "x": 73,
          "y": 5,
          "w": 16,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_03",
          "x": 43,
          "y": 10,
          "w": 8,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_04",
          "x": 45,
          "y": 9,
          "w": 8,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_05",
          "x": 47,
          "y": 7,
          "w": 10,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#675046",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_06",
          "x": 54,
          "y": 7,
          "w": 1,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_07",
          "x": 55,
          "y": 5,
          "w": 1,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_08",
          "x": 57,
          "y": 4,
          "w": 16,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_09",
          "x": 60,
          "y": 3,
          "w": 17,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#110f0d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "base_3_10",
          "x": 79,
          "y": 7,
          "w": 21,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "skip": {
    "id": "skip",
    "name": "skip",
    "description": "순간적으로 신형을 흐리며 전방으로 빠르게 대쉬합니다",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "skip_01",
          "x": -75,
          "y": 9,
          "w": 49,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "skip_02",
          "x": -65,
          "y": 20,
          "w": 49,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "skip_03",
          "x": -56,
          "y": 27,
          "w": 49,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "skip_04",
          "x": -84,
          "y": 13,
          "w": 74,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "baekskip_1": {
    "id": "baekskip_1",
    "name": "baekskip_1",
    "description": "뒤로 빠르게 빠짐",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "baekskip_1_01",
          "x": -65,
          "y": 8,
          "w": 62,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_1_02",
          "x": -75,
          "y": 16,
          "w": 62,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_1_03",
          "x": -87,
          "y": 20,
          "w": 84,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_1_04",
          "x": -81,
          "y": 28,
          "w": 74,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "baekskip_2": {
    "id": "baekskip_2",
    "name": "baekskip_2",
    "description": "뒤로 빠르게 빠지며 칼을 휘두름 ",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "baekskip_2_01",
          "x": -33,
          "y": 8,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_02",
          "x": -24,
          "y": 30,
          "w": 6,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#efde6b",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_03",
          "x": -55,
          "y": 11,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_04",
          "x": -58,
          "y": 25,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_05",
          "x": -69,
          "y": 7,
          "w": 6,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#cc0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_06",
          "x": -70,
          "y": 29,
          "w": 12,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffdd00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_07",
          "x": -49,
          "y": 33,
          "w": 11,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#c70000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "baekskip_2_08",
          "x": -72,
          "y": 12,
          "w": 6,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffea00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "gun": {
    "id": "gun",
    "name": "gun",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "gun_01",
          "x": 55,
          "y": 27,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#f0a400",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "gun_02",
          "x": 65,
          "y": 25,
          "w": 7,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#901313",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "gun_03",
          "x": 59,
          "y": 25,
          "w": 16,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#d26060",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "gun_04",
          "x": 55,
          "y": 27,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#f0a400",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "gun_05",
          "x": 58,
          "y": 26,
          "w": 16,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.7
        },
        {
          "type": "rect",
          "name": "gun_06",
          "x": 72,
          "y": 26,
          "w": 2,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#757575",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "gun_07",
          "x": 55,
          "y": 28,
          "w": 16,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#7e642a",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        }
      ]
    }
  },
  "bomb_2": {
    "id": "bomb_2",
    "name": "bomb 2",
    "description": "폭파 예술이다 ",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "bomb_2_01",
          "x": -138,
          "y": -1,
          "w": 105,
          "h": 46,
          "rotation": 0,
          "radius": 0,
          "fill": "#af0e0e",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_02",
          "x": -147,
          "y": -15,
          "w": 106,
          "h": 46,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff9214",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_03",
          "x": -128,
          "y": 13,
          "w": 111,
          "h": 46,
          "rotation": 0,
          "radius": 0,
          "fill": "#a3b70b",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_04",
          "x": 94,
          "y": 3,
          "w": 76,
          "h": 40,
          "rotation": 0,
          "radius": 0,
          "fill": "#db490a",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_05",
          "x": 76,
          "y": -9,
          "w": 72,
          "h": 42,
          "rotation": 0,
          "radius": 0,
          "fill": "#b50808",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_06",
          "x": -145,
          "y": 6,
          "w": 74,
          "h": 44,
          "rotation": 0,
          "radius": 0,
          "fill": "#dfa916",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_07",
          "x": 103,
          "y": 15,
          "w": 85,
          "h": 37,
          "rotation": 0,
          "radius": 0,
          "fill": "#b1a410",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "bomb_2_08",
          "x": 119,
          "y": -20,
          "w": 83,
          "h": 59,
          "rotation": 0,
          "radius": 0,
          "fill": "#b61b1b",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        }
      ]
    }
  },
  "sinho1": {
    "id": "sinho1",
    "name": "SINHO1 ",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "sinho1_01",
          "x": 43,
          "y": -38,
          "w": 10,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffc800",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho1_02",
          "x": 41,
          "y": -37,
          "w": 8,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#ebd700",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "sinho1_03",
          "x": 45,
          "y": -35,
          "w": 3,
          "h": 21,
          "rotation": 0,
          "radius": 0,
          "fill": "#cb0101",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        },
        {
          "type": "rect",
          "name": "sinho1_04",
          "x": 51,
          "y": -34,
          "w": 3,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff7b00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.4
        }
      ]
    }
  },
  "sinho6": {
    "id": "sinho6",
    "name": "SINHO6",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "sinho6_01",
          "x": 134,
          "y": 40,
          "w": 18,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho6_02",
          "x": 142,
          "y": -113,
          "w": 4,
          "h": 94,
          "rotation": 0,
          "radius": 0,
          "fill": "#3b2716",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "sinho7": {
    "id": "sinho7",
    "name": "SINHO7",
    "description": "",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "sinho7_01",
          "x": 135,
          "y": 40,
          "w": 16,
          "h": 1,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho7_02",
          "x": 142,
          "y": -42,
          "w": 3,
          "h": 83,
          "rotation": 0,
          "radius": 0,
          "fill": "#3e2509",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho7_03",
          "x": 137,
          "y": 37,
          "w": 4,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho7_04",
          "x": 134,
          "y": 35,
          "w": 4,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho7_05",
          "x": 146,
          "y": 37,
          "w": 4,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "sinho7_06",
          "x": 149,
          "y": 35,
          "w": 4,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "bomb_1": {
    "id": "bomb_1",
    "name": "bomb prep",
    "description": "폭약을 길게 뿌리는 준비 연출",
    "position": {
      "x": 0,
      "y": 0
    },
    "opacity": 0.55,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "powder_line_front",
          "x": 45,
          "y": 32,
          "w": 90,
          "h": 2,
          "rotation": 0,
          "radius": 0,
          "fill": "#2b2b2b",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.8
        },
        {
          "type": "rect",
          "name": "powder_spark_1",
          "x": 70,
          "y": 28,
          "w": 6,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff9214",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.7
        },
        {
          "type": "rect",
          "name": "powder_spark_2",
          "x": 112,
          "y": 26,
          "w": 7,
          "h": 4,
          "rotation": 0,
          "radius": 0,
          "fill": "#dfa916",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.7
        }
      ]
    }
  }
};
