import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const clientDirectory = join(import.meta.dirname, '..', 'dist', 'client')
const forbiddenNames = [
  '.dev.vars',
  'MONOBANK_TOKEN',
  'SESSION_TOKEN_PEPPER',
  'SETUP_TOKEN',
]

const files = await listFiles(clientDirectory)
for (const file of files) {
  const fileName = relative(clientDirectory, file)
  if (fileName === '.assetsignore') {
    await assertAssetIgnoreExcludesSecrets(file)
    continue
  }
  if (forbiddenNames.some((value) => fileName.includes(value))) {
    throw new Error(`Sensitive file name found in client bundle: ${fileName}`)
  }

  const contents = await readFile(file, 'utf8')
  if (forbiddenNames.some((value) => contents.includes(value))) {
    throw new Error(
      `Sensitive binding name found in client bundle: ${fileName}`,
    )
  }
}

async function assertAssetIgnoreExcludesSecrets(path) {
  const contents = await readFile(path, 'utf8')
  if (!contents.includes('.dev.vars')) {
    throw new Error('Client bundle asset policy does not exclude .dev.vars')
  }
}

async function listFiles(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry)
    if ((await stat(path)).isDirectory()) {
      files.push(...(await listFiles(path)))
    } else {
      files.push(path)
    }
  }
  return files
}
