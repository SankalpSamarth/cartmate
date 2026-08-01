const fs = require('fs');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0a0a0a" rx="112" />
  <!-- A sleek minimal cart / bag icon or typography -->
  <text x="256" y="320" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="220" font-weight="800" text-anchor="middle" fill="#ffffff" letter-spacing="-8">CM</text>
  <circle cx="256" cy="400" r="12" fill="#f8d000" />
</svg>`;
fs.writeFileSync('public/icon.svg', svg);
