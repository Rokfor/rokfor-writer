#!/bin/bash
echo "building prosemirror menu setup\n"
cd ../prosemirror-menu/
npm update
npm run build
git commit -am "automatic build"
git push
echo "building prosemirror example setup\n"
cd ../prosemirror-example-setup/
npm update
npm run build
git commit -am "automatic build"
git push
echo "building prosemirror markdown\n"
cd ../prosemirror-markdown/
npm update
npm run build
git commit -am "automatic build"
git push
echo "building ng2-prosemirror\n"
cd ../ng2-prosemirror
npm update
npm run build
git commit -am "upd. dep"
git push
echo "updating rokfor-writer dependencies\n"
cd ../rokfor-writer
npm update
