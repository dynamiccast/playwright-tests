const { context } = await launch();
const page = await context.newPage();
await page.goto('https://google.com');
// 🐺 QA Wolf will create code here