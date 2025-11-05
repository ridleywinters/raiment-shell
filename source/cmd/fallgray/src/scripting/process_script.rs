use super::cvars::CVarRegistry;
use crate::ui::PlayerStats;
use bevy::prelude::*;

use super::cmd_add_gold::cmd_add_gold;
use super::cmd_add_stamina::cmd_add_stamina;
use super::cmd_getvar::cmd_getvar;
use super::cmd_listvars::cmd_listvars;
use super::cmd_quit::cmd_quit;
use super::cmd_setvar::cmd_setvar;

pub fn process_script(
    script: &str,
    stats: &mut ResMut<PlayerStats>,
    cvars: &mut ResMut<CVarRegistry>,
) -> Vec<String> {
    let mut output = Vec::new();

    for line in script.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Skip comment lines
        if trimmed.starts_with('#') || trimmed.starts_with("//") {
            continue;
        }

        let tokens: Vec<&str> = trimmed.split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }

        // Dispatch to command handlers
        let command_output = match tokens[0] {
            "setvar" => cmd_setvar(&tokens, stats, cvars),
            "getvar" => cmd_getvar(&tokens, stats, cvars),
            "listvars" => cmd_listvars(&tokens, stats, cvars),
            "add_gold" => cmd_add_gold(&tokens, stats, cvars),
            "add_stamina" => cmd_add_stamina(&tokens, stats, cvars),
            "quit" => cmd_quit(&tokens, stats, cvars),
            _ => format!("Unknown command: {}", tokens.join(" ")),
        };

        output.push(command_output);
    }

    output
}
