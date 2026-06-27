export const INQUISITOR_CHARACTER_DATA = {
  "inquisitor": {
    "id": "inquisitor",
    "name": "이단심판관",
    "role": "못과 망치, 사슬, 처형 도구로 상대를 추격하며 묶어두는 근접 제어형 심판관",
    "description": "이단심판관은 못과 망치로 압박하고 사슬로 상대를 묶어 추격하는 캐릭터입니다. 처형 못과 감옥으로 움직임을 제한하고, 패리와 추격으로 근접전을 강요합니다.",
    "difficulty": 2,
    "tags": [
      "melee",
      "control",
      "chase",
      "bleed",
      "parry",
      "crowd-control"
    ],
    "size": {
      "w": 42,
      "h": 46
    },
    "color": "#8f9092",
    "defaultWeaponId": "nail_and_hammer",
    "defaultActionId": "normal_attack",
    "actionSlots": {
      "basicAttack": "normal_attack",
      "skill1": "chgilk",
      "skill2": "nail",
      "extra": "faary",
      "special": "jail",
      "movementSkill": "skip"
    },
    "actionIds": [
      "normal_attack",
      "chgilk",
      "nail",
      "faary",
      "jail",
      "skip"
    ],
    "extraActionIds": [
      "faary",
      "jail",
      "skip"
    ],
    "stats": {
      "hp": 111,
      "stamina": 77,
      "staminaRegen": 33,
      "staminaRegenDelay": 0.5,
      "moveSpeed": 270,
      "jumpPower": 580,
      "weight": 1.2
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
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_2",
          "x": 0,
          "y": 16,
          "w": 42,
          "h": 26,
          "radius": 0,
          "fill": "#393737",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_3",
          "x": 39,
          "y": 5,
          "w": 1,
          "h": 9,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_4",
          "x": 37,
          "y": 5,
          "w": 1,
          "h": 9,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_5",
          "x": 35,
          "y": 5,
          "w": 1,
          "h": 9,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_6",
          "x": -3,
          "y": 9,
          "w": 8,
          "h": 33,
          "radius": 0,
          "fill": "#b10606",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_7",
          "x": -6,
          "y": 13,
          "w": 8,
          "h": 28,
          "radius": 0,
          "fill": "#b10606",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_8",
          "x": -9,
          "y": 16,
          "w": 7,
          "h": 24,
          "radius": 0,
          "fill": "#b10606",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_9",
          "x": 5,
          "y": 13,
          "w": 37,
          "h": 6,
          "radius": 0,
          "fill": "#5a4949",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_10",
          "x": 32,
          "y": 14,
          "w": 5,
          "h": 5,
          "radius": 0,
          "fill": "#fa0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_11",
          "x": 25,
          "y": 22,
          "w": 5,
          "h": 12,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_12",
          "x": 24,
          "y": 33,
          "w": 6,
          "h": 5,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_13",
          "x": 25,
          "y": 32,
          "w": 5,
          "h": 1,
          "radius": 0,
          "fill": "#322a2a",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_14",
          "x": 28,
          "y": 34,
          "w": 2,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_15",
          "x": 28,
          "y": 36,
          "w": 2,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_16",
          "x": 41,
          "y": 9,
          "w": 1,
          "h": 4,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_17",
          "x": 33,
          "y": 17,
          "w": 3,
          "h": 12,
          "radius": 0,
          "fill": "#ffffff",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_18",
          "x": 34,
          "y": 18,
          "w": 1,
          "h": 4,
          "radius": 0,
          "fill": "#bd3d3d",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_19",
          "x": 34,
          "y": 23,
          "w": 1,
          "h": 4,
          "radius": 0,
          "fill": "#6a1010",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_20",
          "x": 34,
          "y": 2,
          "w": 1,
          "h": 8,
          "radius": 0,
          "fill": "#fa0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "inquisitor_part_21",
          "x": 33,
          "y": 0,
          "w": 1,
          "h": 8,
          "radius": 0,
          "fill": "#f00f0f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "inquisitor_part_22",
          "x": 32,
          "y": -2,
          "w": 1,
          "h": 8,
          "radius": 0,
          "fill": "#d20f0f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "inquisitor_part_23",
          "x": 31,
          "y": -4,
          "w": 1,
          "h": 8,
          "radius": 0,
          "fill": "#f22121",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "inquisitor_part_24",
          "x": 27,
          "y": 23,
          "w": 1,
          "h": 7,
          "radius": 0,
          "fill": "#fff700",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "inquisitor_part_25",
          "x": 25,
          "y": 25,
          "w": 5,
          "h": 1,
          "radius": 0,
          "fill": "#fff700",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  }
};

export const INQUISITOR_WEAPON_DATA = {
  "nail_and_hammer": {
    "id": "nail_and_hammer",
    "name": "Nail and Hammer",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "nail_and_hammer_part_1",
          "x": 30,
          "y": 35,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_2",
          "x": 37,
          "y": 34,
          "w": 1,
          "h": 3,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_3",
          "x": 18,
          "y": 35,
          "w": 6,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_4",
          "x": 42,
          "y": 35,
          "w": 16,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_5",
          "x": 58,
          "y": 33,
          "w": 6,
          "h": 4,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_6",
          "x": 55,
          "y": 32,
          "w": 7,
          "h": 1,
          "radius": 0,
          "fill": "#7e3030",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_7",
          "x": 57,
          "y": 37,
          "w": 9,
          "h": 2,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_8",
          "x": 56,
          "y": 39,
          "w": 11,
          "h": 4,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_9",
          "x": 55,
          "y": 43,
          "w": 13,
          "h": 1,
          "radius": 0,
          "fill": "#5c2424",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_10",
          "x": 53,
          "y": 30,
          "w": 8,
          "h": 2,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_and_hammer_part_11",
          "x": 51,
          "y": 29,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#420000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "chgilk": {
    "id": "chgilk",
    "name": "Chain Whip",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "chgilk_part_1",
          "x": 30,
          "y": 35,
          "w": 6,
          "h": 1,
          "radius": 0,
          "fill": "#321f1f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_2",
          "x": 36,
          "y": 35,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_3",
          "x": 39,
          "y": 34,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_4",
          "x": 42,
          "y": 33,
          "w": 9,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_5",
          "x": 45,
          "y": 32,
          "w": 11,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_6",
          "x": 49,
          "y": 31,
          "w": 16,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_7",
          "x": 63,
          "y": 32,
          "w": 3,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_8",
          "x": 58,
          "y": 33,
          "w": 7,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_9",
          "x": 59,
          "y": 34,
          "w": 10,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_10",
          "x": 63,
          "y": 35,
          "w": 10,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "chgilk_part_11",
          "x": 38,
          "y": 30,
          "w": 34,
          "h": 6,
          "radius": 0,
          "fill": "#af3131",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "chgilk_part_12",
          "x": 34,
          "y": 29,
          "w": 35,
          "h": 6,
          "radius": 0,
          "fill": "#974949",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        }
      ]
    }
  },
  "nail": {
    "id": "nail",
    "name": "Execution Nail",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "nail_part_1",
          "x": 88,
          "y": 16,
          "w": 57,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "nail_part_2",
          "x": 86,
          "y": 12,
          "w": 1,
          "h": 9,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "faary": {
    "id": "faary",
    "name": "Parry",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "faary_part_1",
          "x": 30,
          "y": 35,
          "w": 9,
          "h": 2,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_2",
          "x": 39,
          "y": 34,
          "w": 10,
          "h": 2,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_3",
          "x": 48,
          "y": 34,
          "w": 12,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_4",
          "x": 55,
          "y": 33,
          "w": 11,
          "h": 1,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_5",
          "x": 66,
          "y": 29,
          "w": 4,
          "h": 4,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_6",
          "x": 66,
          "y": 31,
          "w": 5,
          "h": 3,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_7",
          "x": 63,
          "y": 27,
          "w": 6,
          "h": 2,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_8",
          "x": 60,
          "y": 26,
          "w": 7,
          "h": 1,
          "radius": 0,
          "fill": "#640707",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_9",
          "x": 64,
          "y": 34,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#9c3a3a",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "faary_part_10",
          "x": 62,
          "y": 35,
          "w": 12,
          "h": 3,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "jail": {
    "id": "jail",
    "name": "Judgment Jail",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "jail_part_1",
          "x": 105,
          "y": -18,
          "w": 1,
          "h": 64,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_2",
          "x": 102,
          "y": -18,
          "w": 1,
          "h": 64,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_3",
          "x": 99,
          "y": -17,
          "w": 1,
          "h": 63,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_4",
          "x": 96,
          "y": -23,
          "w": 1,
          "h": 69,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_5",
          "x": 94,
          "y": -22,
          "w": 1,
          "h": 68,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_6",
          "x": 91,
          "y": -19,
          "w": 1,
          "h": 65,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_7",
          "x": 88,
          "y": -15,
          "w": 1,
          "h": 61,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_8",
          "x": 85,
          "y": -11,
          "w": 1,
          "h": 57,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_9",
          "x": 82,
          "y": -4,
          "w": 1,
          "h": 50,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_10",
          "x": 79,
          "y": -12,
          "w": 1,
          "h": 58,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_11",
          "x": 76,
          "y": -7,
          "w": 1,
          "h": 53,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_12",
          "x": 73,
          "y": 1,
          "w": 1,
          "h": 45,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_13",
          "x": 71,
          "y": -7,
          "w": 1,
          "h": 53,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_14",
          "x": 68,
          "y": -23,
          "w": 1,
          "h": 69,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "jail_part_15",
          "x": 57,
          "y": 45,
          "w": 59,
          "h": 1,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "skip": {
    "id": "skip",
    "name": "Skip",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "skip_part_1",
          "x": -38,
          "y": 42,
          "w": 58,
          "h": 1,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "skip_part_2",
          "x": 46,
          "y": 41,
          "w": 15,
          "h": 1,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "skip_part_3",
          "x": 69,
          "y": 41,
          "w": 8,
          "h": 1,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        },
        {
          "type": "rect",
          "name": "skip_part_4",
          "x": 82,
          "y": 41,
          "w": 16,
          "h": 1,
          "radius": 0,
          "fill": "#ff0000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 0.5
        }
      ]
    }
  }
};

