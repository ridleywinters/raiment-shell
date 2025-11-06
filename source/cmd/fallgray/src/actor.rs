use bevy::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::ai::ActorBehavior;

/// Definition of an actor type loaded from YAML
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ActorDefinition {
    pub sprite: String,
    pub scale: f32,
    pub max_health: f32,
    pub on_hit: String,
    pub on_death: String,
    #[serde(default = "default_behavior")]
    pub behavior: String,
    #[serde(default = "default_speed")]
    pub speed: f32,
}

fn default_behavior() -> String {
    "wander".to_string()
}

fn default_speed() -> f32 {
    1.0
}

/// File structure for loading actor definitions from YAML
#[derive(Debug, Deserialize, Serialize)]
pub struct ActorDefinitionsFile {
    pub actors: HashMap<String, ActorDefinition>,
}

/// Resource containing all actor definitions
#[derive(Resource, Debug)]
pub struct ActorDefinitions {
    pub actors: HashMap<String, ActorDefinition>,
}

/// Component attached to actor entities in the game world
#[derive(Component)]
pub struct Actor {
    pub actor_type: String,
    pub health: f32,
    pub max_health: f32,
    pub scale: f32,
    /// Flat damage reduction
    pub armor: i32,
    /// Resistance to physical damage (0.0 = no resistance, 1.0 = immune)
    pub physical_resistance: f32,
    /// Resistance to fire damage (0.0 = no resistance, 1.0 = immune)
    pub fire_resistance: f32,
    /// Resistance to ice damage (0.0 = no resistance, 1.0 = immune)
    pub ice_resistance: f32,
    /// Resistance to poison damage (0.0 = no resistance, 1.0 = immune)
    pub poison_resistance: f32,
    /// Collision radius for movement (3/4 of player radius)
    pub actor_radius: f32,
    /// Movement speed multiplier
    pub speed_multiplier: f32,
    /// AI behavior (if any)
    pub behavior: Option<Box<dyn ActorBehavior>>,
    /// Whether the actor is currently moving (for wiggle animation)
    pub is_moving: bool,
    /// Base Z position (for wiggle animation)
    pub base_z: f32,
}

/// Position data for actors in the map file
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ActorPosition {
    pub x: f32,
    pub y: f32,
    pub actor_type: String,
}
