use bevy::prelude::*;

/// Player/Camera entity marker with movement and rotation speeds
#[derive(Component)]
pub struct Player {
    pub speed: f32,

    /// Accumulators for smooth mouse movement
    pub yaw_velocity: f32,
    pub pitch_velocity: f32,
}

/// Health component for player
#[derive(Component)]
pub struct Health {
    pub current: f32,
    pub max: f32,
}

impl Health {
    pub fn new(max: f32) -> Self {
        Self { current: max, max }
    }
    
    pub fn is_alive(&self) -> bool {
        self.current > 0.0
    }
    
    pub fn take_damage(&mut self, amount: f32) {
        self.current = (self.current - amount).max(0.0);
    }
    
    pub fn heal(&mut self, amount: f32) {
        self.current = (self.current + amount).min(self.max);
    }
}
