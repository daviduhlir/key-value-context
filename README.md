# In context Key-value storage

Basic key-value storage depending on context.
Each wrapping of async method to runInContext method will creates empty context.
When reading value, it will try to find in parent contextes, if you will set value, it will be set
in current context. After finishing your async method, all changes will be applied to parent context.
