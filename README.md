# React CarPlay

A React and Electron-based Apple CarPlay desktop application for macOS and embedded Linux systems (such as Raspberry Pi). It interfaces directly with Carlinkit USB adapters (CPC200-CCPA / CPC200-CCPM) to stream wireless and wired Apple CarPlay with full touch, keyboard, and microphone support.

---

## Features

- **Wireless & Wired CarPlay**: Supports fast wireless pairing (Bluetooth handoff to 5GHz Wi-Fi) and direct wired USB connections.
- **High Performance Video**: Fully configurable stream up to 60 FPS at 1080p resolution.
- **Audio & Microphone Support**: High-definition PCM audio playback and microphone capture for Siri and calls.
- **Custom Keybindings**: Map hardware buttons or keyboard keys to CarPlay functions (Home, Play/Pause, Next, Previous, Navigation).
- **Cross-Platform**: Builds for macOS (Apple Silicon / Intel) and Linux / Raspberry Pi.

---

## Supported Hardware

- **Carlinkit CPC200-CCPA** (Wireless & Wired adapter for aftermarket / Android displays) — *Recommended for wireless CarPlay*
- **Carlinkit CPC200-CCPM** (Wired-only adapter)
- **Carlinkit CPC200-Autokit**

> **Note:** Adapters designed for OEM/factory wired CarPlay (such as Carlinkit 3.0 / 4.0 / 5.0 U2W) are not supported. You must use the Autokit / aftermarket models (CCPA / CCPM).

---

## Getting Started on macOS

### Prerequisites
- macOS 12+ (Apple Silicon or Intel)
- Node.js (v18+) and npm

### Installation & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run dev
   ```

3. **Build the macOS Application & DMG:**
   ```bash
   npm run build:mac
   ```
   The built `.app` and `.dmg` will be located in the `dist/` directory.

---

## Connecting Your iPhone

1. Plug your Carlinkit USB dongle into your computer.
2. Launch **React CarPlay**.
3. On your iPhone, open **Settings > Bluetooth**.
4. Select the dongle's Bluetooth name (starts with `AutoKit_...`).
5. Confirm the pairing prompt on your iPhone and select **Use CarPlay**.
6. The iPhone will automatically establish a Wi-Fi direct connection with the dongle and start streaming CarPlay.

---

## Keybindings

Configure key bindings by clicking the **Bindings** button in the Settings view within the app. Click on a function and press your desired keyboard key to assign it.

Default shortcuts:
- `Space`: Select / Confirm
- `Backspace`: Back
- `Arrow Left` / `Arrow Right`: Navigate options
- `H`: Home
- `P`: Play / Pause
- `M`: Next track
- `N`: Previous track

---

## Author

**Binoy Anil**
- Email: binoyanil85@gmail.com
