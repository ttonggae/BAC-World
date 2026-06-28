export const HAI_HT2_CHARACTER_DATA = {
  "hai_ht2": {
    "id": "hai_ht2",
    "name": "Hai-HT2",
    "role": "중화기 탄약형 차량",
    "description": "헤일리  중전차 Mk.2",
    "difficulty": 2,
    "tags": [
      "vehicle",
      "ranged",
      "ammo",
      "reload",
      "area-control"
    ],
    "size": {
      "w": 63,
      "h": 52.5
    },
    "color": "#646464",
    "defaultWeaponId": "none_weapon",
    "passiveWeaponIds": [],
    "defaultActionId": "normal_attack",
    "actionSlots": {
      "basicAttack": "normal_attack",
      "skill1": "action",
      "skill2": "action_2",
      "special": "action_3",
      "movementSkill": "action_4"
    },
    "actionIds": [
      "normal_attack",
      "action",
      "action_2",
      "action_3",
      "action_4"
    ],
    "extraActionIds": [],
    "stats": {
      "hp": 110,
      "stamina": 100,
      "staminaRegen": 0,
      "staminaRegenDelay": 1,
      "moveSpeed": 170,
      "jumpPower": 570,
      "weight": 1
    },
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "track_base_black",
          "x": 0,
          "y": 37.5,
          "w": 63,
          "h": 15,
          "rotation": 0,
          "radius": 0,
          "fill": "#000000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "track_inner_gray",
          "x": 4.5,
          "y": 40.5,
          "w": 54,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "wheel_left",
          "x": 9,
          "y": 40.5,
          "w": 9,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#9e9e9e",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "wheel_center",
          "x": 27,
          "y": 40.5,
          "w": 9,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#9e9e9e",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "wheel_right",
          "x": 45,
          "y": 40.5,
          "w": 9,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#9e9e9e",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "cannon_barrel",
          "x": 27,
          "y": 7.5,
          "w": 30,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "cannon_muzzle",
          "x": 55.5,
          "y": 6,
          "w": 6,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "turret_round",
          "x": 15,
          "y": 4.5,
          "w": 15,
          "h": 15,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "hull_body",
          "x": 4.5,
          "y": 16.5,
          "w": 46.5,
          "h": 21,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "rear_hull_block",
          "x": 51,
          "y": 22.5,
          "w": 7.5,
          "h": 15,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "armor_plate_left",
          "x": 9,
          "y": 21,
          "w": 9,
          "h": 13.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "armor_plate_center",
          "x": 27,
          "y": 21,
          "w": 9,
          "h": 13.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "armor_plate_right",
          "x": 43.5,
          "y": 25.5,
          "w": 9,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "front_muzzle_block",
          "x": 52.5,
          "y": 27,
          "w": 9,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#646464",
          "stroke": "#000000",
          "lineWidth": 1.5,
          "opacity": 1
        }
      ]
    }
  }
};

