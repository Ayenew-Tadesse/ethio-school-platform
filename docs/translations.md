# Translations

The interface text is in `src/lib/i18n/en.ts` (English, complete) and
`src/lib/i18n/am.ts` (Amharic). People switch language from the sign-in page
or the account menu; the choice is remembered on that device.

- **Every screen is translated.** `npm test` fails if any English text has no
  Amharic, if an Amharic key has no English one, or if a `{placeholder}` was
  lost. Only the school's own name stays in English on purpose.
- **Review needed.** The Amharic is a careful first version written for clear,
  plain language. **A native speaker should review it before real schools use
  it**, especially school-specific words (grades, terms, homeroom). Send
  corrections as edits to `am.ts`.
- **Adding a language:** copy `am.ts`, translate it, and add it to `LOCALES` in
  `src/lib/i18n/index.tsx`. Right-to-left languages are already supported.
