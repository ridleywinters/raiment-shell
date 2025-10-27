use bevy::prelude::*;
use std::f32::consts::FRAC_PI_2;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(bevy::window::WindowPlugin {
            primary_window: Some(bevy::window::Window {
                title: "Fallgray".into(),
                resolution: (1920, 1080).into(),
                ..default()
            }),
            ..default()
        }))
        .add_systems(Startup, setup_system)
        .add_systems(Update, camera_control_system)
        .run();
}

#[derive(Component)]
struct Player {
    speed: f32,
    rot_speed: f32,
}

fn setup_system(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
    mut images: ResMut<Assets<Image>>,
) {
    // Create a checker pattern texture
    let checker_image = create_checker_texture(512, 512);
    let checker_texture = images.add(checker_image);

    // Create a 512x512 plane in the XY plane at z=0
    let plane_mesh = meshes.add(Plane3d::default().mesh().size(512.0, 512.0));
    let plane_material = materials.add(StandardMaterial {
        base_color_texture: Some(checker_texture),
        base_color: Color::WHITE,
        perceptual_roughness: 1.0, // Make it completely matte (not shiny)
        metallic: 0.0,             // Not metallic
        reflectance: 0.0,          // No reflectance
        ..default()
    });
    commands.spawn((
        Mesh3d(plane_mesh),
        MeshMaterial3d(plane_material),
        // Rotate 90 degrees around X to make it XY plane (facing Z)
        Transform::from_rotation(Quat::from_rotation_x(FRAC_PI_2))
            .with_translation(Vec3::new(256.0, 256.0, 0.0)),
    ));

    // Add some 8x8x8 cubes as reference points
    let cube_mesh = meshes.add(Cuboid::new(8.0, 8.0, 8.0));

    // Create cubes with different colors at various positions
    // Using PICO-8 palette colors
    let cube_positions = [
        (Vec3::new(304.0, 304.0, 4.0), Color::srgb(1.0, 0.0, 0.3)), // 50+256, 50+256
        (Vec3::new(200.0, 304.0, 4.0), Color::srgb(0.0, 0.89, 0.21)), // -50+256, 50+256
        (Vec3::new(304.0, 200.0, 4.0), Color::srgb(0.16, 0.67, 1.0)), // 50+256, -50+256
        (Vec3::new(200.0, 200.0, 4.0), Color::srgb(1.0, 0.95, 0.27)), // -50+256, -50+256
        (Vec3::new(256.0, 352.0, 4.0), Color::srgb(1.0, 0.47, 0.77)), // 0+256, 100+256
        (Vec3::new(352.0, 256.0, 4.0), Color::srgb(0.51, 0.95, 1.0)), // 100+256, 0+256
    ];

    for (position, color) in cube_positions {
        commands.spawn((
            Mesh3d(cube_mesh.clone()),
            MeshMaterial3d(materials.add(color)),
            Transform::from_translation(position),
        ));
    }

    // Light (offset by 256 in X and Y)
    commands.spawn((
        DirectionalLight {
            color: Color::WHITE,
            illuminance: 10000.0,
            shadows_enabled: true,
            ..default()
        },
        Transform::from_xyz(260.0, 264.0, 4.0).looking_at(Vec3::new(256.0, 256.0, 0.0), Vec3::Y),
    ));

    // Camera with player controller (offset by 256 in X and Y)
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(256.0, 206.0, 20.0).looking_at(Vec3::new(306.0, 306.0, 4.0), Vec3::Z),
        Player {
            speed: 50.0,
            rot_speed: 1.5,
        },
    ));
}

