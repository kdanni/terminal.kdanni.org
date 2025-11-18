# Auth Loop of Doom (Auth0 Redirect Loop)

This document describes the **Auth0 login redirect loop** (“auth loop of doom”) affecting our Vite front end deployed on Vercel with a Node.js (Express) REST API using Auth0-issued JWTs.

The goal is to:

- Explain the issue and common root causes.
- Document the required **Auth0 Admin Console** configuration.
- Document **Auth0 SDK** parameters and related **environment variables** for all environments (local / preview / production).

---

## 1. Summary of the Issue

### Symptoms

- After clicking **Login**, the browser:
  - Redirects to Auth0’s hosted login page.
  - Auth succeeds and redirects back to our app.
  - The front end *immediately* sends the user back to Auth0 again.
- The URL bar alternates between:
  - `https://<tenant>.auth0.com/authorize?...`
  - `https://<our-app>.vercel.app/...`
- The user never sees the authenticated app state.

### Typical Root Causes

1. **Redirect URL mismatch**  
   `redirect_uri` from the front end is **not exactly** in the Auth0 “Allowed Callback URLs” list.

2. **Missing / misconfigured Web Origins / CORS**  
   The front end origin (e.g. `https://our-app.vercel.app`) is not present in “Allowed Web Origins” or “Allowed CORS Origins”.

3. **Over-eager auth guards in the SPA**  
   The app calls `loginWithRedirect()` before the Auth0 SDK has finished processing the callback, repeatedly kicking the user out.

4. **Broken environment variables**  
   Wrong `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, or `VITE_AUTH0_REDIRECT_URI` in Vercel environment.

---

## 2. Architecture Overview (Relevant Parts)

- **Front end**: Vite SPA hosted on Vercel  
  - Uses Auth0 SPA SDK (e.g. `@auth0/auth0-spa-js` or `@auth0/auth0-react`).  
  - Obtains an **ID token** and **access token (JWT)**.

- **Back end**: Node.js + Express REST API  
  - Protected endpoints require a valid Auth0 **access token (JWT)** in the `Authorization: Bearer <token>` header.  
  - JWT validated by Auth0 libraries or `express-jwt` / `jwks-rsa`.

- **Auth Provider**: Auth0  
  - Standard SPA application for the front end.  
  - (Optional) separate M2M or API configuration for back-end audience.

---

## 3. Auth0 Admin Console Configuration

In Auth0 Dashboard → **Applications** → **Applications** → `<Our Vite SPA>` → **Settings**.

We manage **three types of domains**:

- **Local dev**: `http://localhost:5173` (Vite default)  
- **Preview** (Vercel branches): `https://<branch>-<project>.vercel.app`  
- **Production**: `https://<project>.vercel.app` or custom domain

### 3.1 Application Type

- **Application Type**: `Single Page Application`
- **Token Endpoint Authentication Method**: `None` (common for SPA)

### 3.2 Allowed Callback URLs

These are the exact URLs that Auth0 is allowed to redirect the user back to after login.

Examples:

```text
http://localhost:5173
https://<project>.vercel.app
https://<branch>-<project>.vercel.app
```

Rules:
- Must match the redirect_uri used by the SPA (string match, excluding query/hash).
- If we use a dedicated callback route (e.g. /callback), then include that path:
```text
http://localhost:5173/callback
https://<project>.vercel.app/callback
```

### 3.3 Allowed Logout URLs
Where Auth0 can redirect after logout:
```text
http://localhost:5173
https://<project>.vercel.app
```


### 3.4 Allowed Web Origins
Define valid JS origins that can call Auth0 APIs (e.g. silent auth, refresh tokens).

Must include:
```text
http://localhost:5173
https://<project>.vercel.app
https://<branch>-<project>.vercel.app
```

Note: These are origins, not full URLs. No path, no trailing slash needed.

### 3.5 Allowed CORS Origins
For some flows, Auth0 checks CORS origins too.

Add the same origins:
```text
http://localhost:5173
https://<project>.vercel.app
https://<branch>-<project>.vercel.app
```

### 3.6 APIs / Audience (Back-end)
In Auth0 Dashboard → APIs → <Our API>:

Identifier (used as audience): e.g. https://api.our-app.com

The front end must request this audience to get an access token for the back end.

## 4 Auth0 SDK Configuration (Vite SPA)
We assume usage of @auth0/auth0-spa-js or @auth0/auth0-react. The core config is the same.

### 4.1 SDK Initialization (Example)
```ts
import { createAuth0Client } from '@auth0/auth0-spa-js';

const auth0Client = await createAuth0Client({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri:
      import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
  cacheLocation: import.meta.env.VITE_AUTH0_CACHE_LOCATION || 'memory',
  useRefreshTokens:
    import.meta.env.VITE_AUTH0_USE_REFRESH_TOKENS === 'true',
});
```

