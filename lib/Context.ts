import AsyncLocalStorage from './utils/AsyncLocalStorage'

export type ContextKeyValueData = { [key: string]: any }

export interface ContextConfig {
  flushIfSuccess?: boolean
  flushIfFail?: boolean
  deleteUndefined?: boolean
}

export const CONTEXT_BASE_CONFIG: ContextConfig = {
  flushIfSuccess: true,
  flushIfFail: false,
  deleteUndefined: true,
}

export class Context<T extends ContextKeyValueData> {
  protected config: ContextConfig

  constructor(readonly topData: Partial<T> = {}, config: Partial<ContextConfig> = {}) {
    this.config = {
      ...CONTEXT_BASE_CONFIG,
      ...config,
    }
  }

  protected stackStorage = new AsyncLocalStorage<Partial<T>[]>()

  getValue<K extends keyof T>(key: K): T[K] | undefined {
    const stack = [this.topData, ...(this.stackStorage.getStore() || [])]
    for (let i = stack.length - 1; i > 0; i--) {
      if (stack[i].hasOwnProperty(key)) {
        return stack[i][key] as any
      }
    }
    return undefined
  }

  setValue<K extends keyof T>(key: K, value: T[K] | undefined) {
    const stack = [this.topData, ...(this.stackStorage.getStore() || [])]
    const topItem = stack[stack.length - 1]
    topItem[key] = value
  }

  getAllKeys(): string[] {
    const stack = [this.topData, ...(this.stackStorage.getStore() || [])]
    return stack.reduce((acc, item) => [...acc, ...Object.keys(item)], []).filter((value, index, array) => array.indexOf(value) === index)
  }

  async runInContext<K>(handler: () => Promise<K>): Promise<K> {
    const stack = [this.topData, ...(this.stackStorage.getStore() || [])]
    // preapre empty proxy cache
    const actualData = {}

    let result
    let error
    try {
      result = await this.stackStorage.run([...stack, actualData], async () => handler())
    } catch (e) {
      error = e
    }

    // flush storage
    if ((error && this.config.flushIfFail) || (!error && this.config.flushIfSuccess)) {
      const topItem = stack[stack.length - 1]
      const keys = Object.keys(actualData)
      for (const key of keys) {
        ;(topItem[key] as any) = actualData[key]
      }
    }

    if (this.config.deleteUndefined && stack.length === 1) {
      const keys = Object.keys(stack[0])
      for (const key of keys) {
        if (typeof stack[0][key] === 'undefined') {
          delete stack[0][key]
        }
      }
    }

    if (error) {
      throw error
    }
    return result
  }
}
