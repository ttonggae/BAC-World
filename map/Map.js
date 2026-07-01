export class GameMap {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.englishName = data.englishName ?? null;
    this.theme = data.theme ?? null;
    this.description = data.description;
    this.gimmickLabel = data.gimmickLabel ?? null;
    this.difficulty = data.difficulty ?? null;
    this.recommendedTypes = [...(data.recommendedTypes ?? [])];
    this.cautionTypes = [...(data.cautionTypes ?? [])];
    this.tags = [...(data.tags ?? [])];
    this.backgroundColor = data.backgroundColor;
    this.width = data.width ?? data.size?.w;
    this.height = data.height ?? data.size?.h;
    this.size = data.size ?? { w: this.width, h: this.height };
    this.camera = data.camera ?? null;
    this.bounds = data.bounds ?? {
      left: 0,
      right: this.width,
      top: 0,
      bottom: this.height,
    };
    this.spawnPoints = data.spawnPoints.map((spawn) => ({
      ...spawn,
      facing: normalizeFacing(spawn.facing),
    }));
    this.platforms = data.platforms.map((platform) => ({
      ...platform,
      w: platform.width ?? platform.w,
      h: platform.height ?? platform.h,
    }));
    this.hazards = [...(data.hazards ?? [])];
    this.fallReset = data.fallReset ?? null;
    this.gimmicks = (data.gimmicks ?? []).map((gimmick) => ({ ...gimmick }));
    this.background = data.background ?? null;
    this.visualEffects = (data.visualEffects ?? []).map((effect) => ({ ...effect }));
  }

  getSolidPlatforms() {
    return this.platforms.filter((platform) => platform.type === "solid");
  }

  getOneWayPlatforms() {
    return this.platforms.filter((platform) => platform.type === "oneWay");
  }

  applyGimmicksToCharacter(character, gameTick, dt = 1 / 60) {
    if (!character?.isAlive || this.gimmicks.length === 0) return;

    for (const gimmick of this.gimmicks) {
      if (gimmick.type === "current") {
        this.applyCurrentGimmick(gimmick, character, gameTick, dt);
      }
    }
  }

  applyCurrentGimmick(gimmick, character, gameTick, dt) {
    if (!aabbOverlap(character.bounds, gimmick.area)) return;
    if (gimmick.affectGrounded && !character.onGround) return;
    if (!gimmick.affectAirborne && !character.onGround) return;

    const direction = this.getGimmickDirection(gimmick.id, gameTick);
    const sign = direction === "left" ? -1 : 1;
    let force = (gimmick.forceX ?? 0) * sign;
    if (gimmick.weightScaling) {
      force /= Math.max(0.5, character.weight || 1);
    }
    this.moveCharacterByCurrent(character, force * dt);
  }

  moveCharacterByCurrent(character, deltaX) {
    if (deltaX === 0) return;
    const nextX = character.x + deltaX;
    const nextBounds = { ...character.bounds, x: nextX };
    const blockingPlatform = this.getSolidPlatforms().find((platform) =>
      aabbOverlap(nextBounds, platform),
    );
    if (blockingPlatform) {
      character.vx = 0;
      return;
    }
    character.x = nextX;
    if (this.bounds) {
      character.x = Math.max(this.bounds.left, Math.min(this.bounds.right - character.w, character.x));
    }
  }

  rescueCharacterIfOutOfBounds(character, context = {}) {
    if (!this.fallReset || !character?.isAlive) return;
    if (character.y <= this.fallReset.y) return;

    const fallX = character.x + character.w / 2;
    const fallY = character.y + character.h;
    const damage = Math.ceil(character.maxHealth * (this.fallReset.damageRatio ?? 0.2));
    character.health = Math.max(1, character.health - damage);
    character.x = (this.fallReset.x ?? this.width / 2) - character.w / 2;
    character.y = (this.fallReset.groundY ?? this.height - 40) - character.h;
    character.vx = 0;
    character.vy = 0;
    character.onGround = true;
    character.groundPlatform = null;
    character.dropTimer = 0;
    character.hitStun = 0;
    character.hitFlash = 0.22;
    character.invincibleTicks = Math.max(
      character.invincibleTicks ?? 0,
      this.fallReset.invincibleTicks ?? 30,
    );
    character.statusImmuneTicks = Math.max(
      character.statusImmuneTicks ?? 0,
      this.fallReset.statusImmuneTicks ?? 30,
    );
    character.activeStatuses = {};
    character.interruptActions?.();
    context.visualEvents?.push({
      effectType: "sharkBite",
      x: fallX,
      y: this.fallReset.sharkY ?? fallY,
      width: 76,
      height: 62,
    });
  }

  getGimmickDirection(gimmickId, gameTick) {
    const gimmick = this.gimmicks.find((entry) => entry.id === gimmickId);
    if (!gimmick?.cycleTicks || !gimmick.directionPattern?.length) return "right";
    const phase =
      Math.floor(Math.max(0, gameTick) / gimmick.cycleTicks) %
      gimmick.directionPattern.length;
    return gimmick.directionPattern[phase] ?? "right";
  }

  getGimmickPhaseTick(gimmickId, gameTick) {
    const gimmick = this.gimmicks.find((entry) => entry.id === gimmickId);
    if (!gimmick?.cycleTicks) return 0;
    return Math.max(0, gameTick) % gimmick.cycleTicks;
  }
}

function normalizeFacing(facing) {
  if (facing === "left") return -1;
  if (facing === "right") return 1;
  return facing ?? 1;
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
