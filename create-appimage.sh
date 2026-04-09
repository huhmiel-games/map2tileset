#!/bin/bash

# Configuration
APP_NAME="Map2Tileset"
SRC_DIR="dist/map2tileset/linux64"
APPDIR="dist/AppDir"
ICON_FILE="icon.png"  # Placez votre icône 256x256 dans le dossier racine

echo "=== Création de l'AppImage pour $APP_NAME ==="

# 1. Nettoyer l'ancien AppDir
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"

# 2. Copier les fichiers de l'application
echo "[1/5] Copie des fichiers..."
cp -r "$SRC_DIR"/* "$APPDIR/"

# 3. Renommer l'exécutable NW.js
echo "[2/5] Configuration de l'exécutable..."
if [ -f "$APPDIR/map2tileset" ]; then
    mv "$APPDIR/map2tileset" "$APPDIR/$APP_NAME"
else
    echo "Erreur: Exécutable NW.js non trouvé!"
    exit 1
fi

# Rendre exécutable
chmod +x "$APPDIR/Map2Tileset"

# CRITIQUE : Créer le fichier AppRun (CORRIGÉ)
echo "[3/5] Création du fichier AppRun..."
cat > "$APPDIR/AppRun" <<'APPRUNEOF'
#!/bin/bash
HERE="$(dirname "$(readlink -f "${0}")")"
export LD_LIBRARY_PATH="${HERE}/lib:${HERE}/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH}"
exec "${HERE}/Map2Tileset" "$@"
APPRUNEOF
chmod +x "$APPDIR/AppRun"

# 4. Créer le fichier .desktop
echo "[4/5] Création du fichier .desktop..."
cat > "$APPDIR/$APP_NAME.desktop" <<EOF
[Desktop Entry]
Name=$APP_NAME
Exec=./$APP_NAME %U
Icon=$APP_NAME
Type=Application
Categories=Development;
StartupNotify=true
EOF

# 5. Copier l'icône (si présente)
if [ -f "$ICON_FILE" ]; then
    cp "$ICON_FILE" "$APPDIR/usr/share/icons/hicolor/256x256/apps/$APP_NAME.png"
    cp "$ICON_FILE" "$APPDIR/$APP_NAME.png"
    cp "$ICON_FILE" "$APPDIR/.DirIcon"
    echo "   Icône copiée avec succès"
else
    echo "   Attention: Aucune icône trouvée ($ICON_FILE)"
fi

# 6. Télécharger appimagetool si nécessaire
if [ ! -f "appimagetool" ]; then
    echo "[4/4] Téléchargement de appimagetool..."
    wget -q "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage" -O appimagetool
    chmod +x appimagetool
else
    echo "[5/5] appimagetool déjà présent"
fi

# 7. Créer l'AppImage
echo "=== Génération de l'AppImage ==="
ARCH=x86_64 ./appimagetool "$APPDIR"

echo ""
echo "✅ AppImage créée avec succès!"
echo "📁 Fichier: ${APP_NAME}-x86_64.AppImage"
echo ""