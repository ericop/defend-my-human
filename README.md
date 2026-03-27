# Defend My Human

[Click Here to Play](https://ericop.github.io/defend-my-human/)

`Defend My Human` is a family-made HTML5 canvas game where Eliza the beagle protects her human from incoming cats.

## What The Game Has

- Plain JavaScript and HTML5 canvas with no external libraries
- Main menu, shop, intro, gameplay, shopping break, and game-over screens
- Single-player and local two-player modes
- Eliza the beagle as the playable dog
- A moving human NPC that can wear unlockable costumes
- Cats with jumping behavior, multi-hit toughness, and stronger every-10th-cat variants
- A coin system, unlockable cosmetics, and browser `localStorage` save data

## Play Controls

### Single-Player

- `Left Arrow` / `Right Arrow`: move Eliza
- `Up Arrow`: jump
- Walk Eliza to the human during the intro to begin

### Two-Player

- Dog: `Left Arrow` / `Right Arrow` / `Up Arrow`
- Cat: `A` / `D` / `W`

## Shop And Coins

- Defeating a cat gives `+1` coin
- Every `25` defeated cats gives a shopping break
- Coins, bought costumes, and equipped items are saved in browser storage

### Current Costume Prices

- `Hero Cape`: 25 coins
- `Basketball Uniform`: 10 coins
- `Bluey Costume`: 15 coins
- `Human Ninja Suit`: 50 coins
- `Astronaut Suit`: 100 coins
- `Wizard School Outfit`: 150 coins

## How To Run Locally

1. Open `index.html` in a browser.
2. Or visit the GitHub Pages link above.

## Files

- `index.html`: page shell and embedded styles
- `defend-my-human.js`: game logic, rendering, menu flow, shop system, and save system
- `LICENSE`: MIT license

## Notes

- The game is tuned for a `960x540` canvas.
- Progress is saved with `localStorage`, so clearing browser storage will reset coins and costume unlocks.
