process.env.NODE_PATH = process.env.APPDATA + "/npm/node_modules";
require("module").Module._initPaths();
const puppeteer = require("puppeteer");

const testFile = process.argv[2] || "test/server-lobby-test.html";

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    logs.push(text);
    console.log(text);
  });
  page.on("pageerror", (err) => {
    logs.push("PAGE ERROR: " + err.message);
    console.log("PAGE ERROR: " + err.message);
  });
  await page.goto(`http://localhost:8080/${testFile}`, {
    waitUntil: "domcontentloaded",
  });
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (logs.some((l) => l.includes("=== Results:"))) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!logs.some((l) => l.includes("=== Results:"))) {
    console.log("TIMEOUT: test did not complete in 30s");
  }
  await browser.close();
})();
