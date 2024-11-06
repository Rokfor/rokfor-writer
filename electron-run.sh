#!/bin/bash
rm www/index.js
rm www/print.css
cp src/index.js www/
cp src/print.css www/
./node_modules/.bin/electron ./www/index.js
