use bevy::prelude::*;
use std::collections::HashMap;
use std::fs::{File, create_dir_all};
use std::io::{BufWriter, Write};
use std::path::PathBuf;

/// Component attached to actors to track their unique ID for logging
#[derive(Component)]
pub struct ActorLogger {
    pub actor_id: String,
    pub initialized: bool,
}

/// Resource managing per-actor log files
#[derive(Resource)]
pub struct ActorLoggingSystem {
    pub session_folder: PathBuf,
    file_handles: HashMap<Entity, BufWriter<File>>,
}

impl ActorLoggingSystem {
    /// Create a new logging session with a timestamped folder
    pub fn create_session() -> Result<Self, std::io::Error> {
        let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
        let session_folder = PathBuf::from(format!("logs/{}", timestamp));
        
        create_dir_all(&session_folder)?;
        
        Ok(Self {
            session_folder,
            file_handles: HashMap::new(),
        })
    }
    
    /// Get or create a log file for an actor
    pub fn get_or_create_actor_log(&mut self, entity: Entity, actor_id: &str) -> Result<(), std::io::Error> {
        if self.file_handles.contains_key(&entity) {
            return Ok(());
        }
        
        let log_path = self.session_folder.join(format!("{}.log", actor_id));
        let file = File::create(log_path)?;
        let writer = BufWriter::new(file);
        
        self.file_handles.insert(entity, writer);
        Ok(())
    }
    
    /// Write an event to an actor's log
    pub fn write_event(&mut self, entity: Entity, message: &str) {
        if let Some(writer) = self.file_handles.get_mut(&entity) {
            let timestamp = chrono::Local::now().format("%H:%M:%S%.3f");
            if let Err(e) = writeln!(writer, "{} {}", timestamp, message) {
                eprintln!("Failed to write to actor log: {}", e);
            }
        }
    }
    
    /// Flush all buffered writes
    pub fn flush_all(&mut self) {
        for writer in self.file_handles.values_mut() {
            let _ = writer.flush();
        }
    }
    
    /// Close an actor's log file (called when actor dies)
    pub fn close_actor_log(&mut self, entity: Entity) {
        if let Some(mut writer) = self.file_handles.remove(&entity) {
            let _ = writer.flush();
        }
    }
    
    /// Close all log files (called on game exit)
    pub fn close_all(&mut self) {
        for (_, mut writer) in self.file_handles.drain() {
            let _ = writer.flush();
        }
    }
}