export const INQUISITOR_ACTION_DATA = {
  "normal_attack": {
    "id": "normal_attack",
    "name": "못질",
    "kind": "melee",
    "input": "J",
    "slot": "basicAttack",
    "damage": 12,
    "staminaCost": 5,
    "startup": 12,
    "active": 5,
    "recovery": 10,
    "cooldown": 0,
    "lockActions": true,
    "activeWeaponVisualId": "nail_and_hammer",
    "hitboxes": [
      {
        "type": "rect",
        "name": "hammer_nail_swing",
        "x": 37,
        "y": 1,
        "w": 51,
        "h": 48
      }
    ],
    "knockback": {
      "x": 330,
      "y": -120
    }
  },
  "chgilk": {
    "id": "chgilk",
    "name": "쇠사슬 채찍",
    "kind": "melee",
    "input": "K",
    "slot": "skill1",
    "damage": 12,
    "staminaCost": 22,
    "startup": 18,
    "active": 8,
    "recovery": 15,
    "cooldown": 240,
    "lockActions": true,
    "activeWeaponVisualId": "chgilk",
    "hitboxes": [
      {
        "type": "rect",
        "name": "chain_bind",
        "x": 38,
        "y": 15,
        "w": 79,
        "h": 27
      }
    ],
    "effects": [
      {
        "type": "status",
        "statusId": "root",
        "durationTicks": 90,
        "refreshRule": "replace"
      },
      {
        "type": "status",
        "statusId": "burn",
        "durationTicks": 60,
        "tickInterval": 30,
        "maxTicks": 2,
        "damagePerTick": 2,
        "refreshRule": "replace"
      }
    ],
    "stunTicks": 8,
    "screenShake": 3,
    "effectType": "slashHit",
    "useEffectType": "slashWind",
    "knockback": {
      "x": 260,
      "y": -90
    }
  },
  "nail": {
    "id": "nail",
    "name": "처형 못",
    "kind": "projectile",
    "input": "L",
    "slot": "skill2",
    "damage": 8,
    "staminaCost": 12,
    "startup": 8,
    "active": 50,
    "recovery": 8,
    "cooldown": 90,
    "lockActions": true,
    "projectile": {
      "spawn": {
        "x": 36,
        "y": 7
      },
      "speed": 520,
      "lifetime": 120,
      "pierce": 0,
      "destroyOnHit": true,
      "destroyOnWall": true,
      "color": "#d8d2c0",
      "visualWeaponId": "nail"
    },
    "effects": [
      {
        "type": "status",
        "statusId": "burn",
        "durationTicks": 60,
        "tickInterval": 30,
        "maxTicks": 2,
        "damagePerTick": 2,
        "refreshRule": "replace"
      }
    ],
    "hitboxes": [
      {
        "type": "rect",
        "name": "execution_nail",
        "x": 0,
        "y": 0,
        "w": 66,
        "h": 12
      }
    ],
    "knockback": {
      "x": 300,
      "y": -75
    }
  },
  "faary": {
    "id": "faary",
    "name": "패리",
    "kind": "melee",
    "input": "B",
    "slot": "extra",
    "damage": 0,
    "staminaCost": 12,
    "startup": 2,
    "active": 15,
    "recovery": 18,
    "cooldown": 600,
    "lockActions": true,
    "activeWeaponVisualId": "faary",
    "hitboxes": [
      {
        "type": "rect",
        "name": "parry_zone",
        "x": 8,
        "y": -4,
        "w": 70,
        "h": 54
      }
    ],
    "effects": [
      {
        "type": "status",
        "statusId": "stun",
        "durationTicks": 90,
        "disableStaminaRegen": true,
        "refreshRule": "replace"
      }
    ],
    "stunTicks": 90,
    "screenShake": 3,
    "effectType": "guardHit",
    "useEffectType": "guardBuff",
    "knockback": {
      "x": 160,
      "y": -40
    }
  },
  "jail": {
    "id": "jail",
    "name": "심판 감옥",
    "kind": "melee",
    "input": "N",
    "slot": "special",
    "damage": 25,
    "staminaCost": 45,
    "startup": 32,
    "active": 20,
    "recovery": 25,
    "cooldown": 2100,
    "lockActions": true,
    "activeWeaponVisualId": "jail",
    "hitboxes": [
      {
        "type": "rect",
        "name": "judgment_jail",
        "x": 57,
        "y": -39,
        "w": 59,
        "h": 86
      }
    ],
    "effects": [
      {
        "type": "status",
        "statusId": "root",
        "durationTicks": 90,
        "refreshRule": "replace"
      },
      {
        "type": "status",
        "statusId": "stun",
        "durationTicks": 90,
        "disableStaminaRegen": true,
        "refreshRule": "replace"
      }
    ],
    "stunTicks": 90,
    "screenShake": 6,
    "effectType": "slamHit",
    "useEffectType": "slamCharge",
    "knockback": {
      "x": 220,
      "y": -160
    }
  },
  "skip": {
    "id": "skip",
    "name": "추격",
    "kind": "movement",
    "input": "Shift",
    "slot": "movementSkill",
    "damage": 0,
    "staminaCost": 8,
    "startup": 4,
    "active": 12,
    "recovery": 8,
    "cooldown": 40,
    "lockActions": true,
    "activeWeaponVisualId": "skip",
    "invincibleTicks": 6,
    "hurtboxDisabledTicks": 6,
    "hitboxes": [],
    "movement": {
      "type": "dash",
      "direction": "facing",
      "duration": 12,
      "speed": 756,
      "stopOnWall": true,
      "stopOnEnd": true
    },
    "useEffectType": "dashAfterimage",
    "knockback": {
      "x": 0,
      "y": 0
    }
  }
};
