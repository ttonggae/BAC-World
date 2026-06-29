import { CombatSystem } from "../combat/CombatSystem.js";
import { createPlayer } from "../character/createPlayer.js";

const DUMMY_RESPAWN_DELAY = 0.8;

export class OfflineMatch {
  constructor({ map, players, mode = "pvp", disableWinner = false }) {
    this.map = map;
    this.mode = mode;
    this.disableWinner = disableWinner;
    this.characters = players.map((player, index) => {
      const spawn = map.spawnPoints[index];
      const character = createPlayer(player.characterId, spawn.x, spawn.y, player.controls, {
        facing: spawn.facing,
        playerIndex: index,
      });
      character.isDummy = Boolean(player.isDummy);
      character.spawnPoint = { ...spawn };
      character.dummyRespawnTimer = 0;
      return character;
    });
    this.combat = new CombatSystem();
    this.visualEvents = [];
    this.winner = null;
    this.simulationTick = 0;
  }

  update(dt, input) {
    if (this.winner) return;

    const context = {
      input,
      map: this.map,
      combat: this.combat,
      visualEvents: this.visualEvents,
      simulationTick: this.simulationTick,
      characters: this.characters,
    };

    for (const character of this.characters) {
      character.update(dt, context);
    }
    this.combat.update(dt, this.characters, this.map);
    if (this.mode === "practice") {
      this.updatePracticeDummies(dt);
    }
    this.resolveWinner();
    this.simulationTick += 1;
  }

  updatePracticeDummies(dt) {
    for (const character of this.characters) {
      if (!character.isDummy || character.isAlive) continue;

      character.dummyRespawnTimer += dt;
      if (character.dummyRespawnTimer >= DUMMY_RESPAWN_DELAY) {
        this.resetCharacterForPractice(character);
      }
    }
  }

  resetCharacterForPractice(character) {
    const spawn = character.spawnPoint;
    character.x = spawn.x;
    character.y = spawn.y;
    character.vx = 0;
    character.vy = 0;
    character.facing = spawn.facing ?? -1;
    character.health = character.maxHealth;
    character.stamina = character.maxStamina;
    character.chargeStack = 0;
    character.staminaRegenTimer = 0;
    character.cooldowns = {};
    character.cooldownTicks = {};
    character.buffs = {};
    character.activeStatuses = {};
    character.activeHazards = {};
    character.usedOnceAbilities = {};
    character.pendingAbility = null;
    character.castLockTicks = 0;
    character.comboNextActionId = null;
    character.comboWindowTicks = 0;
    character.comboResetActionId = null;
    character.crowdControlArmorTicks = 0;
    character.invincibleTicks = 0;
    character.hurtboxDisabledTicks = 0;
    character.hitStun = 0;
    character.hitFlash = 0.18;
    character.attackFlash = 0;
    character.skillFlash = 0;
    character.guardFlash = 0;
    character.weaponFlash = 0;
    character.actionWeaponVisualId = null;
    character.actionWeaponVisualTicks = 0;
    character.dashTimer = 0;
    character.dashTicks = 0;
    character.dashStopOnEnd = false;
    character.dummyRespawnTimer = 0;
  }

  resolveWinner() {
    if (this.disableWinner) return;

    const alive = this.characters.filter((character) => character.isAlive);
    if (alive.length === 1) {
      this.winner = alive[0];
    }
  }

  getState() {
    return {
      map: this.map,
      characters: this.characters,
      combat: this.combat,
      visualEvents: this.visualEvents,
      winner: this.winner,
    };
  }
}
