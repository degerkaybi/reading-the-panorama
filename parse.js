const fs = require("fs");
const path = require("path");

const file106 = "C:\\Users\\KBD\\.gemini\\antigravity-ide\\brain\\aa597e24-309d-4a48-bd5e-716b2f44bb3b\\.system_generated\\steps\\106\\content.md";
const file126 = "C:\\Users\\KBD\\.gemini\\antigravity-ide\\brain\\aa597e24-309d-4a48-bd5e-716b2f44bb3b\\.system_generated\\steps\\126\\content.md";

let allUrls = [];

function parse(file, name) {
  if (!fs.existsSync(file)) {
    allUrls.push(`${name} file not found at: ${file}`);
    return;
  }
  const content = fs.readFileSync(file, "utf-8");
  
  // Regex to match URLs
  const urls = content.match(/https?:\/\/[^\s"'`<>\\)}]+/g) || [];
  const uniqueUrls = Array.from(new Set(urls));
  
  allUrls.push(`\n=============================================`);
  allUrls.push(`URLs found in ${name}`);
  allUrls.push(`=============================================`);
  
  // Filter for image and CDN assets
  const cdnUrls = uniqueUrls.filter(url => 
    url.includes("cdn") || 
    url.includes("panorama.garden") || 
    url.endsWith(".jpg") || 
    url.endsWith(".webp") || 
    url.endsWith(".png")
  );
  
  if (cdnUrls.length === 0) {
    allUrls.push("No image or CDN URLs found.");
  } else {
    cdnUrls.forEach(url => allUrls.push(url));
  }
}

parse(file106, "Canvas Page (/canvas)");
parse(file126, "Index Page (/)");

fs.writeFileSync("urls.txt", allUrls.join("\n"));
console.log("URLs saved to urls.txt successfully!");

