use std::collections::HashMap;

/// Caches per-power enhancement strengths (after ED) to avoid recomputation.
pub struct PerPowerCache {
    /// power_full_name -> (attrib -> effective_strength)
    strengths: HashMap<String, HashMap<String, f64>>,
}

impl PerPowerCache {
    pub fn new() -> Self {
        Self {
            strengths: HashMap::new(),
        }
    }

    pub fn get(&self, power_name: &str) -> Option<&HashMap<String, f64>> {
        self.strengths.get(power_name)
    }

    pub fn set(&mut self, power_name: String, strengths: HashMap<String, f64>) {
        self.strengths.insert(power_name, strengths);
    }

    pub fn invalidate(&mut self, power_name: &str) {
        self.strengths.remove(power_name);
    }

    pub fn invalidate_all(&mut self) {
        self.strengths.clear();
    }
}
