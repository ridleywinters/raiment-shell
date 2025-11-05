use super::cvars::CVarRegistry;
use bevy::prelude::*;

pub struct ScriptingPlugin;

impl Plugin for ScriptingPlugin {
    fn build(&self, app: &mut App) {
        app //
            .init_resource::<CVarRegistry>()
            .add_systems(PostStartup, save_cvars_on_startup);
    }
}

fn save_cvars_on_startup(cvars: Res<CVarRegistry>) {
    if let Err(e) = cvars.save_to_yaml("data/cvars.yaml") {
        eprintln!("Failed to save cvars: {}", e);
    } else {
        println!("CVars saved to data/cvars.yaml");
    }
}
