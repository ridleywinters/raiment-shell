# dungeon generator

Tool for dungeon generation.

![alt text](screenshot-2025-11-01-101712.png)

## How it works

- Loads a large sprite tilemap with 16x16 "cells"
  - Each cell can be used in any orientation (rotate 0,90,180,270; mirrored)
- It adds a starting cell with at least one exit to a sparse grid
- For N iterations
  - It chooses an open exit on the cell it just added
  - Adds another new cell that
    - Aligns to any existing neighboring exits
    - Exposes at least one more new open exit
- While there are still open exits
  - It finds a cell that
    - Aligns to the open exit
    - Aligns to all other neighboring exits
    - Does not expose any new exits

This works but there are a couple points worth noting:

1. The initial iteration _can_ create a closed loop before the N iterations complete. This results in a valid, but potentially small map.
2. The algorithm relies on there being a valid tile for every possible set of neighboring exits. This is not checked or validated in any way. The algorithm will produce an invalid map with open exits if there is no valid tile for some combination of neighbors.
3. The implementation currently finds a cell that "fits" by random sampling from all tiles. This could be made faster by an initial filter based on exit positions and then random sampling the filtered result, or some sort of hash by the exit configuration could have those fit-sets prepared.
