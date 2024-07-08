export declare type ContextKeyValueData = {
    [key: string]: any;
};
export interface ContextConfig {
    flushIfSuccess?: boolean;
    flushIfFail?: boolean;
    deleteUndefined?: boolean;
    sharedClusterKey?: string;
}
export declare const CONTEXT_BASE_CONFIG: ContextConfig;
export declare class Context<T extends ContextKeyValueData> {
    readonly topData: Partial<T>;
    protected static clusterProxyAttached: boolean;
    protected config: ContextConfig;
    constructor(topData?: Partial<T>, config?: Partial<ContextConfig>);
    static initializeMaster(): void;
    protected stackStorage: import("./utils/AsyncLocalStorage").AsyncLocalStorageMock<{
        data: Partial<T>;
    }[]>;
    getValue<K extends keyof T>(key: K): T[K] | undefined;
    setValue<K extends keyof T>(key: K, value: T[K] | undefined): void;
    getAllKeys(): string[];
    runInContext<K>(handler: () => Promise<K>): Promise<K>;
    protected initialize(): void;
    protected sendChange(data: Partial<T>): void;
    protected applyChange(data: Partial<T>): void;
}
