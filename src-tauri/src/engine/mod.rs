pub mod build;
pub mod build_view;
pub mod cache;
pub mod calc;
pub mod game_data;

use std::sync::Mutex;

use build::HeroBuild;
use build_view::BuildView;
use cache::PerPowerCache;
use game_data::GameData;

/// Thread-safe engine state managed by Tauri.
pub struct EngineState {
    pub game_data: GameData,
    pub build: Mutex<Option<HeroBuild>>,
    pub cache: Mutex<PerPowerCache>,
}

impl EngineState {
    pub fn new(game_data: GameData) -> Self {
        Self {
            game_data,
            build: Mutex::new(None),
            cache: Mutex::new(PerPowerCache::new()),
        }
    }

    /// Rebuild the BuildView from current state. Returns None if no build is active.
    pub fn get_view(&self) -> Option<BuildView> {
        let build_guard = self.build.lock().ok()?;
        let build = build_guard.as_ref()?;
        let mut cache = self.cache.lock().ok()?;
        Some(build_view::build_view(build, &self.game_data, &mut cache))
    }

    /// Invalidate cache for a specific power.
    pub fn invalidate_power(&self, power_name: &str) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.invalidate(power_name);
        }
    }

    /// Invalidate entire cache (e.g., on build load/clear).
    pub fn invalidate_all(&self) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.invalidate_all();
        }
    }
}
