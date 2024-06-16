import { Context } from '../dist/context'

/**
 * Simple scopes locks test
 */
describe('Basic context tests', function() {
  it('Save and read key', async function() {
    const topData = {
      key: 'value'
    }
    const context = new Context(topData)

    await context.runInContext(async () => {
      console.log('V1', context.getValue('key'))

      try {
        await context.runInContext(async () => {
          console.log('V2', context.getValue('key'))
          context.setValue('key', 'Hello')
          console.log('V2', context.getValue('key'))
          throw 'TEST'
        })
      } catch(e) {}

      console.log('V1', context.getValue('key'))
    })
  })
})
