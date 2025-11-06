use bevy::prelude::*;
use crate::map::Map;
use crate::actor::Actor;

const WIGGLE_AMPLITUDE: f32 = 0.1;
const WIGGLE_FREQUENCY: f32 = 10.0;

pub struct AIPlugin;

impl Plugin for AIPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, (update_actor_behavior, add_actor_wiggle).chain());
    }
}

/// Update all actor behaviors
fn update_actor_behavior(
    mut actors: Query<(&mut Actor, &mut Transform)>,
    map: Res<Map>,
    time: Res<Time>,
) {
    for (mut actor, mut transform) in actors.iter_mut() {
        let speed = actor.speed_multiplier;
        if let Some(ref mut behavior) = actor.behavior {
            let is_moving = behavior.update(&mut transform, &map, time.delta_secs(), speed);
            actor.is_moving = is_moving;
        }
    }
}

/// Add wiggle animation to moving actors
fn add_actor_wiggle(
    mut actors: Query<(&Actor, &mut Transform)>,
    time: Res<Time>,
) {
    let elapsed = time.elapsed_secs();
    
    for (actor, mut transform) in actors.iter_mut() {
        if actor.is_moving {
            // Apply wiggle offset
            let wiggle_offset = (elapsed * WIGGLE_FREQUENCY).sin() * WIGGLE_AMPLITUDE;
            // Store base position and apply wiggle
            // For simplicity, wiggle on a perpendicular axis
            transform.translation.z = actor.base_z + wiggle_offset;
        } else {
            // Reset to base position
            transform.translation.z = actor.base_z;
        }
    }
}
