
const { assertElement, assertText } = require("qawolf");
const faker = require("faker");
require("dotenv").config();

async function launch({ headless } = { headless: false }) {
  const playwright = require("@recordreplay/playwright");
  let browserName = process.env.PLAYWRIGHT_CHROMIUM ? "chromium" : "firefox";

  const browser = await playwright[browserName].launch({
    headless,
  });
  const context = await browser.newContext();
  return { browser, context };
}

function testHelper() {
  console.log("This is a test");
}

module.exports = {
  assertElement,
  assertNotElement,
  assertNotText,
  assertText,
  faker,
  logInToFacebook,
};
