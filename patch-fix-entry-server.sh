#!/bin/bash

echo "📦 Patching package.json to use correct entry point..."

# Backup existing package.json
cp package.json package.json.bak

# Overwrite scripts section to point to server.js
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.scripts = { ...pkg.scripts, start: "node server.js" };
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
console.log("✅ Updated start script to use server.js");
'

git add package.json
git commit -m "🛠️ Patch: Fix start script to use server.js for Railway"
git push

echo "🚀 Patch applied and pushed. Railway should now build properly."
