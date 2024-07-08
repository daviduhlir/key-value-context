import AsyncLocalStorage from './utils/AsyncLocalStorage'
import cluster from './utils/cluster'

export type ContextKeyValueData = { [key: string]: any }

export interface ContextConfig {
  flushIfSuccess?: boolean
  flushIfFail?: boolean
  deleteUndefined?: boolean
  sharedClusterKey?: string
}

export const CONTEXT_BASE_CONFIG: ContextConfig = {
  flushIfSuccess: true,
  flushIfFail: false,
  deleteUndefined: true,
}

const INTERNAL_MESSAGE_BROADCAST = 'KEY-VALUE-CONTEXT-INTERNAL-MESSAGE-BROADCAST'

export class Context<T extends ContextKeyValueData> {
  protected static clusterProxyAttached = false
  protected config: ContextConfig

  constructor(readonly topData: Partial<T> = {}, config: Partial<ContextConfig> = {}) {
    this.config = {
      ...CONTEXT_BASE_CONFIG,
      ...config,
    }
    this.initialize()
  }

  /**
   * Initialize proxy in master process
   */
  static initializeMaster() {
    if (!Context.clusterProxyAttached && !cluster.isWorker) {
      cluster.on('message', async (worker, message) => {
        if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST) {
          Object.keys(cluster.workers).forEach(workerId => {
            const remoteWorker = cluster.workers[workerId]
            // do not send it back
            if (worker.id !== remoteWorker.id) {
              remoteWorker.send(message)
            }
          })
        }
      })
      Context.clusterProxyAttached = true
    }
  }

  protected stackStorage = new AsyncLocalStorage<{ data: Partial<T> }[]>()

  getValue<K extends keyof T>(key: K): T[K] | undefined {
    const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])]
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].data.hasOwnProperty(key)) {
        return stack[i].data[key]
      }
    }
    return undefined
  }

  setValue<K extends keyof T>(key: K, value: T[K] | undefined) {
    const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])]
    stack[stack.length - 1].data[key] = value
  }

  getAllKeys(): string[] {
    const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])]
    return stack.reduce((acc, item) => [...acc, ...Object.keys(item.data)], []).filter((value, index, array) => array.indexOf(value) === index)
  }

  async runInContext<K>(handler: () => Promise<K>): Promise<K> {
    const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])]
    // preapre empty proxy cache
    const actualData = { data: {} }

    let result
    let error
    try {
      result = await this.stackStorage.run([...stack, actualData], async () => handler())
    } catch (e) {
      error = e
    }

    // flush storage
    if ((error && this.config.flushIfFail) || (!error && this.config.flushIfSuccess)) {
      const topItem = stack[stack.length - 1].data
      const keys = Object.keys(actualData.data)
      for (const key of keys) {
        ;(topItem[key] as any) = actualData.data[key]
      }

      if (stack.length === 1 && this.config.sharedClusterKey) {
        // we are flushing to top data
        this.sendChange(actualData.data)
      }
    }

    if (this.config.deleteUndefined && stack.length === 1) {
      const keys = Object.keys(stack[0].data)
      for (const key of keys) {
        if (typeof stack[0].data[key] === 'undefined') {
          delete stack[0].data[key]
        }
      }
    }

    if (error) {
      throw error
    }
    return result
  }

  /**
   * Broadcast message
   */
  protected initialize() {
    Context.initializeMaster()

    if (!this.config.sharedClusterKey) {
      return
    }
    if (cluster.isWorker) {
      process.on('message', async message => {
        if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST && message.key === this.config.sharedClusterKey) {
          this.applyChange(message.data)
        }
      })
    } else {
      cluster.on('message', async (worker, message) => {
        if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST) {
          // message for me
          if (message.key === this.config.sharedClusterKey) {
            this.applyChange(message.data)
          }
        }
      })
    }
  }

  protected sendChange(data: Partial<T>) {
    if (!this.config.sharedClusterKey) {
      return
    }
    const message = {
      INTERNAL_MESSAGE_BROADCAST,
      key: this.config.sharedClusterKey,
      data,
    }
    if (cluster.isWorker) {
      process.send(message)
    } else {
      Object.keys(cluster.workers).forEach(workerId => {
        cluster.workers?.[workerId]?.send?.(message)
      })
    }
  }

  protected applyChange(data: Partial<T>) {
    const keys = Object.keys(data)
    for (const key of keys) {
      ;(this.topData[key] as any) = data[key]
    }
    if (this.config.deleteUndefined) {
      const keys = Object.keys(this.topData)
      for (const key of keys) {
        if (typeof this.topData[key] === 'undefined') {
          delete this.topData[key]
        }
      }
    }
  }
}
