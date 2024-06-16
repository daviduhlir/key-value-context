"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.CONTEXT_BASE_CONFIG = void 0;
const AsyncLocalStorage_1 = require("./utils/AsyncLocalStorage");
exports.CONTEXT_BASE_CONFIG = {
    flushIfFail: false,
    deleteUndefined: true,
};
class Context {
    constructor(topData = {}, config = {}) {
        this.topData = topData;
        this.stackStorage = new AsyncLocalStorage_1.default();
        this.config = {
            ...exports.CONTEXT_BASE_CONFIG,
            ...config,
        };
    }
    getValue(key) {
        const stack = [this.topData, ...(this.stackStorage.getStore() || [])];
        for (let i = stack.length - 1; i > 0; i--) {
            if (stack[i].hasOwnProperty(key)) {
                return stack[i][key];
            }
        }
        return undefined;
    }
    setValue(key, value) {
        const stack = [...(this.stackStorage.getStore() || [])];
        const topItem = stack[stack.length - 1];
        topItem[key] = value;
    }
    async runInContext(handler) {
        const stack = [this.topData, ...(this.stackStorage.getStore() || [])];
        const actualData = {};
        let result;
        let error;
        try {
            result = await this.stackStorage.run([...stack, actualData], async () => handler());
        }
        catch (e) {
            error = e;
        }
        if ((error && this.config.flushIfFail) || !error) {
            const topItem = stack[stack.length - 1];
            const keys = Object.keys(actualData);
            for (const key of keys) {
                ;
                topItem[key] = actualData[key];
            }
        }
        if (this.config.deleteUndefined && stack.length === 1) {
            const keys = Object.keys(stack[0]);
            for (const key of keys) {
                if (typeof stack[0][key] === 'undefined') {
                    delete stack[0][key];
                }
            }
        }
        if (error) {
            throw error;
        }
        return result;
    }
}
exports.Context = Context;
//# sourceMappingURL=Context.js.map