import './WelcomePage.css';

type WelcomePageProps = {
  apiBaseUrl: string;
};

export function WelcomePage({ apiBaseUrl }: WelcomePageProps): JSX.Element {
  return (
    <div className="welcome-layout">
      <section className="welcome-hero">
        <p className="eyebrow">Terminal preview</p>
        <h1>Welcome to the next phase of terminal.kdanni.org</h1>
        <p className="lede">
          Auth0 login is ready to go. Future releases will layer on catalog, market coverage, and new tools. For now, enjoy a
          calm landing space built for wide screens.
        </p>
        <div className="meta-grid" aria-label="Deployment details">
          <div className="meta-card">
            <p className="meta-label">Authentication</p>
            <p className="meta-value">Auth0 login flow enabled</p>
          </div>
          <div className="meta-card">
            <p className="meta-label">Catalog endpoint</p>
            <p className="meta-value">{apiBaseUrl || 'API base not configured'}</p>
          </div>
          <div className="meta-card">
            <p className="meta-label">Status</p>
            <p className="meta-value">Incremental build scaffold</p>
          </div>
        </div>
      </section>
      <section className="welcome-panels" aria-label="What comes next">
        <article className="panel">
          <h2>Purpose-built foundation</h2>
          <p>
            This layout keeps things simple: a generous canvas, space for focused content, and nothing to distract from the
            login experience. It&apos;s the starting point for upcoming catalog and analytics modules.
          </p>
        </article>
        <article className="panel">
          <h2>Auth-first experience</h2>
          <p>
            Universal Login remains the core workflow. Use the header controls to sign in or out. Future releases will build on
            this secure backbone without reworking authentication.
          </p>
        </article>
        <article className="panel">
          <h2>Ready for expansion</h2>
          <p>
            Additional navigation and data views will drop into this wide layout as they come online. Until then, this welcome
            page keeps the deployment lightweight and stable.
          </p>
        </article>
      </section>
    </div>
  );
}
