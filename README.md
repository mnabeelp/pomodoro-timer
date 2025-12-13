# Pomodoro Timer

A customizable, cross-platform Pomodoro timer that stays on your screen while you work.

![Pomodoro Timer Screenshot](assets/screenshot.png)

## Features

- **Customizable timer durations**: Set your own work and break intervals
- **Visual themes**: Choose from multiple color themes
- **Always on top**: Timer stays visible over other windows
- **System tray integration**: Minimize to tray and control from system tray
- **Drag & drop positioning**: Move the timer anywhere on your screen
- **Notifications**: Get notified when work sessions or breaks end
- **Session tracking**: Keep track of completed Pomodoro sessions

## Installation

### Prerequisites
- Node.js 18+ and npm installed

### Steps
1. Clone or download this repository
2. Navigate to the project directory:
   ```bash
   cd pomodoro-timer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```

## Usage

### Basic Timer Controls
- **Start**: Begin the timer countdown
- **Pause**: Pause the current session
- **Reset**: Reset the current session to its full duration

### Customization
1. Click the settings section at the bottom of the timer
2. Adjust work and break durations (in minutes)
3. Select a theme from the dropdown
4. Toggle "Always on top" to keep window above others
5. Enable/disable notifications
6. Click "Apply Settings" to save your preferences

### Window Management
- **Minimize**: Click the minimize button to hide to system tray
- **Close**: Click the close button to exit the application
- **Drag**: Click and drag the bottom drag handle to reposition the timer
- **System Tray**: Right-click the tray icon for show/hide/quit options

## Development

### Project Structure
```
pomodoro-timer/
├── index.js              # Main Electron process
├── preload.js            # Preload script for secure IPC
├── renderer.js           # Renderer process logic
├── index.html            # Main window HTML
├── styles.css            # CSS styles and themes
├── package.json          # Project configuration
└── README.md             # This file
```

### Running in Development Mode
```bash
NODE_ENV=development npm start
```
This will open Developer Tools for debugging.

### Building for Distribution
To create distributable packages:
```bash
npm install electron-builder --save-dev
npx electron-builder
```

## Customization

### Adding New Themes
1. Edit `styles.css`
2. Add a new CSS class following the pattern:
   ```css
   .theme-yourtheme {
     --bg-color: #yourcolor;
     --text-color: #yourcolor;
     --accent-color: #yourcolor;
     --secondary-color: #yourcolor;
   }
   ```
3. Add an option to the theme select dropdown in `index.html`

### Modifying Timer Logic
Edit `renderer.js` to change timer behavior, session logic, or notifications.

## License

MIT

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Icons from [Font Awesome](https://fontawesome.com/)
- Inspired by the Pomodoro Technique® by Francesco Cirillo