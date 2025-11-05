use super::cvars::{CVarRegistry, CVarValue};
use crate::ui::PlayerStats;
use bevy::prelude::*;

/// Handle the setvar command - sets a console variable value
pub fn cmd_setvar(
    tokens: &[&str],
    _stats: &mut ResMut<PlayerStats>,
    cvars: &mut ResMut<CVarRegistry>,
) -> String {
    if tokens.len() < 3 {
        return "usage: setvar <variable> <value>".to_string();
    }

    let var_name = tokens[1];
    let value_str = tokens[2];

    // Try to parse as f32 (default for now)
    let Ok(value) = value_str.parse::<f32>() else {
        return format!("Invalid value: {}", value_str);
    };

    match cvars.set(var_name, CVarValue::Float(value)) {
        Ok(_) => format!("{} = {}", var_name, value),
        Err(e) => e,
    }
}
