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
const cluster_1 = __importDefault(require("./utils/cluster"));
exports.CONTEXT_BASE_CONFIG = {
    flushIfSuccess: true,
    flushIfFail: false,
    deleteUndefined: true,
};
const INTERNAL_MESSAGE_BROADCAST = 'KEY-VALUE-CONTEXT-INTERNAL-MESSAGE-BROADCAST';
class Context {
    constructor(topData = {}, config = {}) {
        this.topData = topData;
        this.stackStorage = new AsyncLocalStorage_1.default();
        this.config = Object.assign(Object.assign({}, exports.CONTEXT_BASE_CONFIG), config);
        this.initialize();
    }
    static initializeMaster() {
        if (!Context.clusterProxyAttached && !cluster_1.default.isWorker) {
            cluster_1.default.on('message', (worker, message) => __awaiter(this, void 0, void 0, function* () {
                if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST) {
                    Object.keys(cluster_1.default.workers).forEach(workerId => {
                        const remoteWorker = cluster_1.default.workers[workerId];
                        if (worker.id !== remoteWorker.id) {
                            remoteWorker.send(message);
                        }
                    });
                }
            }));
            Context.clusterProxyAttached = true;
        }
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
                if (stack.length === 1 && this.config.sharedClusterKey) {
                    this.sendChange(actualData.data);
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
    initialize() {
        Context.initializeMaster();
        if (!this.config.sharedClusterKey) {
            return;
        }
        if (cluster_1.default.isWorker) {
            process.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST && message.key === this.config.sharedClusterKey) {
                    this.applyChange(message.data);
                }
            }));
        }
        else {
            cluster_1.default.on('message', (worker, message) => __awaiter(this, void 0, void 0, function* () {
                if (message['INTERNAL_MESSAGE_BROADCAST'] === INTERNAL_MESSAGE_BROADCAST) {
                    if (message.key === this.config.sharedClusterKey) {
                        this.applyChange(message.data);
                    }
                }
            }));
        }
    }
    sendChange(data) {
        if (!this.config.sharedClusterKey) {
            return;
        }
        const message = {
            INTERNAL_MESSAGE_BROADCAST,
            key: this.config.sharedClusterKey,
            data,
        };
        if (cluster_1.default.isWorker) {
            process.send(message);
        }
        else {
            Object.keys(cluster_1.default.workers).forEach(workerId => {
                var _a, _b, _c;
                (_c = (_b = (_a = cluster_1.default.workers) === null || _a === void 0 ? void 0 : _a[workerId]) === null || _b === void 0 ? void 0 : _b.send) === null || _c === void 0 ? void 0 : _c.call(_b, message);
            });
        }
    }
    applyChange(data) {
        const keys = Object.keys(data);
        for (const key of keys) {
            ;
            this.topData[key] = data[key];
        }
        if (this.config.deleteUndefined) {
            const keys = Object.keys(this.topData);
            for (const key of keys) {
                if (typeof this.topData[key] === 'undefined') {
                    delete this.topData[key];
                }
            }
        }
    }
}
exports.Context = Context;
Context.clusterProxyAttached = false;
