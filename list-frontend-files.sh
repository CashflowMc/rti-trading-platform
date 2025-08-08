#!/bin/bash

echo "🔍 Listing frontend files (HTML, JS, CSS, etc)..."
echo "--------------------------------------------------"

# Define file extensions to include
EXTENSIONS=("*.html" "*.js" "*.css")

# Loop through and list matching files
for EXT in "${EXTENSIONS[@]}"; do
  find . -maxdepth 1 -type f -name "$EXT" -exec du -h {} \;
done

echo "✅ Done listing."
