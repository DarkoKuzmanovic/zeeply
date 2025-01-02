# Zeeply

A modern desktop application for viewing and editing ZPL (Zebra Programming Language) files with real-time preview.

![Zeeply Screenshot](screenshot.png)

## Features

- 🖼️ Real-time ZPL label preview
- 📝 ZPL syntax highlighting
- 🌗 Light/Dark mode with system theme support
- 🔄 Preview controls (rotate, zoom, export)
- 📂 Drag & drop support
- 📋 Recent files history
- ⌨️ Keyboard shortcuts

## Development

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

### Setup

1. Clone the repository

``` bash
git clone https://github.com/yourusername/zeeply.git
cd zeeply
```

2. Install dependencies

``` bash
npm install
```

3. Run the development server

``` bash
npm start
```

### Build

``` bash
npm run build
```

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Open File | `Ctrl + O` | `⌘ + O` |
| Export as PNG | `Ctrl + E` | `⌘ + E` |
| Rotate Preview | `Ctrl + R` | `⌘ + R` |
| Zoom In | `Ctrl + =` | `⌘ + =` |
| Zoom Out | `Ctrl + -` | `⌘ + -` |
| Developer Tools | `F12` | `F12` |

## Credits

- [Labelary API](http://labelary.com/service.html) - ZPL preview rendering
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Electron](https://www.electronjs.org/) - Cross-platform framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## License

[MIT](LICENSE)
