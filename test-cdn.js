const https = require("https");

const idToTest = 8; // We know Tableau #8 exists

const patterns = [
  `https://cdn.panorama.garden/tableaus/${idToTest}.jpg`,
  `https://cdn.panorama.garden/tableaus/${String(idToTest).padStart(2, "0")}.jpg`,
  `https://cdn.panorama.garden/tableaus/${String(idToTest).padStart(3, "0")}.jpg`,
  `https://cdn.panorama.garden/tableau_${idToTest}.jpg`,
  `https://cdn.panorama.garden/tableau_${String(idToTest).padStart(2, "0")}.jpg`,
  `https://cdn.panorama.garden/${idToTest}.jpg`,
  `https://cdn.panorama.garden/${String(idToTest).padStart(2, "0")}.jpg`,
  `https://cdn.panorama.garden/${String(idToTest).padStart(3, "0")}.jpg`,
  `https://cdn.panorama.garden/generated_${idToTest}.jpg`,
  `https://cdn.panorama.garden/generated_${String(idToTest).padStart(2, "0")}.jpg`,
  `https://cdn.panorama.garden/tableaus/${idToTest}.png`,
  `https://cdn.panorama.garden/tableau_${idToTest}.png`,
  `https://cdn.panorama.garden/${idToTest}.png`,
  // Season 2 styles
  `https://cdn.panorama.garden/season2/tableaus/${idToTest}.webp`,
  `https://cdn.panorama.garden/season2/${idToTest}.webp`
];

console.log("Probing CDN image URL patterns...");

let checked = 0;
patterns.forEach(url => {
  https.get(url, (res) => {
    checked++;
    if (res.statusCode === 200) {
      console.log(`\n[SUCCESS 200] Found valid URL pattern: ${url}`);
    } else {
      // console.log(`[Fail ${res.statusCode}] ${url}`);
    }
    if (checked === patterns.length) {
      console.log("\nProbing completed.");
    }
  }).on("error", (e) => {
    checked++;
    console.error(`[Error] Connection failed for ${url}:`, e.message);
    if (checked === patterns.length) {
      console.log("\nProbing completed.");
    }
  });
});
