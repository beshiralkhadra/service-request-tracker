# Authentication feature

The backend owns authentication and authorization. This feature owns the
in-memory Zustand session, minimal refresh-bootstrap Auth Context, typed auth API
functions, and custom login/register/logout hooks. Bearer tokens are never
persisted in browser storage. The responsive auth screen supports Agent login
and Customer-only registration with shared Zod validation.
