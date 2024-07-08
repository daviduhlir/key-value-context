export function delay<T = any>(time: number, call?: () => Promise<T>): Promise<T> {
  return new Promise(resolve => setTimeout(async () => {
    if (call) {
      resolve(await call())
      return
    }
    resolve(undefined as T)
  }, time))
}
