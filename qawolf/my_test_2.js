const { context } = await launch();
const page = await context.newPage();
await page.goto('https://facebook.com');
// 🐺 QA Wolf will create code here