export class GameMap {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.backgroundColor = data.backgroundColor;
    this.width = data.width;
    this.height = data.height;
    this.bounds = data.bounds ?? {
      left: 0,
      right: data.width,
      top: 0,
      bottom: data.height,
    };
    this.spawnPoints = data.spawnPoints;
    this.platforms = data.platforms.map((platform) => ({
      ...platform,
      w: platform.width ?? platform.w,
      h: platform.height ?? platform.h,
    }));
  }

  getSolidPlatforms() {
    return this.platforms.filter((platform) => platform.type === "solid");
  }

  getOneWayPlatforms() {
    return this.platforms.filter((platform) => platform.type === "oneWay");
  }
}
