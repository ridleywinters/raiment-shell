use bevy::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Serialize, Deserialize)]
pub struct ItemDefinition {
    pub image: String,
    pub script: String,
    pub scale: f32,
    pub effects: Vec<String>,
}

#[derive(Deserialize)]
pub struct ItemDefinitionsFile {
    pub items: HashMap<String, ItemDefinition>,
}

#[derive(Resource)]
pub struct ItemDefinitions {
    pub items: HashMap<String, ItemDefinition>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct ItemPosition {
    pub x: f32,
    pub y: f32,
    #[serde(default = "default_item_type")]
    pub item_type: String,
}

pub fn default_item_type() -> String {
    "apple".to_string()
}

#[derive(Resource, Default)]
pub struct ItemTracker {
    pub positions: HashSet<(i32, i32)>, // Grid positions where items exist
    pub world_positions: Vec<(f32, f32, String)>, // Actual world positions and item types for saving
}

impl ItemTracker {
    pub fn remove_at_position(&mut self, world_x: f32, world_y: f32) {
        let grid_x = (world_x / 8.0).floor() as i32;
        let grid_y = (world_y / 8.0).floor() as i32;
        self.positions.remove(&(grid_x, grid_y));
        self.world_positions
            .retain(|(x, y, _)| (*x - world_x).abs() > 0.1 || (*y - world_y).abs() > 0.1);
    }
}

#[derive(Component)]
pub struct Item {
    pub interaction_radius: f32,
}
