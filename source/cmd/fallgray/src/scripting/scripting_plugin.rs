use super::cvars::CVarRegistry;
use bevy::prelude::*;

pub struct ScriptingPlugin;

impl Plugin for ScriptingPlugin {
    fn build(&self, app: &mut App) {
        app //
            .init_resource::<CVarRegistry>();
    }
}
