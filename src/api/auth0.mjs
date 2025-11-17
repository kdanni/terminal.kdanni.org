import { auth } from 'express-oauth2-jwt-bearer';

function buildIssuerBaseURL() {
    if (process.env.AUTH0_ISSUER_BASE_URL) {
        return process.env.AUTH0_ISSUER_BASE_URL;
    }

    if (process.env.AUTH0_DOMAIN) {
        return `https://${process.env.AUTH0_DOMAIN}/`;
    }

    return undefined;
}

const issuerBaseURL = buildIssuerBaseURL();
const audience = process.env.AUTH0_AUDIENCE;

const missingConfig = [];
if (!issuerBaseURL) {
    missingConfig.push('AUTH0_ISSUER_BASE_URL or AUTH0_DOMAIN');
}
if (!audience) {
    missingConfig.push('AUTH0_AUDIENCE');
}

const baseAuthMiddleware = missingConfig.length === 0
    ? auth({
        audience,
        issuerBaseURL,
        tokenSigningAlg: 'RS256',
    })
    : (req, res, next) => {
        const error = new Error(`Missing Auth0 configuration: ${missingConfig.join(', ')}`);
        error.status = 500;
        next(error);
    };

export const requireAuth = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }

    return baseAuthMiddleware(req, res, next);
};

function normalizeRoles(payload) {
    const rolesClaim = process.env.AUTH0_ROLES_CLAIM;
    const roleValues = rolesClaim
        ? payload?.[rolesClaim]
        : payload?.roles ?? payload?.permissions ?? payload?.['https://schemas.auth0.com/roles'];

    return Array.isArray(roleValues) ? roleValues : [];
}

export function getAuth0User(req) {
    const payload = req.auth?.payload;

    if (!payload?.sub) {
        return null;
    }

    return {
        sub: payload.sub,
        name: payload.name ?? payload.nickname ?? [payload.given_name, payload.family_name].filter(Boolean).join(' ') || null,
        email: payload.email ?? null,
        picture: payload.picture ?? null,
        roles: normalizeRoles(payload),
    };
}
