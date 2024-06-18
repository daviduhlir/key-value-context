import { assert } from 'chai'
import { Context } from '../dist/context'

/**
 * Simple scopes locks test
 */
describe('Basic context tests', function() {
  it('Set value', async function() {
    const topData = {
      key: 'value'
    }
    const context = new Context(topData)

    await context.runInContext(async () => {
      context.setValue('key', 'Hello')
    })

    assert(topData['key'] === 'Hello', 'Value should be saved')
  })

  it('Nested context', async function() {
    const topData = {
      key: 'value'
    }
    const context = new Context(topData)

    await context.runInContext(async () => {
      await context.runInContext(async () => {
        context.setValue('key', 'Hello')
      })
    })

    assert(topData['key'] === 'Hello', 'Value should be saved from nested context')
  })

  it('Throw exception during context run', async function() {
    const topData = {
      key: 'value'
    }
    const context = new Context(topData)
    try {
      await context.runInContext(async () => {
        context.setValue('key', 'Hello')
        throw new Error('Test')
      })
    } catch(e) {}

    assert(topData['key'] === 'value', 'Value should be not changed')
  })

  it('Sync method call', async function() {
    const topData = {
      key: 'value'
    }
    const context = new Context(topData)
    function test() {
      return context.getValue('key')
    }

    let result = await context.runInContext(async () => {
      context.setValue('key', 'Hello')
      return test()
    })

    assert(result === 'Hello', 'Value should be getted from async scope')
  })
})
