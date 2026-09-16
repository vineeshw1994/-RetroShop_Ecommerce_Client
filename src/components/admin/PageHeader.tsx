import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi';

interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
}

const PageHeader = ({ title, description, actions, breadcrumbs }: PageHeaderProps) => (
  <header className="mb-6">
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-xs text-ink-500">
        {breadcrumbs.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <FiChevronRight size={12} className="text-ink-300" />}
            {crumb.to ? (
              <Link to={crumb.to} className="font-medium transition hover:text-brand-600">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink-400">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    )}

    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
);

export default PageHeader;