export const HAI_HT2_WEAPON_DATA = {
  "none_weapon": {
    "id": "none_weapon",
    "name": "No Weapon",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": true,
    "visual": {
      "parts": []
    }
  },
  "bullet_projectile": {
    "id": "bullet_projectile",
    "name": "Bullet",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": false,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "machinegun_bullet_tracer",
          "x": 63,
          "y": 27,
          "w": 10.5,
          "h": 1.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#fff700",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "he_projectile": {
    "id": "he_projectile",
    "name": "High Explosive Shell",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": false,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "he_shell_body",
          "x": 193.5,
          "y": 22.5,
          "w": 27,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_tail",
          "x": 225,
          "y": 22.5,
          "w": 9,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_tip",
          "x": 234,
          "y": 27,
          "w": 9,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_fuse_yellow",
          "x": 220.5,
          "y": 22.5,
          "w": 4.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffea00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    },
    "projectileAlign": "center"
  },
  "fire_projectile": {
    "id": "fire_projectile",
    "name": "Incendiary Shell",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": false,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "incendiary_shell_cap",
          "x": 193.5,
          "y": 22.5,
          "w": 4.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_body",
          "x": 202.5,
          "y": 22.5,
          "w": 22.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_front",
          "x": 198,
          "y": 22.5,
          "w": 4.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_tail",
          "x": 229.5,
          "y": 22.5,
          "w": 4.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_back",
          "x": 225,
          "y": 22.5,
          "w": 4.5,
          "h": 18,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_flame_core",
          "x": 207,
          "y": 27,
          "w": 13.5,
          "h": 9,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff6600",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    },
    "projectileAlign": "center"
  },
  "fire_area_visual": {
    "id": "fire_area_visual",
    "name": "Fire Area",
    "anchor": {
      "x": 0,
      "y": 0
    },
    "layer": "front",
    "preservePartOffsets": false,
    "visual": {
      "parts": [
        {
          "type": "rect",
          "name": "incendiary_shell_cap",
          "x": 64.5,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_body",
          "x": 67.5,
          "y": 7.5,
          "w": 7.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_front",
          "x": 66,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_tail",
          "x": 76.5,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_back",
          "x": 75,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_flame_core",
          "x": 69,
          "y": 9,
          "w": 4.5,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff6600",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "reload_image": {
    "id": "reload_image",
    "name": "Reload Steps",
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
          "name": "reload_step_1",
          "x": 21,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "reload_step_2",
          "x": 28.5,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "reload_step_3",
          "x": 36,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  }
};

export const HAI_HT2_OTHER_IMAGE_DATA = {
  "bullet": {
    "id": "bullet",
    "name": "기관총탄",
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
          "name": "machinegun_bullet_tracer",
          "x": 63,
          "y": 27,
          "w": 10.5,
          "h": 1.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#fff700",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "he": {
    "id": "he",
    "name": "고폭탄",
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
          "name": "he_shell_body",
          "x": 64.5,
          "y": 7.5,
          "w": 9,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_tail",
          "x": 75,
          "y": 7.5,
          "w": 3,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_tip",
          "x": 78,
          "y": 9,
          "w": 3,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#0d4d00",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "he_shell_fuse_yellow",
          "x": 73.5,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
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
  "fire": {
    "id": "fire",
    "name": "소이탄",
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
          "name": "incendiary_shell_cap",
          "x": 64.5,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_body",
          "x": 67.5,
          "y": 7.5,
          "w": 7.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_front",
          "x": 66,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_shell_tail",
          "x": 76.5,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#8f8f8f",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_red_band_back",
          "x": 75,
          "y": 7.5,
          "w": 1.5,
          "h": 6,
          "rotation": 0,
          "radius": 0,
          "fill": "#b30000",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "incendiary_flame_core",
          "x": 69,
          "y": 9,
          "w": 4.5,
          "h": 3,
          "rotation": 0,
          "radius": 0,
          "fill": "#ff6600",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  },
  "reload_image": {
    "id": "reload_image",
    "name": "reload",
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
          "name": "reload_step_1",
          "x": 21,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "reload_step_2",
          "x": 28.5,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        },
        {
          "type": "rect",
          "name": "reload_step_3",
          "x": 36,
          "y": -15,
          "w": 4.5,
          "h": 10.5,
          "rotation": 0,
          "radius": 0,
          "fill": "#ffd500",
          "stroke": null,
          "lineWidth": 0,
          "opacity": 1
        }
      ]
    }
  }
};

