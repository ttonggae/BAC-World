# BAC World

Browser-based 2D casual ability fighting prototype.

## Version

Current version: **테스트 0.8**

The version is changed only when the project owner explicitly requests a GitHub upload.

## Current Prototype

- Canvas renderer
- Fullscreen responsive canvas viewport
- Character selection screen before match start
- Map selection screen using data-driven map definitions
- Offline 1v1 box-character match
- Fixed timestep game loop
- Data-driven map and character definitions
- Data-driven ability definitions
- Shared `CharacterBase`
- `createPlayer(characterId, x, y, controls)` player creation
- Basic attack runs through `useAbility(player, abilityId, context)`
- Character `skill1` abilities also run through the same data-driven ability path
- AABB movement, gravity, solid platforms, and one-way platforms
- Drop-through one-way platforms
- Basic melee hitboxes, damage, knockback, health bars, and win state
- R key match reset
- Stamina cost, regeneration delay, stamina bars, and low-stamina feedback
- `dash_punch`, `ground_slam`, and `quick_slash` skill1 prototypes
- `energy_shot`, `iron_guard`, and `back_step` skill2 prototypes
- Thief action set: attack, dash, steal, and dagger throw
- Wizard action set: staff jab, fireball, homing missile, and ice bolt
- Attack-instance hit tracking prevents repeated collision damage
- Tick-based burn, root, and back-step invulnerability state
- Same-character restart after game over and return to character select
- Hit feedback without hitstop: screen shake, floating damage text, hit effects, and stronger hit flash

## Test Maps

- `training`: balanced floor and one-way platform test map
- `tower`: vertical one-way platform map
- `arena`: open map for simple character testing

## Test Characters

- `basic`: standard HP, stamina, speed, jump, and weight
- `heavy`: more HP, lower stamina, slower movement, higher weight
- `speedy`: less HP, more stamina, faster movement, lower weight
- `thief`: low-HP close-range utility fighter with steal and dagger actions
- `wizard`: low-HP ranged controller with high stamina and elemental projectiles
- `fighter_character`: beginner melee pressure fighter with jab, step, and heavy punch
- `fylang_character`: technical sword/spear stance fighter with Space mode change

## Run

Serve this directory with any static HTTP server, then open `index.html`.

```powershell
python -m http.server 5173
```

Then visit `http://127.0.0.1:5173/`.
