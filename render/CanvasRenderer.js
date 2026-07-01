import { ABILITIES } from "../data/abilities.js";
import { EDITOR_OTHER_IMAGES, EDITOR_WEAPONS } from "../data/editorAdapter.js";

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
    this.drawMapVisualEffects(state.map, state.simulationTick ?? 0);
    this.drawUseEffects();
    this.drawAreas(state.combat.areas ?? []);
    this.drawProjectiles(state.combat.projectiles ?? []);
    this.drawHitboxes(state.combat.hitboxes);
    for (const character of state.characters) {
      this.drawCharacter(character);
    }
    for (const character of state.characters) {
      this.drawPlayerLabel(character);
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
    const isShark = event.effectType === "sharkBite";
    const isSmoke = event.effectType === "smokeBomb";
    this.useEffects.push({
      ...event,
      life: isShark ? 0.62 : isSmoke ? 0.5 : event.effectType === "slamCharge" ? 0.3 : 0.18,
      maxLife: isShark ? 0.62 : isSmoke ? 0.5 : event.effectType === "slamCharge" ? 0.3 : 0.18,
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
    if (map.background?.type === "gradient") {
      const gradient = ctx.createLinearGradient(0, 0, 0, map.height);
      gradient.addColorStop(0, map.background.colorTop ?? map.backgroundColor ?? "#20252d");
      gradient.addColorStop(1, map.background.colorBottom ?? map.backgroundColor ?? "#20252d");
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = map.backgroundColor ?? "#20252d";
    }
    ctx.fillRect(0, 0, map.width, map.height);

    for (const part of map.background?.decorativeParts ?? []) {
      if (part.type !== "rect") continue;
      ctx.save();
      ctx.globalAlpha = part.opacity ?? 1;
      ctx.fillStyle = part.fill ?? "rgba(255,255,255,0.12)";
      if (part.rotation) {
        ctx.translate(part.x + part.w / 2, part.y + part.h / 2);
        ctx.rotate(part.rotation);
        ctx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
      } else {
        ctx.fillRect(part.x, part.y, part.w, part.h);
      }
      ctx.restore();
    }

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
        ctx.fillStyle = getPlatformColor(platform);
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

  drawMapVisualEffects(map, simulationTick) {
    if (!map.visualEffects?.length) return;
    const ctx = this.ctx;
    for (const effect of map.visualEffects) {
      if (effect.type !== "scrollingLines") continue;
      const area = effect.area;
      const direction = effect.tiedToGimmick
        ? map.getGimmickDirection(effect.tiedToGimmick, simulationTick)
        : "right";
      const phaseTick = effect.tiedToGimmick
        ? map.getGimmickPhaseTick(effect.tiedToGimmick, simulationTick)
        : simulationTick;
      const sign = direction === "left" ? -1 : 1;
      const gimmick = map.gimmicks?.find((entry) => entry.id === effect.tiedToGimmick);
      const visualSpeed = effect.speed ?? Math.max(0.8, (gimmick?.forceX ?? 85) / 60);
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();

      ctx.globalAlpha = Math.max(0.12, (effect.opacity ?? 0.25) * 0.75);
      ctx.fillStyle = effect.color ?? "#66d9ef";
      const waveHeights = [18, 23, 30, 40, 50, 42, 32, 24];
      const boxWidth = 64;
      const waveWidth = waveHeights.length * boxWidth;
      const waveOffset = (phaseTick * visualSpeed * sign) % waveWidth;
      for (let x = area.x - waveWidth * 2; x < area.x + area.w + waveWidth * 2; x += waveWidth) {
        const baseX = x + waveOffset;
        for (let index = 0; index < waveHeights.length; index += 1) {
          const height = waveHeights[index];
          const barX = baseX + index * boxWidth;
          const barY = area.y + area.h - height - 4;
          ctx.fillRect(barX, barY, boxWidth, height);
        }
      }
      if (phaseTick < 10) {
        ctx.globalAlpha = 0.16 * (1 - phaseTick / 10);
        ctx.fillStyle = effect.color ?? "#66d9ef";
        ctx.fillRect(area.x, area.y, area.w, area.h);
      }
      ctx.restore();
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
        ? EDITOR_WEAPONS[projectile.visualWeaponId] ??
          EDITOR_OTHER_IMAGES[projectile.visualWeaponId]
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

  drawAreas(areas) {
    const ctx = this.ctx;
    for (const area of areas) {
      const weapon = area.visualWeaponId
        ? EDITOR_WEAPONS[area.visualWeaponId] ??
          EDITOR_OTHER_IMAGES[area.visualWeaponId]
        : null;
      ctx.save();
      ctx.globalAlpha = Math.min(1, Math.max(0.25, area.remainingTicks / 30));
      if (weapon?.visual?.parts) {
        this.drawWeaponProjectile(area, weapon);
      } else {
        ctx.fillStyle = area.fillColor ?? "rgba(0, 80, 255, 0.32)";
        ctx.strokeStyle = area.strokeColor ?? "rgba(120, 180, 255, 0.72)";
        ctx.lineWidth = 2;
        for (const box of area.hitboxes ?? []) {
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.strokeRect(box.x, box.y, box.w, box.h);
        }
      }
      ctx.restore();
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
      } else if (effect.effectType === "sharkBite") {
        this.drawSharkBiteEffect(effect, t);
      } else if (effect.effectType === "chargedHitscan") {
        ctx.fillStyle = "rgba(255, 223, 86, 0.42)";
        ctx.strokeStyle = "rgba(255, 244, 176, 0.9)";
        ctx.lineWidth = 2;
        ctx.fillRect(effect.x, effect.y, effect.w ?? 720, effect.h ?? 8);
        ctx.strokeRect(effect.x, effect.y, effect.w ?? 720, effect.h ?? 8);
        const burstX = effect.facing >= 0 ? effect.x + (effect.w ?? 720) : effect.x;
        ctx.beginPath();
        ctx.arc(burstX, effect.y + (effect.h ?? 8) / 2, 12 + t * 18, 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.effectType === "smokeBomb") {
        const size = 120;
        ctx.fillStyle = "rgba(185, 190, 196, 0.28)";
        ctx.strokeStyle = "rgba(225, 231, 238, 0.52)";
        ctx.lineWidth = 2;
        ctx.fillRect(effect.x - size / 2, effect.y - size / 2, size, size);
        ctx.strokeRect(effect.x - size / 2, effect.y - size / 2, size, size);
      } else {
        ctx.strokeRect(effect.x - 22, effect.y - 18, 44, 36);
      }
      ctx.restore();
    }
  }

  drawSharkBiteEffect(effect, t) {
    const ctx = this.ctx;
    const rise = Math.sin(Math.PI * t) * 24;
    const x = effect.x;
    const y = effect.y - rise;
    const w = effect.width ?? 76;
    const h = effect.height ?? 62;

    ctx.fillStyle = "rgba(10, 18, 24, 0.86)";
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.62);
    ctx.lineTo(x - w * 0.42, y + h * 0.1);
    ctx.quadraticCurveTo(x, y + h * 0.28, x + w * 0.42, y + h * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(220, 238, 244, 0.86)";
    for (let index = -2; index <= 2; index += 1) {
      const toothX = x + index * 9;
      ctx.beginPath();
      ctx.moveTo(toothX, y - h * 0.46);
      ctx.lineTo(toothX - 4, y - h * 0.28);
      ctx.lineTo(toothX + 4, y - h * 0.28);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(102, 217, 239, 0.38)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.5, effect.y + 5);
    ctx.quadraticCurveTo(x, effect.y + 15, x + w * 0.5, effect.y + 5);
    ctx.stroke();
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
    const pendingAbility = character.pendingAbility
      ? ABILITIES[character.pendingAbility.abilityId]
      : null;
    const visualWeaponId =
      pendingAbility?.startupWeaponVisualId ??
      character.actionWeaponVisualId ??
      character.defaultWeaponId;
    const passiveWeaponIds = new Set(character.passiveWeaponIds ?? []);
    const passiveWeapons = [...passiveWeaponIds]
      .map((weaponId) => EDITOR_WEAPONS[weaponId])
      .filter(Boolean);
    const weapon =
      visualWeaponId && !passiveWeaponIds.has(visualWeaponId)
        ? EDITOR_WEAPONS[visualWeaponId]
        : null;
    const actionImage =
      visualWeaponId && !weapon && !passiveWeaponIds.has(visualWeaponId)
        ? EDITOR_OTHER_IMAGES[visualWeaponId]
        : null;
    for (const passiveWeapon of passiveWeapons) {
      if (passiveWeapon.layer === "back") this.drawCharacterWeapon(passiveWeapon);
    }
    if (weapon?.layer === "back") this.drawCharacterWeapon(weapon);

    if (character.visual?.parts?.length) {
      this.drawVisualParts(character.visual.parts);
    } else {
      ctx.fillStyle = isHitFlash ? "#ffffff" : character.color;
      ctx.fillRect(0, 0, character.w, character.h);
    }

    this.drawStatusAttachments(character);

    if (weapon?.layer !== "back") this.drawCharacterWeapon(weapon);
    if (actionImage) this.drawOtherImage(actionImage);
    for (const passiveWeapon of passiveWeapons) {
      if (passiveWeapon.layer !== "back") this.drawCharacterWeapon(passiveWeapon);
    }
    const stanceIndicator = character.currentStanceIndicatorId
      ? EDITOR_OTHER_IMAGES[character.currentStanceIndicatorId]
      : null;
    if (stanceIndicator) this.drawOtherImage(stanceIndicator);

    if (isStunned(character)) {
      this.drawStunIndicator(character);
    }

    if (isHitFlash) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#fff4b0";
      ctx.fillRect(-4, -4, character.w + 8, character.h + 8);
      ctx.globalAlpha = 1;
    }

    if (character.attackFlash > 0 || character.skillFlash > 0) {
      ctx.strokeStyle = character.chargeShotState
        ? getChargeShotOutlineColor(character.chargeShotState)
        : character.skillFlash > 0
          ? "#7df7ff"
          : "#fff4b0";
      ctx.lineWidth = character.chargeShotState?.stageIndex >= 0 ? 5 : 3;
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

  drawPlayerLabel(character) {
    const ctx = this.ctx;
    const label = `P${character.playerIndex + 1}`;
    const color = character.playerIndex === 0 ? "#4f8dff" : "#ff5f5f";
    const x = character.x + character.w / 2;
    const y = character.y + character.h + 16;

    ctx.save();
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = color;
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  drawStunIndicator(character) {
    const ctx = this.ctx;
    const centerX = character.w / 2;
    const y = -12;
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = "#f8d24b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(centerX, y, 17, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff1a8";
    drawDiamond(ctx, centerX - 17, y - 1, 4);
    drawDiamond(ctx, centerX, y - 7, 5);
    drawDiamond(ctx, centerX + 17, y - 1, 4);
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

  drawOtherImage(image) {
    if (!image?.visual?.parts) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = image.opacity ?? 1;
    ctx.translate(image.position?.x ?? 0, image.position?.y ?? 0);
    this.drawVisualParts(image.visual.parts);
    ctx.restore();
  }

  drawStatusAttachments(character) {
    for (const status of Object.values(character.activeStatuses ?? {})) {
      if (!status.visualWeaponId) continue;
      const visual =
        EDITOR_WEAPONS[status.visualWeaponId] ??
        EDITOR_OTHER_IMAGES[status.visualWeaponId];
      this.drawAttachedVisual(character, visual);
    }
  }

  drawAttachedVisual(character, visual) {
    const parts = visual?.visual?.parts ?? [];
    if (parts.length === 0) return;
    const minX = Math.min(...parts.map((part) => part.x));
    const minY = Math.min(...parts.map((part) => part.y));
    const maxX = Math.max(...parts.map((part) => part.x + part.w));
    const maxY = Math.max(...parts.map((part) => part.y + part.h));
    const visualWidth = maxX - minX;
    const visualHeight = maxY - minY;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = visual.opacity ?? 1;
    ctx.translate(
      character.w / 2 - visualWidth / 2,
      character.h / 2 - visualHeight / 2,
    );
    ctx.translate(-minX, -minY);
    this.drawVisualParts(parts);
    ctx.restore();
  }

  drawWeaponProjectile(projectile, weapon) {
    const excluded = new Set(projectile.excludePartNames ?? []);
    const parts = weapon.visual.parts.filter((part) => !excluded.has(part.name));
    if (parts.length === 0) return;

    const minX = weapon.preservePartOffsets
      ? 0
      : Math.min(...parts.map((part) => part.x));
    const minY = weapon.preservePartOffsets
      ? 0
      : Math.min(...parts.map((part) => part.y));
    const maxX = Math.max(...parts.map((part) => part.x + part.w));
    const maxY = Math.max(...parts.map((part) => part.y + part.h));
    const visualWidth = maxX - minX;
    const visualHeight = maxY - minY;
    const alignX =
      weapon.projectileAlign === "center"
        ? (projectile.w - visualWidth) / 2
        : 0;
    const alignY =
      weapon.projectileAlign === "center"
        ? (projectile.h - visualHeight) / 2
        : 0;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    if ((projectile.facing ?? 1) < 0) {
      ctx.translate(projectile.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.translate(alignX, alignY);
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
    const localIndex = matchInfo?.localPlayerIndex ?? 0;
    const localCharacter = characters[localIndex] ?? characters[0];
    if (localCharacter) this.drawCooldownPanel(localCharacter);
  }

  drawMatchHud(matchInfo) {
    const ctx = this.ctx;
    const x = this.viewportWidth / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
    ctx.fillRect(x - 180, 16, 360, 68);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.strokeRect(x - 180, 16, 360, 68);

    if (matchInfo.mode === "practice") {
      ctx.fillStyle = "#eef2f6";
      ctx.font = "700 18px sans-serif";
      ctx.fillText("Practice Mode", x, 26);

      this.drawTopActionHints(x, 54);
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
    this.drawTopActionHints(x, 39);

    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "#fff4b0";
    ctx.fillText(`P1 ${formatRoundWins(matchInfo.roundWins[0])}`, x - 132, 28);
    ctx.fillText(`P2 ${formatRoundWins(matchInfo.roundWins[1])}`, x + 132, 28);
    ctx.restore();
  }

  drawTopActionHints(centerX, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = "#d7dde8";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.fillText("R Restart", centerX - 78, y + 9);
    ctx.textAlign = "left";
    ctx.fillText("ESC Back", centerX + 78, y + 9);
    ctx.restore();
  }

  drawStatusBars(character, x, y, alignRight, width) {
    this.drawHealth(character, x, y, alignRight, width);
    this.drawStamina(character, x, y + 30, alignRight, width);
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

  drawCooldownPanel(character) {
    const ctx = this.ctx;
    const items = getCooldownItems(character);
    if (items.length === 0) return;

    const panelWidth = Math.min(this.viewportWidth - 36, Math.max(420, items.length * 118));
    const itemGap = 8;
    const itemWidth = Math.floor((panelWidth - itemGap * (items.length - 1)) / items.length);
    const panelHeight = 72;
    const panelX = (this.viewportWidth - panelWidth) / 2;
    const panelY = this.viewportHeight - panelHeight - 22;

    ctx.save();
    ctx.fillStyle = "#d7dde5";
    ctx.font = "700 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const chargeText =
      character.maxChargeStack > 0
        ? ` / CH ${character.chargeStack ?? 0}/${character.maxChargeStack}`
        : "";
    ctx.fillText(
      `P${character.playerIndex + 1} Cooldowns${chargeText}`,
      panelX + 12,
      panelY + 8,
    );

    const itemY = panelY + 28;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const x = panelX + index * (itemWidth + itemGap);
      this.drawCooldownItem(item, x, itemY, itemWidth, 34);
    }
    ctx.restore();
  }

  drawCooldownItem(item, x, y, width, height) {
    const ctx = this.ctx;
    const cooldown = item.cooldown;
    const progress = item.maxCooldown > 0
      ? Math.max(0, Math.min(1, cooldown / item.maxCooldown))
      : 0;
    const ready = cooldown <= 0;

    ctx.fillStyle = ready ? "rgba(138, 146, 156, 0.18)" : "rgba(104, 111, 122, 0.2)";
    ctx.fillRect(x, y, width, height);
    if (!ready) {
      ctx.fillStyle = "rgba(176, 184, 194, 0.3)";
      ctx.fillRect(x, y, width * progress, height);
    }
    ctx.strokeStyle = ready ? "rgba(190, 198, 208, 0.46)" : "rgba(160, 168, 178, 0.58)";
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = "#e1e5eb";
    ctx.font = "700 12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(item.key, x + 7, y + 5);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#b8c0ca";
    ctx.fillText(
      fitLabel(item.name, width - 14),
      x + 7,
      y + 18,
    );
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = ready ? "#cfd5dd" : "#aeb6c0";
    ctx.textAlign = "right";
    ctx.fillText(ready ? "Ready" : `${cooldown.toFixed(1)}s`, x + width - 7, y + 5);
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

function getCooldownItems(character) {
  const slots = [
    ["basicAttack", "J"],
    ["movementSkill", "Shift"],
    ["skill1", "K"],
    ["skill2", "L"],
    ["extra", ";"],
    ["extra2", "M"],
    ["special", "N"],
  ];

  return slots
    .map(([slot, fallbackKey]) => {
      const abilityId = character.abilities?.[slot];
      const ability = abilityId ? ABILITIES[abilityId] : null;
      if (!ability) return null;
      return {
        slot,
        key: character.actionInputs?.[slot] ?? fallbackKey,
        name: ability.name ?? abilityId,
        cooldown: character.cooldowns?.[abilityId] ?? 0,
        maxCooldown: ability.cooldown ?? 0,
      };
    })
    .filter(Boolean);
}

function fitLabel(label, maxWidth) {
  const limit = Math.max(5, Math.floor(maxWidth / 7));
  if (label.length <= limit) return label;
  return `${label.slice(0, Math.max(1, limit - 1))}…`;
}

function isStunned(character) {
  return Object.values(character.activeStatuses ?? {}).some(
    (status) => status.statusId === "stun" && status.remainingTicks > 0,
  );
}

function drawDiamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

function getPlatformColor(platform) {
  if (platform.material === "wet_wood") return "#4a3f38";
  if (platform.material === "stone") return "#344150";
  return "#3d4651";
}

function getChargeShotOutlineColor(state) {
  if (state.stageIndex >= 2 || state.isFull) return "#ffdf56";
  if (state.stageIndex >= 1) return "#7df7ff";
  if (state.stageIndex >= 0) return "#a6f06a";
  return "#9aa3ad";
}

function getHitboxColor(type) {
  if (type === "hitscan") {
    return {
      fill: "rgba(255, 223, 86, 0.36)",
      stroke: "rgba(255, 244, 176, 0.9)",
    };
  }

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
