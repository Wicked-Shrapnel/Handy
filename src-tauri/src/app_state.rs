//! app_state.rs — shared runtime flags stored in Tauri managed state.
//!
//! Shared terminal-formatting state.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

/// All cross-thread, transient runtime flags for the app.
/// Stored once as `Arc<RuntimeFlags>` via `app.manage()`.
pub struct RuntimeFlags {
    /// When true (default) the Rust paste path checks the active window
    /// and strips capitalisation + trailing punctuation when a terminal
    /// emulator is detected.
    pub terminal_formatting: AtomicBool,

    /// True when the active window at recording start was a terminal.
    pub terminal_target: AtomicBool,
}

impl Default for RuntimeFlags {
    fn default() -> Self {
        Self {
            terminal_formatting:  AtomicBool::new(true),
            terminal_target:      AtomicBool::new(false),
        }
    }
}

impl RuntimeFlags {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    pub fn terminal_formatting_enabled(&self) -> bool {
        self.terminal_formatting.load(Ordering::Relaxed)
    }

    pub fn set_terminal_formatting(&self, val: bool) {
        self.terminal_formatting.store(val, Ordering::Relaxed);
    }

    pub fn terminal_target_active(&self) -> bool {
        self.terminal_target.load(Ordering::Relaxed)
    }

    pub fn set_terminal_target(&self, val: bool) {
        self.terminal_target.store(val, Ordering::Relaxed);
    }
}
