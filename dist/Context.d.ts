export declare type ContextKeyValueData = {
    [key: string]: any;
};
export interface ContextConfig {
    flushIfSuccess?: boolean;
    flushIfFail?: boolean;
    deleteUndefined?: boolean;
}
export declare const CONTEXT_BASE_CONFIG: ContextConfig;
export declare class Context<T extends ContextKeyValueData> {
    readonly topData: Partial<T>;
    protected config: ContextConfig;
    constructor(topData?: Partial<T>, config?: Partial<ContextConfig>);
    protected stackStorage: import("./utils/AsyncLocalStorage").AsyncLocalStorageMock<Partial<T>[]>;
    getValue<K extends keyof T>(key: K): T[K] | undefined;
    setValue<K extends keyof T>(key: K, value: T[K] | undefined): void;
    getAllKeys(): string[];
    runInContext<K>(handler: () => Promise<K>): Promise<K>;
}
