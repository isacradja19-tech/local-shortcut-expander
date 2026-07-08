# Easeit

Create local text shortcuts that expand while you type. No account, no sync, no tracking.

Easeit is a Chrome extension for simple text expansion. You create a trigger such as `/sig`, save the text you want inserted, then type the trigger in a normal text field and press space, tab, or enter.

## What It Does

- Expands local text shortcuts while you type.
- Works in normal input fields, textarea fields, and basic editable fields.
- Stores snippets locally in your browser using IndexedDB.
- Stores small settings locally, such as whether expansion is enabled.
- Supports JSON backup export and import.

## Install Locally

1. Run `pnpm build`.
2. Open `chrome://extensions`.
3. Turn on Developer mode.
4. Click Load unpacked.
5. Select `.output/chrome-mv3`.

## Create Shortcuts

1. Open the Easeit options page.
2. Enter a trigger, such as `/sig`.
3. Enter the text to insert.
4. Click Add shortcut.
5. In a normal text field, type the trigger and press space, tab, or enter.

## Export And Import

- Click Export backup to download a JSON backup of your shortcuts.
- Click Import backup to choose a JSON backup file and restore shortcuts.
- Export and import only happen when you choose those actions.

## Known Limitations

Works in most normal text fields. Some complex editors such as Google Docs may not be supported yet.

Easeit cannot run in browser-owned areas such as the address bar, `chrome://` pages, or the Chrome Web Store.

## Permissions

Easeit keeps permissions minimal.

- `storage`: used to save small local settings, such as whether expansion is enabled.
- `content_scripts` on `<all_urls>`: lets Easeit run on normal websites so it can detect shortcut triggers in text fields.

Easeit does not request `tabs`, `history`, `cookies`, `webRequest`, or `identity`.

## Build Instructions

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

The built extension is created at `.output/chrome-mv3`.
