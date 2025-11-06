/// Player light systems
///
/// Handles lighting that follows the player camera, including torch flickering animation.
use bevy::prelude::*;
use rand::Rng;

use super::components::{LightColorAnimation, PlayerLight};
use super::player::Player;

/// Update player light positions to follow the camera
pub fn update_player_light(
    player_query: Query<&Transform, With<Player>>,
    mut light_query: Query<(&mut Transform, &PlayerLight), Without<Player>>,
) {
    if let Ok(player_transform) = player_query.single() {
        // Update all lights using their offsets
        for (mut light_transform, player_light) in light_query.iter_mut() {
            light_transform.translation = player_transform.translation + player_light.offset;
        }
    }
}

/// Animate torch light color with flickering effect
pub fn update_player_light_animation(
    time: Res<Time>,
    mut light_query: Query<(&mut PointLight, &mut LightColorAnimation), With<PlayerLight>>,
) {
    for (mut light, mut anim) in light_query.iter_mut() {
        let dt = time.delta_secs();
        anim.time += 0.1 * dt * anim.speed;

        let light_yellow = hex_to_color("#f0ead5ff");
        let red = hex_to_color("#eac2acff");
        let yellow_white = hex_to_color("#dfac99ff");

        // Create a smooth oscillation through the three colors
        // Use sine wave that goes 0 -> 1 -> 2 -> 1 -> 0 (one full cycle)
        let t = (anim.time * std::f32::consts::PI).sin().abs();

        // Map t (0 to 1) to blend between the three colors
        let color = if t < 0.5 {
            // Blend from light_yellow to red
            let blend = t * 2.0; // 0 to 1
            Color::srgb(
                light_yellow.to_srgba().red * (1.0 - blend) + red.to_srgba().red * blend,
                light_yellow.to_srgba().green * (1.0 - blend) + red.to_srgba().green * blend,
                light_yellow.to_srgba().blue * (1.0 - blend) + red.to_srgba().blue * blend,
            )
        } else {
            // Blend from red to yellow_white
            let blend = (t - 0.5) * 2.0; // 0 to 1
            Color::srgb(
                red.to_srgba().red * (1.0 - blend) + yellow_white.to_srgba().red * blend,
                red.to_srgba().green * (1.0 - blend) + yellow_white.to_srgba().green * blend,
                red.to_srgba().blue * (1.0 - blend) + yellow_white.to_srgba().blue * blend,
            )
        };

        light.color = color;

        // When we complete a cycle, randomize the speed for next cycle (+/- 20%)
        if anim.time >= 2.0 {
            anim.time = 0.0;
            let mut rng = rand::rng();
            anim.speed = 1.0 + rng.random_range(-0.2..0.2);
        }
    }
}

/// Spawn player lights that follow the camera
pub fn spawn_player_lights(commands: &mut Commands, position: Vec3) {
    // Add a point light that follows the player
    commands.spawn((
        PointLight {
            color: Color::WHITE,
            intensity: 1000000.0,
            range: 64.0,
            shadows_enabled: true,
            ..default()
        },
        Transform::from_xyz(position.x + 0.0, position.y + 1.5, position.z + 4.0),
        PlayerLight {
            offset: Vec3::new(0.0, 1.5, 4.0),
        },
        LightColorAnimation::new(0.0, 0.1),
    ));

    // Add a second point light that follows the player with no Y offset
    commands.spawn((
        PointLight {
            color: Color::WHITE,
            intensity: 1000000.0,
            range: 64.0,
            shadows_enabled: true,
            ..default()
        },
        Transform::from_xyz(position.x + 0.5, position.y - 0.5, position.z + 4.0),
        PlayerLight {
            offset: Vec3::new(0.5, -0.5, 4.0),
        },
        LightColorAnimation::new(0.5, 0.2),
    ));
}

/// Convert hex color string to Bevy Color
fn hex_to_color(hex: &str) -> Color {
    let hex = hex.trim_start_matches('#');

    let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255) as f32 / 255.0;
    let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255) as f32 / 255.0;
    let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255) as f32 / 255.0;

    Color::srgb(r, g, b)
}
