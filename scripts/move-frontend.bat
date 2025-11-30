@echo off
cd /d "%~dp0\.."
if not exist frontend mkdir frontend

echo Moving frontend files...
move src frontend\src
move public frontend\public
move index.html frontend\index.html
move vite.config.ts frontend\vite.config.ts
move package.json frontend\package.json
if exist package-lock.json move package-lock.json frontend\package-lock.json
if exist bun.lockb move bun.lockb frontend\bun.lockb
move tsconfig.json frontend\tsconfig.json
move tsconfig.app.json frontend\tsconfig.app.json
move tsconfig.node.json frontend\tsconfig.node.json
move tailwind.config.ts frontend\tailwind.config.ts
move components.json frontend\components.json
move postcss.config.js frontend\postcss.config.js
move eslint.config.js frontend\eslint.config.js
if exist .prettierrc.json move .prettierrc.json frontend\.prettierrc.json
if exist .prettierignore move .prettierignore frontend\.prettierignore

echo.
echo Migration complete!
echo.