Important:
- `redirect_uri` must exactly match one of the entries in Allowed Callback URLs.
- `window.location.origin` will be:
  - `http://localhost:5173` in dev
  - `https://<project>.vercel.app` in production

If we override `VITE_AUTH0_REDIRECT_URI`, that value must also be in the Allowed Callback URLs list.

### 4.2 Guard Logic (Avoiding the Loop)

A common redirect loop cause is something like:
```ts
if (!isAuthenticated) {
  loginWithRedirect();
}
```


called too early.

Correct pattern (pseudo-code):
```ts
if (!isLoading && !isAuthenticated && !hasTriedLogin) {
  loginWithRedirect();
}
```

Where:
- isLoading is provided by the SDK (e.g. useAuth0 hook).
- hasTriedLogin is an app-level flag so we don’t continuously re-trigger login.


## 5. Environment Variables
### 5.1 Front End (Vite / Vercel)

These environment variables are used in the SPA. In Vercel they must start with VITE_ to be exposed to the browser bundle.

Local .env.local:

```env
VITE_AUTH0_DOMAIN=dev-xxxx.eu.auth0.com
VITE_AUTH0_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
VITE_AUTH0_AUDIENCE=https://api.our-app.com

# Optional overrides
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
VITE_AUTH0_CACHE_LOCATION=localstorage
VITE_AUTH0_USE_REFRESH_TOKENS=true
```

Vercel Environment Variables (Production):
```env
VITE_AUTH0_DOMAIN=prod-xxxx.eu.auth0.com
VITE_AUTH0_CLIENT_ID=yyyyyyyyyyyyyyyyyyyy
VITE_AUTH0_AUDIENCE=https://api.our-app.com
VITE_AUTH0_REDIRECT_URI=https://<project>.vercel.app
VITE_AUTH0_CACHE_LOCATION=localstorage
VITE_AUTH0_USE_REFRESH_TOKENS=true
```

Preview environments can either:
- Reuse production tenant configuration, or
- Have dedicated preview values (but must be consistent with Auth0 settings).

### 5.2 Back End (Node / Express)

Back-end only environment (not exposed to browser):
```env
AUTH0_DOMAIN=prod-xxxx.eu.auth0.com
AUTH0_AUDIENCE=https://api.our-app.com
AUTH0_ISSUER=https://prod-xxxx.eu.auth0.com/
```

The Express API uses these to validate access tokens:
- iss (issuer) must match AUTH0_ISSUER.
- aud (audience) must match AUTH0_AUDIENCE.

##  6. Common Redirect Loop Patterns
### 6.1 Mismatched redirect_uri
- SPA uses window.location.origin → https://<project>.vercel.app
- Auth0 settings only contain:
  - `https://<project>.vercel.app/` with a trailing slash, or
  - `https://<project>.vercel.app/callback`
- Result: Auth0 treats the redirect as invalid, login fails, SDK thinks user is unauthenticated and retries login.

Fix: Make sure the exact redirect URI is in the callback URL list and used consistently.

### 6.2 Missing Web Origin
- Callback URL is allowed.
- But Web Origin https://<project>.vercel.app is not in Allowed Web Origins.
- Silent authentication / token refresh fails → SDK re-triggers login.

### 6.3 Over-eager Login Trigger
- Guard logic re-calls loginWithRedirect() on the callback route while the SDK is still processing the token.
- Every time the SPA mounts, it triggers a login again.

### 6.4 Broken Env in Production
- Local dev works fine.
- On Vercel, VITE_AUTH0_DOMAIN or VITE_AUTH0_CLIENT_ID is missing or incorrect.
- SDK initialization fails quietly and isAuthenticated stays false, causing re-login attempts.

---


## 7. Debugging Checklist
- Check Auth0 Settings
  - Application Type = SPA
  - Allowed Callback URLs include the exact redirect URI.
  - Allowed Web Origins and Allowed CORS Origins include all relevant origins.
- Check SDK Config
  - redirect_uri in code matches allowed URLs.
  - audience matches the API Identifier.
- Check Guard Logic
  - Don’t call loginWithRedirect while auth is still loading.
  - Ensure you don’t trigger login on the callback route once tokens are processed.
- Check Env Variables
  - On Vercel, verify VITE_AUTH0_* values, redeploy after changes.
  - On the back end, ensure AUTH0_DOMAIN / AUTH0_AUDIENCE / AUTH0_ISSUER are correct.
- Check Browser Dev Tools
  - Repeated authorize calls to Auth0 → sign of a loop.
  - Console error messages about disallowed origins or invalid redirect URLs.

