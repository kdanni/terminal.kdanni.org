import { Link } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  path?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }): JSX.Element | null {
  if (!items.length) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="breadcrumbs-item">
              {item.path && !isLast ? (
                <Link to={item.path} className="breadcrumbs-link">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
