/**
 * Base Error class for the Agent DB SDK.
 */
export class AgentDbError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AgentDbError';
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    }
}

/**
 * Thrown when cryptographic verification or UCAN validation fails.
 */
export class AuthenticationError extends AgentDbError {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

/**
 * Thrown when an IPFS/Storacha upload or fetch network command fails.
 */
export class NetworkError extends AgentDbError {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Thrown when input validation (e.g., Zod schemas for DIDs or payloads) fails.
 */
export class ValidationError extends AgentDbError {
    public details?: unknown;
    
    constructor(message: string, details?: unknown) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}
/**
 * Thrown when storage-related operations fail.
 */
export class StorageError extends AgentDbError {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

/**
 * Thrown when a concurrency conflict (e.g., race condition in IPNS update) is detected.
 */
export class ConcurrencyError extends AgentDbError {
    constructor(message: string) {
        super(message);
        this.name = 'ConcurrencyError';
    }
}

/**
 * Result type for predictable error handling.
 */
export type Result<T, E = Error> = 
    | { ok: true; value: T }
    | { ok: false; error: E };
