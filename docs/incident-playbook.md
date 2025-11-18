# Frontend incident playbook

This playbook outlines how to respond when the deployed GUI is degraded or unavailable.

## 1) Validate the alert
- Check uptime monitoring (Pingdom/UptimeRobot or the configured heartbeat endpoint) for recent failures and timestamps.
- Open the site in an incognito window over HTTPS to rule out cached assets.
- Confirm the TLS certificate and hostname match to avoid mixed-content issues.

## 2) Review recent errors
- Open Sentry for the `terminal.kdanni.org` frontend project and filter by the current release or environment.
- Inspect Logtail for correlated client-side logs (`source=terminal-frontend`), paying attention to repeated network or CSP violations.
- Capture the request IDs, affected routes, and user agents.

## 3) Contain and mitigate
- If the incident is authentication-related, invalidate risky sessions and verify Auth0 status.
- Redeploy the static assets with the locked-down `_headers` file to ensure CSP/HSTS are applied.
- If a third-party dependency is failing, blocklist it in CSP and roll back to the last known-good release.

## 4) Communicate
- Post a status update in the incident channel every 15 minutes until resolved.
- Update the public status page with the scope (e.g., “asset catalog search degraded”), start time, and current mitigation.

## 5) Verify recovery
- Re-run the uptime check and validate the heartbeat endpoint accepts beacons.
- Confirm Sentry error volume has returned to baseline and no new Logtail errors are appearing.
- Perform a manual smoke test: login, global search, catalog filters, and watch list toggle.

## 6) Post-incident
- Record the timeline, root cause, and preventive fixes in the incident tracker.
- Add automated tests or monitoring rules that would have caught the issue sooner.
