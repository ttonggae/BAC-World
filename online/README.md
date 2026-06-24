# Online Layer Placeholder

This directory is intentionally empty of Firebase, P2P, and networking code.

The offline prototype keeps match state in `game/OfflineMatch.js`. Future online
implementations should add an adapter here and feed deterministic input snapshots
into the same game and combat logic instead of moving rules into the renderer.
