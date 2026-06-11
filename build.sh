#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="$HOME/.local/bin"
DESKTOP_DIR="$HOME/.local/share/applications"
ICONS_HICOLOR="$HOME/.local/share/icons/hicolor"
APPIMAGE_DEST="$INSTALL_DIR/Marky.AppImage"
ICON_NAME="io.github.marky_editor.marky"

# ── Build ─────────────────────────────────────────────────────────────────────
npm run build:linux

APPIMAGE=$(find dist -maxdepth 1 -name '*.AppImage' | head -1)
[[ -z "$APPIMAGE" ]] && { echo "error: no AppImage found in dist/" >&2; exit 1; }

# ── Install AppImage ──────────────────────────────────────────────────────────
mkdir -p "$INSTALL_DIR"
cp "$APPIMAGE" "$APPIMAGE_DEST"
chmod +x "$APPIMAGE_DEST"
echo "installed: $APPIMAGE_DEST"

# ── Install icons ─────────────────────────────────────────────────────────────
for size in 16 32 48 64 128 256 512 1024; do
  src="build/icons/${size}x${size}.png"
  dest="$ICONS_HICOLOR/${size}x${size}/apps/${ICON_NAME}.png"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  fi
done
gtk-update-icon-cache --quiet "$ICONS_HICOLOR" 2>/dev/null || true
echo "icons installed"

# ── Desktop entry ─────────────────────────────────────────────────────────────
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/marky.desktop" <<DESKTOP
[Desktop Entry]
Name=Marky
GenericName=Markdown Editor
Comment=Apostrophe-inspired Markdown editor
Exec=$APPIMAGE_DEST %F
Icon=$ICON_NAME
Type=Application
Categories=Office;TextEditor;
MimeType=text/markdown;text/x-markdown;text/plain;
Terminal=false
StartupWMClass=marky
DESKTOP

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
echo "desktop entry: $DESKTOP_DIR/marky.desktop"
echo "done — launch Marky from your app menu or: $APPIMAGE_DEST"
