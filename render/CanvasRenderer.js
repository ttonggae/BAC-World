import { ABILITIES } from "../data/abilities.js";
import { EDITOR_WEAPONS } from "../data/editorAdapter.js";

function drawRectPath(ctx, part) {
  ctx.beginPath();
  if ((part.radius ?? 0) > 0 && typeof ctx.roundRect === "function") {
    ctx.roundRect(part.x, part.y, part.w, part.h, part.radius);
  } else {
    ctx.rect(part.x, part.y, part.w, part.h);
  }
}

function formatAmount(value) {
  return Number.isInteger(value) ? value : Number(value.toFixed(1));
}

export class CanvasRenderer {
  constructor(canvas, gameSize) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.gameSize = gameSize;
    this.viewportWidth = gameSize.width;
    this.viewportHeight = gameSize.height;
    this.screenShakeTime = 0;
    this.screenShakePower = 0;
    this.floatingTexts = [];
    this.hitEffects = [];
    this.useEffects = [];
    this.lastEffectTime = performance.now();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resetEffects() {
    this.screenShakeTime = 0;
    this.screenShakePower = 0;
    this.floatingTexts = [];
    this.hitEffects = [];
    this.useEffects = [];
    this.lastEffectTime = performance.now();
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.viewportWidth = Math.max(1, Math.round(rect.width || window.innerWidth));
    this.viewportHeight = Math.max(1, Math.round(rect.height || window.innerHeight));
    this.canvas.width = Math.round(this.viewportWidth * ratio);
    this.canvas.height = Math.round(this.viewportHeight * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  render(state) {
    this.resizeIfNeeded();
    const dt = this.getEffectDelta();
    this.consumeVisualEvents(state);
    this.updateEffects(dt);
    const shake = this.getShakeOffset();
    const view = this.getWorldView(state.map);

    this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.ctx.fillStyle = "#15181d";
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.ctx.save();
    this.ctx.translate(view.x + shake.x, view.y + shake.y);
    this.ctx.scale(view.scale, view.scale);
    this.drawBackground(state.map);
    this.drawPlatforms(state.map.platforms);
    this.drawUseEffects();
    this.drawProjectiles(state.combat.projectiles ?? []);
    this.drawHitboxes(state.combat.hitboxes);
    for (const character of state.characters) {
      this.drawCharacter(character);
    }
    this.drawHitEffects();
    this.drawFloatingTexts();
    this.ctx.restore();

    this.drawHud(state.characters, state.matchInfo);
    if (state.matchInfo?.centerText) {
      this.drawCenterMessage(
        state.matchInfo.centerText,
        state.matchInfo.statusText,
        state.matchInfo.gameState !== "roundIntro",
      );
    } else if (state.winner) {
      this.drawCenterMessage(`P${state.winner.playerIndex + 1} Wins`, "Press R to restart", true);
    }
  }

  resizeIfNeeded() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || window.innerWidth));
    const height = Math.max(1, Math.round(rect.height || window.innerHeight));
    if (width !== this.viewportWidth || height !== this.viewportHeight) {
      this.resize();
    }
  }

  getWorldView(map) {
    const scale = Math.min(this.viewportWidth / map.width, this.viewportHeight / map.height);
    return {
      scale,
      x: (this.viewportWidth - map.width * scale) / 2,
      y: (this.viewportHeight - map.height * scale) / 2,
    };
  }

  getEffectDelta() {
    const now = performance.now();
    const dt = Math.min((now - this.lastEffectTime) / 1000, 0.05);
    this.lastEffectTime = now;
    return dt;
  }

  consumeVisualEvents(state) {
    for (const event of state.combat.hitEvents) {
      this.addHitFeedback(event);
    }
    state.combat.hitEvents.length = 0;

    for (const event of state.visualEvents) {
      this.addUseEffect(event);
    }
    state.visualEvents.length = 0;
  }

  addHitFeedback(event) {
    this.screenShakeTime = Math.max(this.screenShakeTime, 0.12 + event.screenShake * 0.01);
    this.screenShakePower = Math.max(this.screenShakePower, event.screenShake);
    if (event.damage > 0) {
      this.addFloatingText(event.x, event.y - 16, `-${event.damage} HP`, "#fff4b0");
    }
    if (event.staminaStolen > 0) {
      this.addFloatingText(
        event.x,
        event.y + 4,
        `-${formatAmount(event.staminaStolen)} STA`,
        "#79d7ff",
      );
    }
    if (event.hpRecovered > 0) {
      this.addFloatingText(
        event.attackerX,
        event.attackerY - 22,
        `+${formatAmount(event.hpRecovered)} HP`,
        "#8ff0a4",
      );
    }
    if (event.staminaRecovered > 0) {
      this.addFloatingText(
        event.attackerX,
        event.attackerY - 4,
        `+${formatAmount(event.staminaRecovered)} STA`,
        "#79d7ff",
      );
    }
    this.hitEffects.push({
      x: event.x,
      y: event.y,
      size: 18 + event.screenShake * 3,
      life: 0.22,
      maxLife: 0.22,
      type: event.effectType ?? "smallHit",
    });
  }

  addFloatingText(x, y, text, color = "#fff4b0") {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      life: 0.65,
      maxLife: 0.65,
      velocityY: -46,
    });
  }

  addUseEffect(event) {
    this.useEffects.push({
      ...event,
      life: event.effectType === "slamCharge" ? 0.3 : 0.18,
      maxLife: event.effectType === "slamCharge" ? 0.3 : 0.18,
    });
  }

  updateEffects(dt) {
    this.screenShakeTime = Math.max(0, this.screenShakeTime - dt);
    if (this.screenShakeTime === 0) this.screenShakePower = 0;

    for (const text of this.floatingTexts) {
      text.y += text.velocityY * dt;
      text.life -= dt;
    }
    for (const effect of this.hitEffects) effect.life -= dt;
    for (const effect of this.useEffects) effect.life -= dt;

    this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);
    this.hitEffects = this.hitEffects.filter((effect) => effect.life > 0);
    this.useEffects = this.useEffects.filter((effect) => effect.life > 0);
  }

  getShakeOffset() {
    if (this.screenShakeTime <= 0 || this.screenShakePower <= 0) {
      return { x: 0, y: 0 };
    }

    const power = Math.min(this.screenShakePower, 8);
    return {
      x: (Math.random() * 2 - 1) * power,
      y: (Math.random() * 2 - 1) * power,
    };
  }

  drawBackground(map) {
    const ctx = this.ctx;
    ctx.fillStyle = map.backgroundColor ?? "#20252d";
    ctx.fillRect(0, 0, map.width, map.height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
      ctx.stroke();
    }
  }

  drawPlatforms(platforms) {
    const ctx = this.ctx;
    for (const platform of platforms) {
      if (platform.type === "solid") {
        ctx.fillStyle = "#3d4651";
        ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(platform.x, platform.y, platform.w, 4);
      } else {
        ctx.fillStyle = "#b7c15a";
        ctx.fillRect(platform.x, platform.y, platform.w, 6);
        ctx.fillStyle = "rgba(183,193,90,0.22)";
        ctx.fillRect(platform.x, platform.y + 6, platform.w, platform.h - 6);
      }
    }
  }

  drawHitboxes(hitboxes) {
    const ctx = this.ctx;
    for (const hitbox of hitboxes) {
      const color = getHitboxColor(hitbox.type);
      ctx.fillStyle = color.fill;
      ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
      ctx.strokeStyle = color.stroke;
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
    }
  }

  drawProjectiles(projectiles) {
    const ctx = this.ctx;
    for (const projectile of projectiles) {
      const weapon = projectile.visualWeaponId
        ? EDITOR_WEAPONS[projectile.visualWeaponId]
        : null;
      if (weapon?.visual?.parts) {
        this.drawWeaponProjectile(projectile, weapon);
        continue;
      }
      ctx.fillStyle = projectile.projectileColor ?? "#fff4b0";
      ctx.fillRect(projectile.x, projectile.y, projectile.w, projectile.h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.strokeRect(projectile.x, projectile.y, projectile.w, projectile.h);
    }
  }

  drawUseEffects() {
    const ctx = this.ctx;
    for (const effect of this.useEffects) {
      const t = 1 - effect.life / effect.maxLife;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = getUseEffectColor(effect.effectType);
      ctx.fillStyle = getUseEffectFill(effect.effectType);
      ctx.lineWidth = 3;

      if (effect.effectType === "dashAfterimage") {
        const w = 54 + t * 28;
        const x = effect.x - effect.facing * (28 + t * 22);
        ctx.fillRect(x - w / 2, effect.y - 18, w, 36);
      } else if (effect.effectType === "slashWind") {
        const x1 = effect.x - effect.facing * 18;
        const x2 = effect.x + effect.facing * (56 + t * 24);
        ctx.beginPath();
        ctx.moveTo(x1, effect.y - 20);
        ctx.lineTo(x2, effect.y + 12);
        ctx.stroke();
      } else if (effect.effectType === "slamCharge") {
        const size = 44 + t * 72;
        ctx.strokeRect(effect.x - size / 2, effect.y - size / 2, size, size);
      } else if (effect.effectType === "projectileCast") {
        const w = 30 + t * 18;
        ctx.fillRect(effect.x + effect.facing * 12 - w / 2, effect.y - 8, w, 16);
      } else if (effect.effectType === "guardBuff") {
        const size = 58 + t * 10;
        ctx.strokeRect(effect.x - size / 2, effect.y - size / 2, size, size);
      } else if (effect.effectType === "backStepAfterimage") {
        const w = 46 + t * 34;
        const x = effect.x + effect.facing * (26 + t * 26);
        ctx.fillRect(x - w / 2, effect.y - 18, w, 36);
      } else {
        ctx.strokeRect(effect.x - 22, effect.y - 18, 44, 36);
      }
      ctx.restore();
    }
  }

  drawCharacter(character) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(character.x, character.y);
    if (character.facing < 0) {
      ctx.translate(character.w, 0);
      ctx.scale(-1, 1);
    }

    const isHitFlash = character.hitFlash > 0;
    const weapon = character.defaultWeaponId
      ? EDITOR_WEAPONS[character.defaultWeaponId]
      : null;
    if (weapon?.layer === "back") this.drawCharacterWeapon(weapon);

    if (character.visual?.parts?.length) {
      this.drawVisualParts(character.visual.parts);
    } else {
      ctx.fillStyle = isHitFlash ? "#ffffff" : character.color;
      ctx.fillRect(0, 0, character.w, character.h);
    }

    if (weapon?.layer !== "back") this.drawCharacterWeapon(weapon);

    if (isHitFlash) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#fff4b0";
      ctx.fillRect(-4, -4, character.w + 8, character.h + 8);
      ctx.globalAlpha = 1;
    }

    if (character.attackFlash > 0 || character.skillFlash > 0) {
      ctx.strokeStyle = character.skillFlash > 0 ? "#7df7ff" : "#fff4b0";
      ctx.lineWidth = 3;
      ctx.strokeRect(-2, -2, character.w + 4, character.h + 4);
    }

    if (character.buffs?.iron_guard) {
      ctx.strokeStyle = "#b7c15a";
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(-7, -7, character.w + 14, character.h + 14);
      ctx.globalAlpha = 1;
    }

    if (!character.visual?.parts?.length) {
      ctx.fillStyle = "#16191e";
      ctx.fillRect(character.w - 12, 12, 5, 5);
    }

    if (character.decoration?.type === "lance") {
      this.drawLance(character);
    }

    ctx.restore();
  }

  drawCharacterWeapon(weapon) {
    if (!weapon?.visual?.parts) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(weapon.anchor.x, weapon.anchor.y);
    this.drawVisualParts(weapon.visual.parts);
    ctx.restore();
  }

  drawWeaponProjectile(projectile, weapon) {
    const excluded = new Set(projectile.excludePartNames ?? []);
    const parts = weapon.visual.parts.filter((part) => !excluded.has(part.name));
    if (parts.length === 0) return;

    const minX = Math.min(...parts.map((part) => part.x));
    const minY = Math.min(...parts.map((part) => part.y));
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    if ((projectile.facing ?? 1) < 0) {
      ctx.translate(projectile.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.translate(-minX, -minY);
    this.drawVisualParts(parts);
    ctx.restore();
  }

  drawVisualParts(parts) {
    const ctx = this.ctx;
    for (const part of parts) {
      if (part.type !== "rect") continue;
      ctx.save();
      ctx.globalAlpha = part.opacity ?? 1;
      if (part.fill) {
        ctx.fillStyle = part.fill;
        drawRectPath(ctx, part);
        ctx.fill();
      }
      if (part.stroke && (part.lineWidth ?? 0) > 0) {
        ctx.strokeStyle = part.stroke;
        ctx.lineWidth = part.lineWidth;
        drawRectPath(ctx, part);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawHitEffects() {
    const ctx = this.ctx;
    for (const effect of this.hitEffects) {
      const t = 1 - effect.life / effect.maxLife;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = getHitEffectColor(effect.type);
      ctx.fillStyle = getHitEffectFill(effect.type);
      ctx.lineWidth = 3;

      if (effect.type === "slashHit") {
        ctx.beginPath();
        ctx.moveTo(effect.x - effect.size, effect.y + effect.size * 0.45);
        ctx.lineTo(effect.x + effect.size, effect.y - effect.size * 0.45);
        ctx.stroke();
      } else if (effect.type === "slamHit") {
        const radius = effect.size + t * 42;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(effect.x - radius, effect.y - radius * 0.45, radius * 2, radius * 0.9);
      } else if (effect.type === "dashHit") {
        const w = effect.size + t * 38;
        ctx.fillRect(effect.x - w / 2, effect.y - 10, w, 20);
        ctx.strokeRect(effect.x - w / 2, effect.y - 10, w, 20);
      } else {
        const size = effect.size + t * 16;
        ctx.fillRect(effect.x - size / 2, effect.y - size / 2, size, size);
        ctx.strokeRect(effect.x - size / 2, effect.y - size / 2, size, size);
      }
      ctx.restore();
    }
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    for (const text of this.floatingTexts) {
      const alpha = Math.max(0, text.life / text.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = text.color ?? "#fff4b0";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
      ctx.lineWidth = 3;
      ctx.font = "700 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }

  drawLance(character) {
    const ctx = this.ctx;
    const direction = character.facing;
    const startX = direction > 0 ? character.w : 0;
    const endX = startX + direction * character.decoration.length;
    const y = character.h / 2;

    ctx.strokeStyle = character.weaponFlash > 0 ? "#fff4b0" : "#d7dde8";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();

    ctx.fillStyle = "#d7dde8";
    ctx.beginPath();
    ctx.moveTo(endX + direction * 9, y);
    ctx.lineTo(endX - direction * 5, y - 7);
    ctx.lineTo(endX - direction * 5, y + 7);
    ctx.closePath();
    ctx.fill();
  }

  drawHud(characters, matchInfo) {
    const barWidth = Math.min(320, Math.max(190, (this.viewportWidth - 72) / 2));
    this.drawStatusBars(characters[0], 24, 22, false, barWidth);
    this.drawStatusBars(characters[1], this.viewportWidth - barWidth - 24, 22, true, barWidth);
    if (matchInfo) this.drawMatchHud(matchInfo);
  }

  drawMatchHud(matchInfo) {
    const ctx = this.ctx;
    const x = this.viewportWidth / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(x - 132, 16, 264, 68);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.strokeRect(x - 132, 16, 264, 68);

    if (matchInfo.mode === "practice") {
      ctx.fillStyle = "#eef2f6";
      ctx.font = "700 18px sans-serif";
      ctx.fillText("Practice Mode", x, 26);

      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#aeb7c4";
      ctx.fillText("R reset / Esc back", x, 54);
      ctx.restore();
      return;
    }

    ctx.fillStyle = "#eef2f6";
    ctx.font = "700 15px sans-serif";
    ctx.fillText(`Round ${matchInfo.roundNumber}`, x, 21);

    ctx.font = "700 18px sans-serif";
    ctx.fillText(`Time: ${Math.ceil(matchInfo.roundTimer)}`, x, 39);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#aeb7c4";
    ctx.fillText(matchInfo.statusText, x, 59);

    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "#fff4b0";
    ctx.fillText(`P1 ${formatRoundWins(matchInfo.roundWins[0])}`, x - 86, 28);
    ctx.fillText(`P2 ${formatRoundWins(matchInfo.roundWins[1])}`, x + 86, 28);
    ctx.restore();
  }

  drawStatusBars(character, x, y, alignRight, width) {
    this.drawHealth(character, x, y, alignRight, width);
    this.drawStamina(character, x, y + 30, alignRight, width);
    let skillY = y + 48;
    if (character.abilities.movementSkill) {
      this.drawMovementSkillStatus(character, x, skillY, alignRight, width);
      skillY += 14;
    }
    this.drawSkillStatus(character, x, skillY, alignRight, width);
    this.drawSkill2Status(character, x, skillY + 14, alignRight, width);
    if (character.abilities.extra) {
      this.drawExtraSkillStatus(character, x, skillY + 28, alignRight, width);
    }
  }

  drawHealth(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const w = width;
    const h = 22;
    const percent = character.health / character.maxHealth;

    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = character.color;
    const fillW = w * percent;
    if (alignRight) {
      ctx.fillRect(x + w - fillW, y, fillW, h);
    } else {
      ctx.fillRect(x, y, fillW, h);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#eef2f6";
    ctx.font = "14px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `P${character.playerIndex + 1} ${character.label} ${Math.ceil(character.health)}`,
      alignRight ? x + w : x,
      y - 4,
    );
  }

  drawStamina(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const w = width;
    const h = 12;
    const percent = character.stamina / character.maxStamina;
    const isFlash =
      character.staminaFlash > 0 && Math.floor(character.staminaFlash * 50) % 2 === 0;

    ctx.fillStyle = isFlash ? "rgba(255, 244, 176, 0.32)" : "rgba(0,0,0,0.34)";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = isFlash ? "#fff4b0" : "#42d39b";
    const fillW = w * percent;
    if (alignRight) {
      ctx.fillRect(x + w - fillW, y, fillW, h);
    } else {
      ctx.fillRect(x, y, fillW, h);
    }
    ctx.strokeStyle = isFlash ? "#fff4b0" : "rgba(255,255,255,0.36)";
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#d7dde8";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `ST ${Math.floor(character.stamina)}`,
      alignRight ? x + w - 6 : x + 6,
      y + h / 2,
    );
  }

  drawSkillStatus(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const skillId = character.abilities.skill1;
    const ability = skillId ? ABILITIES[skillId] : null;
    const cooldown = skillId ? character.cooldowns[skillId] ?? 0 : 0;
    const label = ability ? ability.name : "No Skill";
    const status = cooldown > 0 ? `${cooldown.toFixed(1)}s` : "Ready";

    ctx.fillStyle = cooldown > 0 ? "#aeb7c4" : "#eef2f6";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `K ${label}: ${status}`,
      alignRight ? x + width : x,
      y,
    );
  }

  drawMovementSkillStatus(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const skillId = character.abilities.movementSkill;
    const ability = skillId ? ABILITIES[skillId] : null;
    const cooldown = skillId ? character.cooldowns[skillId] ?? 0 : 0;
    const status = cooldown > 0 ? `${cooldown.toFixed(1)}s` : "Ready";

    ctx.fillStyle = cooldown > 0 ? "#aeb7c4" : "#eef2f6";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `Shift ${ability?.name ?? "No Skill"}: ${status}`,
      alignRight ? x + width : x,
      y,
    );
  }

  drawSkill2Status(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const skillId = character.abilities.skill2;
    const ability = skillId ? ABILITIES[skillId] : null;
    const cooldown = skillId ? character.cooldowns[skillId] ?? 0 : 0;
    const label = ability ? ability.name : "No Skill";
    const status = cooldown > 0 ? `${cooldown.toFixed(1)}s` : "Ready";

    ctx.fillStyle = cooldown > 0 ? "#aeb7c4" : "#eef2f6";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `L ${label}: ${status}`,
      alignRight ? x + width : x,
      y,
    );
  }

  drawExtraSkillStatus(character, x, y, alignRight, width) {
    const ctx = this.ctx;
    const skillId = character.abilities.extra;
    const ability = skillId ? ABILITIES[skillId] : null;
    const cooldown = skillId ? character.cooldowns[skillId] ?? 0 : 0;
    const status = cooldown > 0 ? `${cooldown.toFixed(1)}s` : "Ready";

    ctx.fillStyle = cooldown > 0 ? "#aeb7c4" : "#eef2f6";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillText(
      `; ${ability?.name ?? "No Skill"}: ${status}`,
      alignRight ? x + width : x,
      y,
    );
  }

  drawCenterMessage(text, subtext, dim) {
    const ctx = this.ctx;
    if (dim) {
      ctx.fillStyle = "rgba(12, 14, 18, 0.58)";
      ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, this.viewportWidth / 2, this.viewportHeight / 2);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#c8d0dc";
    ctx.fillText(subtext, this.viewportWidth / 2, this.viewportHeight / 2 + 48);
  }
}

function formatRoundWins(wins) {
  return `${wins}/2`;
}

function getHitboxColor(type) {
  if (type === "areaAttack") {
    return {
      fill: "rgba(255, 125, 94, 0.28)",
      stroke: "rgba(255, 175, 145, 0.9)",
    };
  }

  if (type === "dashMelee") {
    return {
      fill: "rgba(125, 247, 255, 0.26)",
      stroke: "rgba(180, 250, 255, 0.9)",
    };
  }

  return {
    fill: "rgba(255, 223, 86, 0.32)",
    stroke: "rgba(255, 244, 176, 0.85)",
  };
}

function getHitEffectColor(type) {
  if (type === "slamHit") return "rgba(255, 175, 145, 0.95)";
  if (type === "slashHit") return "rgba(180, 250, 255, 0.95)";
  if (type === "dashHit") return "rgba(125, 247, 255, 0.95)";
  return "rgba(255, 244, 176, 0.95)";
}

function getHitEffectFill(type) {
  if (type === "slamHit") return "rgba(255, 125, 94, 0.18)";
  if (type === "slashHit") return "rgba(125, 247, 255, 0.12)";
  if (type === "dashHit") return "rgba(125, 247, 255, 0.22)";
  return "rgba(255, 244, 176, 0.26)";
}

function getUseEffectColor(type) {
  if (type === "slamCharge") return "rgba(255, 175, 145, 0.85)";
  if (type === "slashWind") return "rgba(180, 250, 255, 0.85)";
  if (type === "dashAfterimage") return "rgba(125, 247, 255, 0.65)";
  if (type === "projectileCast") return "rgba(255, 244, 176, 0.85)";
  if (type === "guardBuff") return "rgba(183, 193, 90, 0.85)";
  if (type === "backStepAfterimage") return "rgba(66, 211, 155, 0.7)";
  return "rgba(255, 244, 176, 0.75)";
}

function getUseEffectFill(type) {
  if (type === "dashAfterimage") return "rgba(125, 247, 255, 0.16)";
  if (type === "slamCharge") return "rgba(255, 125, 94, 0.08)";
  if (type === "projectileCast") return "rgba(255, 244, 176, 0.18)";
  if (type === "guardBuff") return "rgba(183, 193, 90, 0.1)";
  if (type === "backStepAfterimage") return "rgba(66, 211, 155, 0.16)";
  return "rgba(255, 244, 176, 0.1)";
}
