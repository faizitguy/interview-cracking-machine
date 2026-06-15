// Prevents an extra console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

/// Holds the spawned ICM backend so we can stop it when the app exits.
struct Backend(Mutex<Option<Child>>);

/// Launch the local Node backend bridge (server/). In dev this runs `npm run
/// start` against the repo's server dir; for a packaged build, replace this
/// with a bundled sidecar binary (see src-tauri/README.md).
fn spawn_backend() -> Option<Child> {
    // src-tauri -> app -> repo root, then /server
    let server_dir = std::env::current_dir()
        .ok()?
        .parent()? // app
        .parent()? // repo root
        .join("server");

    Command::new("npm")
        .args(["run", "start"])
        .current_dir(server_dir)
        .spawn()
        .ok()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Backend(Mutex::new(spawn_backend())));
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Interview Cracking Machine")
        .run(|app, event| {
            // Make sure the backend child is killed when the app quits.
            if let RunEvent::Exit = event {
                if let Some(state) = app.try_state::<Backend>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(child) = guard.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
