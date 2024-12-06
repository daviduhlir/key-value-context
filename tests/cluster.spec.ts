import { assert } from 'chai'
import { spawn } from 'child_process'

/**
 * Run node app to test cluster communication via IPC
 */
describe('Share in cluster', function() {
  it('Set data in fork', async function() {
    const result: string[] = await new Promise((resolve, reject) => {

      const child = spawn('ts-node', ['./tests/complex/proxyData.ts'])
      let outputs: string[] = []
      let errors: string[] = []
      child.stdout.on('data', data => outputs.push(data.toString()))
      child.stderr.on('data', data => errors.push(data.toString()))
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(outputs.join('').split('\n').filter(Boolean))
        } else {
          reject(errors)
        }
      })
    })

    assert(result.every(l => l === 'Hello'), 'All values should be changed from master')
  })
})
