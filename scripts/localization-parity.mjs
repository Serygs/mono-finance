export function compareTranslationKeys(englishKeys, ukrainianKeys) {
  const english = new Set(englishKeys)
  const ukrainian = new Set(ukrainianKeys)

  return {
    missingFromEnglish: [...ukrainian]
      .filter((key) => !english.has(key))
      .sort(),
    missingFromUkrainian: [...english]
      .filter((key) => !ukrainian.has(key))
      .sort(),
  }
}

export function formatParityErrors({
  missingFromEnglish,
  missingFromUkrainian,
}) {
  const sections = []
  if (missingFromEnglish.length > 0) {
    sections.push(
      `Missing from English (en):\n${missingFromEnglish.map((key) => `  - ${key}`).join('\n')}`,
    )
  }
  if (missingFromUkrainian.length > 0) {
    sections.push(
      `Missing from Ukrainian (uk):\n${missingFromUkrainian.map((key) => `  - ${key}`).join('\n')}`,
    )
  }
  return sections.length === 0
    ? ''
    : `Localization key parity failed.\n${sections.join('\n')}`
}
