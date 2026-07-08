# Easeit

Create local text shortcuts that expand while you type. No account, no sync, no tracking.

Easeit stores shortcuts locally in the browser and works in normal input fields, textarea fields, and basic editable fields.

## Single Purpose

Easeit has one purpose: local text shortcut expansion. It watches for shortcuts you type in normal webpage text fields and replaces matching triggers with snippets stored locally in your browser.

## Permissions

Easeit keeps permissions minimal for Chrome Web Store review.

- `storage`: used only to save small local settings, such as whether expansion is enabled. Snippets are stored locally in IndexedDB.
- `content_scripts` on `<all_urls>`: lets Easeit run on normal websites so it can detect typed shortcuts in input fields, textarea fields, and basic editable fields.

Easeit does not request `tabs`, `history`, `cookies`, `webRequest`, or `identity`.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Load the built extension from `.output/chrome-mv3`.
