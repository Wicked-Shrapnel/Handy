//! terminal_detect.rs
//!
//! Detects whether the currently focused OS window is a terminal emulator
//! and provides text formatting helpers that strip the speech-synthesis
//! artefacts (sentence capitalisation, trailing punctuation) that are
//! appropriate for prose but wrong for shell commands.
//!
//! Platform strategy
//! -----------------
//! macOS  — `osascript` to read the frontmost app's bundle identifier.
//!           ~80-120 ms; acceptable for a once-per-paste call.
//! Windows — Win32 `GetForegroundWindow` + `GetClassNameW` (zero-ms, no
//!            extra features needed beyond what Cargo.toml already enables).
//! Linux  — `xdotool getactivewindow getwindowname` for X11, falls back
//!           gracefully to `false` on pure Wayland where xdotool is absent.

use log::debug;

// ── Known terminal identifiers ────────────────────────────────────────────

/// macOS bundle identifiers for common terminal emulators.
#[cfg(target_os = "macos")]
const MACOS_TERMINAL_BUNDLES: &[&str] = &[
    "com.apple.Terminal",
    "com.googlecode.iterm2",
    "io.alacritty",
    "com.github.wez.wezterm",
    "net.kovidgoyal.kitty",
    "com.ragingmoon.hyper",
    "org.tabby",
    "com.panic.Prompt",
    "com.panic.Prompt-3",
    "com.codinn.SSH",          // SSH Files
    "org.gnu.Emacs",           // Emacs eshell / vterm
];

/// Win32 window-class names for common Windows terminal emulators.
#[cfg(target_os = "windows")]
const WINDOWS_TERMINAL_CLASSES: &[&str] = &[
    "CASCADIA_HOSTING_WINDOW_CLASS", // Windows Terminal (wt.exe)
    "ConsoleWindowClass",            // cmd.exe / legacy console
    "VirtualConsoleClass",           // ConEmu
    "mintty",                        // MinTTY (Git Bash, Cygwin)
    "AFXFRAMEORVIEW80s",             // ConEmu frame variant
    "Alacritty",
    "org.wezfurlong.wezterm",
    "Kitty",
];

/// Window names / class fragments for Linux X11 terminals.
#[cfg(target_os = "linux")]
const LINUX_TERMINAL_NAMES: &[&str] = &[
    "xterm",
    "gnome-terminal",
    "konsole",
    "alacritty",
    "kitty",
    "tilix",
    "urxvt",
    "rxvt",
    "terminology",
    " - st",          // suckless terminal appends " - st"
    "xfce4-terminal",
    "mate-terminal",
    "lxterminal",
    "qterminal",
    "deepin-terminal",
    "terminator",
    "foot",
    "wezterm",
    "tabby",
    "hyper",
];

// ── Platform-specific detection ───────────────────────────────────────────

#[cfg(target_os = "macos")]
pub fn is_terminal_focused() -> bool {
    let result = std::process::Command::new("osascript")
        .args([
            "-e",
            r#"tell application "System Events"
                 try
                   get bundle identifier of first process whose frontmost is true
                 on error
                   return ""
                 end try
               end tell"#,
        ])
        .output();

    match result {
        Ok(out) if out.status.success() => {
            let bundle = String::from_utf8_lossy(&out.stdout);
            let bundle = bundle.trim().to_lowercase();
            let matched = MACOS_TERMINAL_BUNDLES
                .iter()
                .any(|t| bundle == t.to_lowercase());
            debug!("[terminal_detect] macOS bundle: {:?} → terminal={}", bundle, matched);
            matched
        }
        _ => false,
    }
}

#[cfg(target_os = "windows")]
pub fn is_terminal_focused() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetClassNameW};

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return false;
        }

        let mut buf = [0u16; 256];
        let len = GetClassNameW(hwnd, &mut buf) as usize;
        if len == 0 {
            return false;
        }

        let class = String::from_utf16_lossy(&buf[..len]).to_lowercase();
        let matched = WINDOWS_TERMINAL_CLASSES
            .iter()
            .any(|t| class.contains(&t.to_lowercase()));
        debug!("[terminal_detect] Windows class: {:?} → terminal={}", class, matched);
        matched
    }
}

#[cfg(target_os = "linux")]
pub fn is_terminal_focused() -> bool {
    // Try xdotool (X11). Returns false on Wayland without XWayland.
    let result = std::process::Command::new("xdotool")
        .args(["getactivewindow", "getwindowname"])
        .output();

    match result {
        Ok(out) if out.status.success() => {
            let name = String::from_utf8_lossy(&out.stdout).to_lowercase();
            let matched = LINUX_TERMINAL_NAMES
                .iter()
                .any(|t| name.contains(*t));
            debug!("[terminal_detect] Linux window name: {:?} → terminal={}", name.trim(), matched);
            matched
        }
        _ => false,
    }
}

// ── Text formatting ───────────────────────────────────────────────────────

/// Strip speech-synthesis artefacts that don't belong in a terminal:
///
/// 1. **Lowercase** — shell commands are case-sensitive and almost always
///    lower-case; Whisper capitalises the first word of every utterance.
///
/// 2. **Trailing sentence punctuation** — Whisper ends utterances with
///    `.`, `!`, or `?`.  These break shell commands and git commit messages.
///
/// Characters intentionally preserved:
///   `-` `_` `/` `\` `|` `&` `*` `~` `"` `'` `;` `:` `(` `)` `[` `]`
///   Interior `.` (file extensions, IP addresses, glob patterns)
///   `?` and `*` interior (glob patterns)
pub fn format_for_terminal(text: &str) -> String {
    // Step 1 — lowercase
    let s = text.to_lowercase();
    let s = s.trim();

    // Step 2 — strip trailing sentence-enders
    let s = s.trim_end_matches(|c: char| matches!(c, '.' | '!' | '?'));

    s.trim_end().to_string()
}

// ── Tests ─────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::format_for_terminal;

    #[test]
    fn lowercases_and_strips_period() {
        assert_eq!(format_for_terminal("List the directory."), "list the directory");
    }

    #[test]
    fn strips_question_mark() {
        assert_eq!(format_for_terminal("Where is my file?"), "where is my file");
    }

    #[test]
    fn strips_exclamation() {
        assert_eq!(format_for_terminal("Echo hello!"), "echo hello");
    }

    #[test]
    fn preserves_interior_dot() {
        assert_eq!(format_for_terminal("Cat file.txt."), "cat file.txt");
    }

    #[test]
    fn preserves_flags_and_pipes() {
        assert_eq!(
            format_for_terminal("Ls -la | grep foo."),
            "ls -la | grep foo"
        );
    }

    #[test]
    fn preserves_semicolons() {
        assert_eq!(
            format_for_terminal("Git add . ; git commit."),
            "git add . ; git commit"
        );
    }

    #[test]
    fn no_trailing_space_after_strip() {
        assert_eq!(format_for_terminal("Hello! "), "hello");
    }
}