export const HAI_HT2_ACTION_DATA = {
  "normal_attack": {
    "id": "normal_attack",
    "name": "기관총",
    "kind": "projectile",
    "behavior": "holdFire",
    "input": "J",
    "slot": "basicAttack",
    "description": "J를 누르고 있으면 18틱마다 탄환을 발사합니다. 발사 중 탄약을 소모합니다.",
    "damage": 5,
    "staminaCost": 5,
    "startup": 0,
    "active": 1,
    "recovery": 0,
    "cooldown": 18,
    "lockActions": false,
    "hitboxes": [
      {
        "type": "rect",
        "name": "bullet_hitbox",
        "x": 0,
        "y": 0,
        "w": 13.5,
        "h": 4.5
      }
    ],
    "projectile": {
      "spawn": {
        "x": 61.5,
        "y": 25.5
      },
      "speed": 820,
      "lifetime": 45,
      "visualWeaponId": "bullet_projectile",
      "destroyOnHit": true,
      "destroyOnWall": true,
      "color": "#f3f0c8"
    },
    "knockback": {
      "x": 170,
      "y": -35
    },
    "screenShake": 1,
    "effectType": "smallHit",
    "useEffectType": "projectileCast"
  },
  "action": {
    "id": "action",
    "name": "고폭탄",
    "kind": "projectile",
    "behavior": "recastDetonate",
    "input": "K",
    "slot": "skill1",
    "description": "K로 고폭탄을 발사하고, 탄이 살아있는 동안 K를 다시 눌러 폭발시킵니다. 쿨타임은 폭발 후 시작됩니다.",
    "damage": 20,
    "staminaCost": 20,
    "startup": 0,
    "active": 240,
    "recovery": 30,
    "cooldown": 60,
    "lockActions": false,
    "hitboxes": [
      {
        "type": "rect",
        "name": "he_shell_body",
        "x": 0,
        "y": 0,
        "w": 40.5,
        "h": 39
      }
    ],
    "projectile": {
      "spawn": {
        "x": 55.5,
        "y": 6
      },
      "speed": 380,
      "lifetime": 240,
      "visualWeaponId": "he_projectile",
      "destroyOnHit": false,
      "destroyOnWall": false,
      "manualDetonate": true,
      "contactDamage": 0,
      "color": "#ffb347"
    },
    "detonation": {
      "hitbox": {
        "x": -45,
        "y": -45,
        "w": 130.5,
        "h": 129
      },
      "damage": 20,
      "durationTicks": 6,
      "screenShake": 6,
      "effectType": "slamHit"
    },
    "knockback": {
      "x": 520,
      "y": -230
    },
    "screenShake": 3,
    "effectType": "slamHit",
    "useEffectType": "projectileCast"
  },
  "action_2": {
    "id": "action_2",
    "name": "소이탄",
    "kind": "projectile",
    "behavior": "recastDetonate",
    "input": "L",
    "slot": "skill2",
    "description": "L로 소이탄을 발사하고, 탄이 살아있는 동안 L을 다시 눌러 폭발시킵니다. 폭발 지점에 3초 동안 붉은 발화 영역을 남깁니다.",
    "damage": 6,
    "staminaCost": 20,
    "startup": 0,
    "active": 240,
    "recovery": 30,
    "cooldown": 60,
    "lockActions": false,
    "hitboxes": [
      {
        "type": "rect",
        "name": "fire_shell_body",
        "x": 0,
        "y": 0,
        "w": 31.5,
        "h": 24
      }
    ],
    "projectile": {
      "spawn": {
        "x": 55.5,
        "y": 6
      },
      "speed": 360,
      "lifetime": 240,
      "visualWeaponId": "fire_projectile",
      "destroyOnHit": false,
      "destroyOnWall": false,
      "manualDetonate": true,
      "contactDamage": 0,
      "color": "#ff6a35"
    },
    "detonation": {
      "hitbox": {
        "x": -39,
        "y": -30,
        "w": 111,
        "h": 84
      },
      "damage": 10,
      "durationTicks": 6,
      "screenShake": 4,
      "effectType": "dashHit"
    },
    "area": {
      "hitbox": {
        "x": -72,
        "y": -45,
        "w": 174,
        "h": 108
      },
      "damage": 4,
      "durationTicks": 180,
      "damageIntervalTicks": 60,
      "visualWeaponId": null,
      "fillColor": "rgba(220, 34, 24, 0.28)",
      "strokeColor": "rgba(255, 90, 70, 0.68)"
    },
    "knockback": {
      "x": 360,
      "y": -150
    },
    "screenShake": 3,
    "effectType": "dashHit",
    "useEffectType": "projectileCast"
  },
  "action_3": {
    "id": "action_3",
    "name": "재장전",
    "kind": "reload",
    "input": "Space",
    "slot": "special",
    "description": "3초 동안 재장전한 뒤 기력을 최대로 회복합니다.",
    "damage": 0,
    "staminaCost": 0,
    "startup": 180,
    "active": 0,
    "recovery": 0,
    "cooldown": 180,
    "lockActions": true,
    "activeWeaponVisualId": "reload_image",
    "hitboxes": [],
    "knockback": {
      "x": 0,
      "y": 0
    },
    "reload": {
      "restore": "full"
    },
    "useEffectType": "guardBuff"
  },
  "action_4": {
    "id": "action_4",
    "name": "풀악셀",
    "kind": "holdSprint",
    "input": "Shift",
    "slot": "movementSkill",
    "description": "Shift를 누르는 동안 이동속도가 100 증가하고 초당 기력 5를 소모합니다.",
    "damage": 0,
    "staminaCost": 0,
    "startup": 0,
    "active": 0,
    "recovery": 0,
    "cooldown": 0,
    "lockActions": false,
    "hitboxes": [],
    "knockback": {
      "x": 0,
      "y": 0
    },
    "moveSpeedBonus": 100,
    "sustainStaminaCostPerSecond": 5,
    "useEffectType": "dashAfterimage"
  }
};
