use super::systems::*;
use bevy::prelude::*;

pub struct CameraPlugin;

impl Plugin for CameraPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(
            Update,
            (
                update_camera_control_system,
                update_player_light,
                update_player_light_animation,
            ),
        );
    }
}