fn camera_control_system(
    time: Res<Time>,
    input: Res<ButtonInput<KeyCode>>,
    mut query: Query<(&mut Transform, &Player)>,
) {
    for (mut transform, player) in query.iter_mut() {
        let dt = time.delta_secs();

        // Rotation input (Arrow keys)
        // Arrow left/right rotates around Z axis (yaw)
        // Arrow up/down changes pitch (looking up/down)
        let mut yaw_delta = 0.0;
        let mut pitch_delta = 0.0;

        if input.pressed(KeyCode::ArrowLeft) {
            yaw_delta += player.rot_speed * dt;
        }
        if input.pressed(KeyCode::ArrowRight) {
            yaw_delta -= player.rot_speed * dt;
        }
        if input.pressed(KeyCode::ArrowUp) {
            pitch_delta += player.rot_speed * dt;
        }
        if input.pressed(KeyCode::ArrowDown) {
            pitch_delta -= player.rot_speed * dt;
        }

        // Apply rotation
        if yaw_delta != 0.0 || pitch_delta != 0.0 {
            // Apply yaw rotation around the world Z axis
            if yaw_delta != 0.0 {
                let yaw_rotation = Quat::from_axis_angle(Vec3::Z, yaw_delta);
                transform.rotation = yaw_rotation * transform.rotation;
            }

            // Apply pitch rotation around the local X axis (right vector)
            if pitch_delta != 0.0 {
                // Calculate current pitch from the forward vector's Z component
                let forward_3d = transform.forward().as_vec3();
                let current_pitch = f32::asin(forward_3d.z.clamp(-1.0, 1.0));

                // Calculate new pitch and clamp to limits
                let pitch_limit = 70_f32.to_radians();
                let new_pitch = (current_pitch + pitch_delta).clamp(-pitch_limit, pitch_limit);
                let actual_pitch_delta = new_pitch - current_pitch;

                // Apply the pitch rotation around the local right (X) axis
                if actual_pitch_delta.abs() > 0.0001 {
                    let local_x = transform.right().as_vec3();
                    let pitch_rotation = Quat::from_axis_angle(local_x, actual_pitch_delta);
                    transform.rotation = pitch_rotation * transform.rotation;
                }
            }
        }

        // Movement input (WASD + QE)
        // WASD moves in the XY plane, Q/E moves along Z axis
        let mut movement_xy = Vec2::ZERO; // Movement in XY plane
        let mut movement_z = 0.0; // Movement along Z axis

        if input.pressed(KeyCode::KeyW) {
            movement_xy.y += 1.0; // Forward
        }
        if input.pressed(KeyCode::KeyS) {
            movement_xy.y -= 1.0; // Backward
        }
        if input.pressed(KeyCode::KeyA) {
            movement_xy.x -= 1.0; // Left
        }
        if input.pressed(KeyCode::KeyD) {
            movement_xy.x += 1.0; // Right
        }
        if input.pressed(KeyCode::KeyF) {
            movement_z -= 1.0; // Down
        }
        if input.pressed(KeyCode::KeyR) {
            movement_z += 1.0; // Up
        }

        // Apply XY plane movement in camera's local orientation (projected to XY plane)
        if movement_xy != Vec2::ZERO {
            movement_xy = movement_xy.normalize();

            // Get forward and right directions, but project them onto the XY plane
            let forward_3d = transform.forward();
            let right_3d = transform.right();

            // Project to XY plane by zeroing Z component and normalizing
            let forward_xy = Vec2::new(forward_3d.x, forward_3d.y).normalize_or_zero();
            let right_xy = Vec2::new(right_3d.x, right_3d.y).normalize_or_zero();

            let move_vec_xy = forward_xy * movement_xy.y + right_xy * movement_xy.x;
            transform.translation.x += move_vec_xy.x * player.speed * dt;
            transform.translation.y += move_vec_xy.y * player.speed * dt;
        }

        // Apply Z axis movement
        if movement_z != 0.0 {
            transform.translation.z += movement_z * player.speed * dt;
        }
    }
}

fn create_checker_texture(width: u32, height: u32) -> Image {
    use bevy::asset::RenderAssetUsages;
    use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

    let mut data = Vec::with_capacity((width * height * 4) as usize);

    for y in 0..height {
        for x in 0..width {
            // Create checkerboard pattern (8x8 pixel squares)
            let checker_size = 4;
            let is_white = ((x / checker_size) + (y / checker_size)) % 2 == 0;

            let color = if is_white {
                [220, 220, 220, 255] // Light gray
            } else {
                [80, 80, 80, 255] // Dark gray
            };

            data.extend_from_slice(&color);
        }
    }

    let mut image = Image::new(
        Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
        TextureDimension::D2,
        data,
        TextureFormat::Rgba8UnormSrgb,
        RenderAssetUsages::default(),
    );

    // Set nearest filtering for pixelated look
    image.sampler = bevy::image::ImageSampler::nearest();

    image
}
