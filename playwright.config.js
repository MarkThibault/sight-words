// Browser tests (tests/*.spec.js): run them with `npm test`. See "Tests" in README.md.
'use strict';

const { defineConfig } = require('@playwright/test');

const PORT = 8123; // not 8000, so the tests can run while the usual local server is open

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 90_000, // a whole game plays its real recordings, which takes a while
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // On GitHub a failed test runs once more, so the failure's details are seen twice, but the check still fails:
  // a test that only passes on a retry is hiding something (like the stickers on the title when the font came late).
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    // localhost, not 127.0.0.1, so offline play stays off and every test loads the files as they are now
    baseURL: `http://localhost:${PORT}`,
    // The browser already on the computer, so nothing needs downloading: Edge on Windows, Chrome elsewhere
    // (GitHub's test machines have it).
    channel: process.platform === 'win32' ? 'msedge' : 'chrome',
    // Sound can start without a tap. Clicks in the tests are real anyway, but a game waits for each clip to end.
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
    // When a test fails, keep a screenshot and a step-by-step trace in test-results/ (open a trace with
    // `npx playwright show-trace <file>`). GitHub saves the folder with the run.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 1024, height: 768 } } },
  ],
  webServer: {
    command: `${process.platform === 'win32' ? 'python' : 'python3'} serve.py ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stderr: 'ignore', // Python logs every file it serves there
  },
});
