import { Context } from '../../dist'
import * as cluster from 'cluster'
import { delay } from '../utils'

;(async function () {
  if (!cluster.isWorker) {
    Context.initializeMaster()
    for(let index = 0; index < 5; index++) {
      cluster.fork({ index })
        .on('exit', (e) => {
          if (e !== 0) {
            throw new Error('Cluster failed: ' + e.toString())
          }
        })
    }
  } else {
    const index = parseInt(process.env['index'] as any, 10)
    const topData = {
      key: 'value'
    }
    const context = new Context(topData, {
      sharedClusterKey: 'context-key',
    })

    if (index === 0) {
      await context.runInContext(async () => {
        context.setValue('key', 'Hello')
      })
    } else {
      await delay(10)
      await context.runInContext(async () => {
        console.log(context.getValue('key'))
      })
    }
    await delay(5)
    process.exit(0)
  }
})()
