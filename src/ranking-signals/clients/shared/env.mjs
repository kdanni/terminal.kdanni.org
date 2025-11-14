const MISSING_VALUE_ERROR = 'Environment variable name is required.';

function normalizeEnvValue(value) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

export function readEnvString(name) {
    if (!name || typeof name !== 'string') {
        throw new Error(MISSING_VALUE_ERROR);
    }

    return normalizeEnvValue(process.env[name]);
}

export function requireEnvString(name, message) {
    const value = readEnvString(name);

    if (!value) {
        throw new Error(message ?? `Missing required environment variable: ${name}`);
    }

    return value;
}

export function readEnvBoolean(name) {
    const value = readEnvString(name);

    if (value === undefined) {
        return undefined;
    }

    const normalized = value.toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
    }

    throw new Error(`Unable to convert environment variable ${name} to boolean. Expected true/false value.`);
}
