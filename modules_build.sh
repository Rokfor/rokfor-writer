#!/bin/bash
echo "🚀 building prosemirror menu setup"
cd ../prosemirror-menu/
npm update > /dev/null 2>&1
npm run build
git commit -am "automatic build" > /dev/null 2>&1
git push > /dev/null 2>&1
echo " "
echo "🚀 building prosemirror example setup"
cd ../prosemirror-example-setup/
npm update > /dev/null 2>&1
npm run build
git commit -am "automatic build" > /dev/null 2>&1
git push > /dev/null 2>&1
echo " "
echo "🚀 building prosemirror markdown"
cd ../prosemirror-markdown/
npm update > /dev/null 2>&1
npm run build
git commit -am "automatic build" > /dev/null 2>&1
git push > /dev/null 2>&1
echo " "
echo "🚀 building ng2-prosemirror"
cd ../ng2-prosemirror
npm update > /dev/null 2>&1
npm run build
git commit -am "upd. dep" > /dev/null 2>&1
git push > /dev/null 2>&1
echo " "
echo "🚀 updating rokfor-writer dependencies"
cd ../rokfor-writer
npm update > /dev/null 2>&1
