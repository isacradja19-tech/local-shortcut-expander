export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    console.info('Local Shortcut Expander installed.');
  });
});
