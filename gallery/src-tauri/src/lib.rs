//! The Gallery's desktop shell.
//!
//! The shell does one job: put the same Vite-built frontend in a window and
//! expose the two native capabilities the library declares — a folder picker
//! and an external-URL opener. Nothing domain-specific lives here.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running the Jin gallery");
}
