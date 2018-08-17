#!/bin/bash
rm www/index.js
rm www/print.css
cp src/index.js www/
cp src/print.css www/
electron-packager . --platform mas --overwrite --icon "www/assets/electron_icons/icon.png.icns"
