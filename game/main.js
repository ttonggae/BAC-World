import { Game } from "./Game.js";

const canvas = document.querySelector("#gameCanvas");
const game = new Game(canvas);
game.start();
