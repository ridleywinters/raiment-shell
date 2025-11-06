# Actor AI Movement System

This implementation adds AI movement and behaviors to actors in the game.

## Features

### Behavior System

- **Trait-based architecture**: `ActorBehavior` trait defines the interface for all actor behaviors
- **Pluggable behaviors**: Behaviors can be easily added and swapped via YAML configuration
- **Two default behaviors**:
  - **`wander`**: Actor moves between random destinations using A\* pathfinding
  - **`stand`**: Actor remains stationary

### Wander Behavior State Machine

The wander behavior uses a state machine with the following states:

1. **Planning**: Generate 2-3 random destinations that are walkable
2. **Moving**: Follow A\* path to the next destination
3. **Waiting**: Pause for 1-3 seconds at destination

When a wander behavior actor reaches its final destination:

- 70% chance: Start planning new destinations (continue wandering)
- 30% chance: Wait for 1-3 seconds before planning

### Pathfinding

- **A\* algorithm**: Efficient grid-based pathfinding using the `pathfinding` crate
- **4-directional movement**: Actors move in cardinal directions (N, S, E, W)
- **Collision detection**: Uses `Map::is_solid()` to respect walls and obstacles
- **Dynamic replanning**: If an obstacle is encountered, the actor replans its route

### Visual Feedback

- **Wiggle animation**: Moving actors have a slight vertical oscillation (Z-axis wiggle)
  - Amplitude: 0.1 units
  - Frequency: 10 Hz
  - Applied only while `actor.is_moving == true`

### Collision

- **Actor radius**: 1.2 units (3/4 of player radius = 1.6 × 0.75)
- **Non-blocking**: Actors can overlap each other (no actor-to-actor collision)
- **Wall collision**: Actors respect walls and use `Map::can_move_to()` for validation

## Configuration

### Actor Definitions YAML

Actors are defined in `data/actor_definitions.yaml` (or `$REPO_ROOT/source/assets/base/actors/actors.yaml` in production):

```yaml
actors:
  skeleton:
    sprite: "base/sprites/monster-skeleton-01.png"
    scale: 3.8
    max_health: 30.0
    on_hit: "do_damage 10"
    on_death: "# skeleton defeated"
    behavior: "wander" # Optional, defaults to "wander"
    speed: 0.8 # Optional, defaults to 1.0 (movement speed multiplier)

  cat:
    sprite: "base/sprites/cat-00.png"
    scale: 1.5
    max_health: 15.0
    on_hit: "do_damage 5"
    on_death: "# cat defeated"
    behavior: "wander"
    speed: 1.5 # Faster than normal (1.5x speed)

  dog:
    sprite: "base/sprites/dog-00.png"
    scale: 1.8
    max_health: 20.0
    on_hit: "do_damage 7"
    on_death: "# dog defeated"
    behavior: "stand" # Dog stays in place
    speed: 1.0
```

### Behavior Field

- **Type**: String
- **Default**: `"wander"`
- **Valid values**: `"wander"`, `"stand"`
- If an unknown behavior is specified, it defaults to `"wander"` with a warning

### Speed Field

- **Type**: Float
- **Default**: `1.0`
- **Usage**: Multiplier applied to base movement speed (20 units/second)
- **Examples**:
  - `0.5` = half speed (10 units/sec)
  - `1.0` = normal speed (20 units/sec)
  - `1.5` = 50% faster (30 units/sec)
  - `2.0` = double speed (40 units/sec)

## Architecture

### Module Structure

```
src/ai/
├── mod.rs                  # ActorBehavior trait definition
├── pathfinding.rs          # A* pathfinding implementation
├── pathfinding_test.rs     # Unit tests for pathfinding
├── wander_behavior.rs      # Wander behavior state machine
├── stand_behavior.rs       # Stand (idle) behavior
└── systems.rs              # Bevy systems and AIPlugin
```

### Key Components

#### `ActorBehavior` Trait

```rust
pub trait ActorBehavior: Send + Sync {
    fn update(&mut self, transform: &mut Transform, map: &Map, delta_time: f32) -> bool;
    fn get_label(&self) -> &str;
}
```

#### `Actor` Component Extensions

```rust
pub struct Actor {
    // ... existing fields ...
    pub actor_radius: f32,
    pub speed_multiplier: f32,
    pub behavior: Option<Box<dyn ActorBehavior>>,
    pub is_moving: bool,
    pub base_z: f32,
}
```

### Systems

#### `update_actor_behavior`

- Runs every frame in the `Update` schedule
- Queries all actors with behaviors
- Calls `behavior.update()` to move actors and update state
- Sets `actor.is_moving` flag based on return value

#### `add_actor_wiggle`

- Runs after `update_actor_behavior` (chained)
- Applies sinusoidal wiggle to Z position for moving actors
- Uses `time.elapsed_secs()` for smooth animation

## Implementation Details

### Movement

- **Speed**: 20 units/second (defined as `MOVEMENT_SPEED`)
- **Pathfinding resolution**: 8×8 grid (matches wall grid)
- **Destination threshold**: 0.5 units (how close before "arrived")
- **Max destination attempts**: 20 tries per random destination

### Random Destination Selection

1. Generate random X/Y coordinates within map bounds
2. Check if position is walkable using `Map::can_move_to()`
3. Retry up to 20 times if position is blocked
4. If no valid destination found after all attempts, actor waits instead

### Path Following

1. Calculate A\* path from current position to next destination
2. Each frame, move toward next waypoint in path
3. When waypoint reached (within threshold), advance to next waypoint
4. If collision detected during movement, replan path from current position

## Testing

Run the pathfinding tests:

```bash
cargo test pathfinding_test
```

Tests include:

- Grid/world coordinate conversion
- Simple pathfinding on open map
- Blocked destination handling

## Future Enhancements

Potential improvements:

- **Chase behavior**: Track and follow player
- **Flee behavior**: Run away when low health
- **Patrol behavior**: Follow predefined waypoints
- **Diagonal movement**: 8-directional pathfinding
- **Actor avoidance**: Optional actor-to-actor collision
- **Animation sprites**: Multi-frame walk cycles
- **Speed variation**: Different movement speeds per actor type
