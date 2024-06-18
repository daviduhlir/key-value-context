"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.CONTEXT_BASE_CONFIG = void 0;
const AsyncLocalStorage_1 = __importDefault(require("./utils/AsyncLocalStorage"));
exports.CONTEXT_BASE_CONFIG = {
    flushIfSuccess: true,
    flushIfFail: false,
    deleteUndefined: true,
};
class Context {
    constructor(topData = {}, config = {}) {
        this.topData = topData;
        this.stackStorage = new AsyncLocalStorage_1.default();
        this.config = Object.assign(Object.assign({}, exports.CONTEXT_BASE_CONFIG), config);
    }
    getValue(key) {
        const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])];
        for (let i = stack.length - 1; i >= 0; i--) {
            if (stack[i].data.hasOwnProperty(key)) {
                return stack[i].data[key];
            }
        }
        return undefined;
    }
    setValue(key, value) {
        const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])];
        stack[stack.length - 1].data[key] = value;
    }
    getAllKeys() {
        const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])];
        return stack.reduce((acc, item) => [...acc, ...Object.keys(item.data)], []).filter((value, index, array) => array.indexOf(value) === index);
    }
    runInContext(handler) {
        return __awaiter(this, void 0, void 0, function* () {
            const stack = [{ data: this.topData }, ...(this.stackStorage.getStore() || [])];
            const actualData = { data: {} };
            let result;
            let error;
            try {
                result = yield this.stackStorage.run([...stack, actualData], () => __awaiter(this, void 0, void 0, function* () { return handler(); }));
            }
            catch (e) {
                error = e;
            }
            if ((error && this.config.flushIfFail) || (!error && this.config.flushIfSuccess)) {
                const topItem = stack[stack.length - 1].data;
                const keys = Object.keys(actualData.data);
                for (const key of keys) {
                    ;
                    topItem[key] = actualData.data[key];
                }
            }
            if (this.config.deleteUndefined && stack.length === 1) {
                const keys = Object.keys(stack[0].data);
                for (const key of keys) {
                    if (typeof stack[0].data[key] === 'undefined') {
                        delete stack[0].data[key];
                    }
                }
            }
            if (error) {
                throw error;
            }
            return result;
        });
    }
}
exports.Context = Context;
