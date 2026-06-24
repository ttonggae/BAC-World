export const MAPS = {
  training: {
    id: "training",
    name: "Training",
    description: "Balanced test stage with a wide floor and simple one-way routes.",
    backgroundColor: "#20252d",
    width: 960,
    height: 540,
    bounds: { left: 0, right: 960, top: 0, bottom: 540 },
    spawnPoints: [
      { x: 180, y: 404, facing: 1 },
      { x: 720, y: 404, facing: -1 },
    ],
    // Training keeps every route forgiving: floor -> 420 -> 340 uses 80px climbs.
    platforms: [
      { id: "floor", type: "solid", x: 0, y: 500, width: 960, height: 40 },
      { id: "center-one-way", type: "oneWay", x: 315, y: 420, width: 330, height: 18 },
      { id: "left-one-way", type: "oneWay", x: 95, y: 340, width: 240, height: 18 },
      { id: "right-one-way", type: "oneWay", x: 625, y: 340, width: 240, height: 18 },
    ],
  },
  tower: {
    id: "tower",
    name: "Tower",
    description: "Vertical stage with stacked one-way platforms and uneven starts.",
    backgroundColor: "#1d2430",
    width: 960,
    height: 540,
    bounds: { left: 0, right: 960, top: 0, bottom: 540 },
    spawnPoints: [
      { x: 190, y: 408, facing: 1 },
      { x: 710, y: 408, facing: -1 },
    ],
    // Tower is a true staircase: each layer is about 75-80px above the last.
    platforms: [
      { id: "floor", type: "solid", x: 0, y: 500, width: 960, height: 40 },
      { id: "low-left", type: "oneWay", x: 90, y: 425, width: 230, height: 18 },
      { id: "low-right", type: "oneWay", x: 640, y: 425, width: 230, height: 18 },
      { id: "mid-left", type: "oneWay", x: 205, y: 350, width: 230, height: 18 },
      { id: "mid-right", type: "oneWay", x: 525, y: 350, width: 230, height: 18 },
      { id: "upper-left", type: "oneWay", x: 105, y: 275, width: 230, height: 18 },
      { id: "upper-right", type: "oneWay", x: 625, y: 275, width: 230, height: 18 },
      { id: "top", type: "oneWay", x: 300, y: 200, width: 360, height: 18 },
    ],
  },
  arena: {
    id: "arena",
    name: "Arena",
    description: "Open stage with minimal obstacles for clean character testing.",
    backgroundColor: "#24232a",
    width: 960,
    height: 540,
    bounds: { left: 0, right: 960, top: 0, bottom: 540 },
    spawnPoints: [
      { x: 170, y: 404, facing: 1 },
      { x: 750, y: 404, facing: -1 },
    ],
    // Arena stays simple: side platforms are low enough to reach from the floor.
    platforms: [
      { id: "floor", type: "solid", x: 0, y: 500, width: 960, height: 40 },
      { id: "small-left", type: "oneWay", x: 165, y: 420, width: 210, height: 18 },
      { id: "small-right", type: "oneWay", x: 585, y: 420, width: 210, height: 18 },
    ],
  },
};
