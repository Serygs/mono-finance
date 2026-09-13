import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import ts from 'typescript'

import {
  compareTranslationKeys,
  formatParityErrors,
} from './localization-parity.mjs'

const messagesPath = path.resolve('src/features/localization/messages.ts')
const source = ts.createSourceFile(
  messagesPath,
  fs.readFileSync(messagesPath, 'utf8'),
  ts.ScriptTarget.Latest,
)
const declarations = new Map(
  source.statements
    .flatMap((statement) =>
      ts.isVariableStatement(statement)
        ? statement.declarationList.declarations
        : [],
    )
    .flatMap((declaration) =>
      ts.isIdentifier(declaration.name) && declaration.initializer !== undefined
        ? [[declaration.name.text, declaration.initializer]]
        : [],
    ),
)

const englishKeys = collectArrayKeys(declarations.get('ENGLISH_MESSAGE_KEYS'))
const ukrainianKeys = collectObjectKeys(declarations.get('UKRAINIAN_MESSAGES'))
const errors = compareTranslationKeys(englishKeys, ukrainianKeys)
const formattedErrors = formatParityErrors(errors)

if (formattedErrors !== '') {
  console.error(formattedErrors)
  process.exitCode = 1
} else {
  console.log(
    `Localization parity verified: ${englishKeys.length} keys in en and uk.`,
  )
}

function collectArrayKeys(node) {
  node = unwrapExpression(node)
  if (node === undefined || !ts.isArrayLiteralExpression(node)) {
    throw new Error(
      'ENGLISH_MESSAGE_KEYS must be declared as an array literal.',
    )
  }
  return node.elements.map((element) => {
    if (!ts.isStringLiteral(element)) {
      throw new Error('ENGLISH_MESSAGE_KEYS must contain string literals only.')
    }
    return element.text
  })
}

function collectObjectKeys(node, prefix = '') {
  node = unwrapExpression(node)
  if (node === undefined || !ts.isObjectLiteralExpression(node)) {
    throw new Error('UKRAINIAN_MESSAGES must be declared as an object literal.')
  }

  return node.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property)) {
      throw new Error(
        'Translation objects must contain property assignments only.',
      )
    }
    const key = propertyName(property.name)
    const fullKey = prefix === '' ? key : `${prefix}.${key}`
    return ts.isObjectLiteralExpression(property.initializer)
      ? collectObjectKeys(property.initializer, fullKey)
      : [fullKey]
  })
}

function propertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text
  throw new Error('Translation keys must be identifiers or string literals.')
}

function unwrapExpression(node) {
  if (
    node !== undefined &&
    (ts.isAsExpression(node) ||
      ts.isParenthesizedExpression(node) ||
      ts.isSatisfiesExpression(node))
  ) {
    return unwrapExpression(node.expression)
  }
  return node
}
