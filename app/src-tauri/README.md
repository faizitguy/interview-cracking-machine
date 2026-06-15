# ICM desktop (Tauri) — Phase 7

This wraps the React UI + local Node bridge into a desktop app (spec Phase 7).
It is **scaffolded and ready to build, but not yet built here** because the Rust
toolchain isn't installed in this environment.

## One-time setup

1. Install Rust (Tauri's only hard prerequisite):
   ```
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
   (macOS also needs Xcode Command Line Tools: `xcode-select --install`.)
2. From `app/`, generate the app icons once (Tauri needs them to bundle):
   ```
   npm run tauri icon path/to/icon.png    # 1024×1024 PNG → writes src-tauri/icons/*
   ```

## Run / build

From `app/`:
```
npm run tauri:dev      # launches the desktop window; auto-starts Vite + the backend
npm run tauri:build    # produces a .app / .dmg (macOS), .exe / .msi (Windows)
```

`src/main.rs` spawns the Node backend (`server/ npm run start`) on startup and
kills it on exit. For a distributable build, replace that with a **sidecar**:
compile the server to a single binary (e.g. `bun build --compile`) and list it
under `tauri.conf.json > bundle > externalBin`, then spawn the sidecar instead
of `npm`. This removes the runtime dependency on a system Node.

## Data safety on update (spec section 5b)

The app's data home stays **outside** the bundle — the ICM repo folder (or the
OS user-data dir once packaged). Installing a new build only replaces the code;
your `data/ goals/ roadmaps/ schedule/ mocks/` are untouched. Verify after any
packaging change: create data, reinstall over it, reopen — everything is still
there.
