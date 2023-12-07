#!/bin/bash
cd ${1}
npm install
npm run build
rm -rf node_modules