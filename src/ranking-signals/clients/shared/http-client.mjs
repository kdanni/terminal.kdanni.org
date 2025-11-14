import got from 'got';

function sanitizeBaseUrl(value) {
    if (typeof value !== 'string') {
        throw new Error('HTTP client baseUrl must be a string.');
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error('HTTP client baseUrl must not be empty.');
    }

    return trimmed.replace(/\/+$/, '');
}

function sanitizeHeaders(headers) {
    const sanitized = {};
    if (!headers || typeof headers !== 'object') {
        return sanitized;
    }

    for (const [key, value] of Object.entries(headers)) {
        if (!value && value !== 0) {
            continue;
        }

        sanitized[key] = value;
    }

    return sanitized;
}

export function createHttpClient({ baseUrl, headers, timeout = 10000, retry = { limit: 1 } }) {
    const prefixUrl = sanitizeBaseUrl(baseUrl);
    const sanitizedHeaders = sanitizeHeaders(headers);

    return got.extend({
        prefixUrl,
        headers: sanitizedHeaders,
        timeout: {
            request: timeout
        },
        retry
    });
}
