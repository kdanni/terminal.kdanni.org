import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, useApiClient } from '../apiClient';
import { GlobalLoadingShell } from './GlobalLoadingShell';
import { logError } from '../errorReporting';
import type { AssetClassSummary } from '../types';
import './WelcomePage.css';

type WelcomePageProps = {
  apiBaseUrl: string;
};

export function WelcomePage({ apiBaseUrl }: WelcomePageProps): JSX.Element {
  const { fetchWithAuth } = useApiClient(apiBaseUrl);
  const [assetClasses, setAssetClasses] = useState<AssetClassSummary[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadAssetClasses = async (): Promise<void> => {
      if (!apiBaseUrl) {
        return;
      }

      setLoadingClasses(true);
      setClassError(null);

      try {
        const response = await fetchWithAuth(`${apiBaseUrl}/api/assets/classes`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new ApiError('Unable to load asset classes right now.', response.status);
        }

        const payload = (await response.json()) as { data?: AssetClassSummary[] };
        const data = Array.isArray(payload?.data) ? payload.data : [];

        if (isMounted) {
          setAssetClasses(data);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        logError(error as Error, { context: 'welcome-asset-classes' });

        const message =
          error instanceof ApiError
            ? error.message
            : 'We could not fetch asset classes from the catalog. Please try again shortly.';

        if (isMounted) {
          setClassError(message);
          setAssetClasses([]);
        }
      } finally {
        if (isMounted) {
          setLoadingClasses(false);
        }
      }
    };

    void loadAssetClasses();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [apiBaseUrl, fetchWithAuth]);

  const normalizedAssetClasses = useMemo(() => {
    const classDescriptions: Record<string, string> = {
      stock: 'Common and preferred shares with exchange coverage.',
      etf: 'Exchange-traded funds spanning equities, rates, and themes.',
      fund: 'Mutual funds and pooled vehicles.',
      fixed_income: 'Bonds and other rate-sensitive instruments.',
      commodity: 'Commodity exposures and reference prices.',
      forex: 'Base/quote currency pairs.',
      cryptocurrency: 'Digital asset pairs and spot listings.'
    };

    return assetClasses.map((entry) => {
      const assetType = entry.assetType?.toLowerCase() ?? '';
      const displayName = assetType
        ? assetType
            .replace(/[_-]/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            .trim()
        : 'Asset Class';

      return {
        assetType,
        displayName,
        totalLabel: typeof entry.total === 'number' ? `${entry.total.toLocaleString()} records` : 'Unknown size',
        description: classDescriptions[assetType] ?? 'Open the data table for this class.',
        path: `/catalog/classes/${encodeURIComponent(assetType || 'class')}`
      };
    });
  }, [assetClasses]);

  const hasClasses = normalizedAssetClasses.length > 0;

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
      <section className="asset-class-overview" aria-label="Asset class overview">
        <div className="overview-header">
          <p className="eyebrow">Asset catalog</p>
          <div>
            <h2>Asset Class overview</h2>
            <p className="lede">
              Browse the classes currently stored in the catalog and jump into their data tables.
            </p>
          </div>
        </div>
        {classError ? (
          <div role="alert" className="error-message">
            {classError}
          </div>
        ) : null}
        {loadingClasses ? (
          <GlobalLoadingShell visible message="Loading asset classes…" />
        ) : hasClasses ? (
          <div className="link-grid" role="list" aria-label="Asset classes">
            {normalizedAssetClasses.map((assetClass) => (
              <Link key={assetClass.assetType} className="link-card" to={assetClass.path} role="listitem">
                <span className="link-card-title">{assetClass.displayName}</span>
                <span className="link-card-subtitle">{assetClass.description}</span>
                <span className="link-card-meta">{assetClass.totalLabel}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="app-subtle">No asset classes are available yet. Seed the catalog to get started.</p>
        )}
      </section>
    </div>
  );
}
