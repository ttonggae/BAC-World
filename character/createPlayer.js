import { CHARACTERS } from "../data/characters.js";
import { CharacterBase } from "./CharacterBase.js";

export function createPlayer(characterId, x, y, controls, options = {}) {
  const character = CHARACTERS[characterId];
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  return new CharacterBase(
    character,
    {
      x,
      y,
      facing: options.facing ?? 1,
    },
    controls,
    options.playerIndex ?? 0,
  );
}
