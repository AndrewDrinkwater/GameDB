import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const componentPath = path.resolve(
  __dirname,
  '../src/components/EntityMiniCreateInline.jsx',
)

test('inline entity creation uses a div wrapper instead of a nested form', async () => {
  const source = await readFile(componentPath, 'utf8')
  assert.ok(
    source.includes('<div className="entity-mini-create-inline">'),
    'inline creation should render a div container',
  )
  assert.ok(
    !source.includes('<form className="entity-mini-create-inline"'),
    'inline creation should not render a nested form element',
  )
})

test('save button does not trigger parent form submission', async () => {
  const source = await readFile(componentPath, 'utf8')
  assert.ok(
    !source.includes('<button type="submit"'),
    'save button should not be a submit button',
  )

  const normalised = source.replace(/\s+/g, ' ')
  assert.ok(
    /<button type="button" className="btn" disabled=\{isSaveDisabled\} onClick=\{handleSubmit\}\s*>/.test(
      normalised,
    ),
    'save button should use type="button" and handleSubmit on click',
  )
})
