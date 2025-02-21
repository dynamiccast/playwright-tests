const playwright = require("@recordreplay/playwright");
const fs = require("fs");
require("dotenv").config();

let browserName = process.env.PLAYWRIGHT_CHROMIUM ? "chromium" : "firefox";
const launchOptions = {
  headless: !!process.env.PLAYWRIGHT_HEADLESS,
};

let depth = 0;
const pad = () => "".padStart(depth * 2);
const indent = (value) =>
  String(value)
    .split("\n")
    .map((l) => pad() + l)
    .join("\n");

const _log =
  (which) =>
  (...args) => {
    if (depth) {
      console[which](new Date(), pad().substr(1), ...args);
    } else {
      console[which](new Date(), ...args);
    }
  };

const log = _log("log");
const error = _log("error");

function wrapped(cbk, pageLog = log, inline = false) {
  const i = inline ? 0 : 1;
  return async (name, ...args) => {
    try {
      await pageLog(inline ? name : `> ${name}`);
      depth += i;
      return await cbk(...args);
    } catch (e) {
      if (!e.handled) {
        e.handled = true;
        error(`🛑 Error in ${name}: ${e.message}`);
      }

      throw e;
    } finally {
      depth -= i;
      if (!inline) await pageLog(`< ${name}`);
    }
  };
}

function bindPageActions(page) {
  const actions = {};

  // Create page-bound actions
  const pageLog = (...args) => {
    log(...args);
    return page.evaluate((extArgs) => {
      console.log("Test Step:", ...extArgs);
    }, args);
  };

  const pageAction = wrapped(async (cbk) => await cbk(page, actions), pageLog);
  const pageStep = wrapped(
    async (cbk) => await cbk(page, actions),
    pageLog,
    true
  );

  actions.log = pageLog;
  actions.action = pageAction;
  actions.step = pageStep;

  return actions;
}

const action = wrapped(async (cbk) => await cbk());

const example = wrapped(async (cbk) => {
  const browser = await playwright[browserName].launch(launchOptions);
  const context = await browser.newContext();
  const page = await context.newPage();
  const startTime = new Date();
  const pageLog = (...args) => {
    log(...args);
    page
      .evaluate((extArgs) => {
        console.log("Test Step:", ...extArgs);
      }, args)
      .catch((e) => {});
  };

  pageLog("Browser launched");
  let success = true;

  await action("Running example", async () => {
    try {
      await cbk(page, bindPageActions(page));
    } catch (e) {
      success = false;
      error("Error:", e.message.split("\n")[0]);
    }
    pageLog(
      `${success ? "👍" : "💣"} Test ${success ? "succeeded" : "failed"}`
    );
    await saveMetadata(page, startTime, success);
  });

  try {
    // Adding a short delay after the script to allow space for trailing script
    // execution
    await page.waitForTimeout(100);

    await page.close();
    await context.close();
    await browser.close();
  } catch (e) {
    error("Error while shutting down browser:", e.message);
  }

  return success;
});

async function saveMetadata(page, startTime, success) {
  try {
    const last_screen = (await page.screenshot()).toString("base64");
    const title = await page.title();
    const metadata = {
      url: await page.url(),
      title,
      recordingTitle: `${success ? "" : "[FAILED] "} ${title}`,
      last_screen,
      duration: new Date() - startTime,
    };
    fs.appendFileSync("./metadata.log", JSON.stringify(metadata) + "\n");
  } catch (e) {
    error("Unable to populate metadata from page:", e.message);
  }
}

module.exports = {
  example,
};
