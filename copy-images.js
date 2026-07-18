const fs = require("fs");
const path = require("path");

const srcDir = "C:\\Users\\KBD\\.gemini\\antigravity-ide\\brain\\aa597e24-309d-4a48-bd5e-716b2f44bb3b";
const destDir = path.join(__dirname, "public", "images");

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log("Reading generated assets from:", srcDir);
console.log("Copying assets to:", destDir);

try {
  const files = fs.readdirSync(srcDir);
  let copyCount = 0;

  files.forEach((file) => {
    // Matches panorama_XX_timestamp.png
    if (file.startsWith("panorama_") && file.endsWith(".png")) {
      const match = file.match(/^panorama_(\d+)/);
      if (match) {
        const id = match[1];
        const destName = `panorama_${id}.png`;
        const srcPath = path.join(srcDir, file);
        const destPath = path.join(destDir, destName);

        fs.copyFileSync(srcPath, destPath);
        console.log(`Successfully copied: ${file} -> ${destName}`);
        copyCount++;
      }
    }
  });

  if (copyCount === 0) {
    console.log("No panorama PNG images found in brain folder. Please double check the directory path.");
  } else {
    console.log(`Copied ${copyCount} images successfully.`);
  }
} catch (error) {
  console.error("Error copying images:", error.message);
}
