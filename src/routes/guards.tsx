import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAppSelector } from '@/store';
import { usePermissions } from '@/hooks';
import { EmptyState, Spinner } from '@/components/ui';

const FullPageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center text-brand-600">
    <Spinner size="lg" />
  </div>
);

/** Storefront routes that need a signed-in customer. */
export const RequireCustomer = ({ children }: { children: ReactNode }) => {
  const status = useAppSelector((state) => state.auth.status);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <FullPageLoader />;

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
};

/** Send already-signed-in customers away from the auth screens. */
export const RedirectIfCustomer = ({ children }: { children: ReactNode }) => {
  const status = useAppSelector((state) => state.auth.status);

  if (status === 'idle' || status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/account" replace />;

  return <>{children}</>;
};

/** Dashboard routes that need a signed-in admin or staff member. */
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const status = useAppSelector((state) => state.adminAuth.status);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <FullPageLoader />;

  if (status !== 'authenticated') {
    return (
      <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
    );
  }

  return <>{children}</>;
};

export const RedirectIfAdmin = ({ children }: { children: ReactNode }) => {
  const status = useAppSelector((state) => state.adminAuth.status);

  if (status === 'idle' || status === 'loading') return <FullPageLoader />;
  if (status === 'authenticated') return <Navigate to="/admin" replace />;

  return <>{children}</>;
};

/**
 * Hide a dashboard screen from staff who lack the permission. The API enforces
 * this too; this only keeps the UI honest.
 */
export const RequirePermission = ({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) => {
  const { canAny } = usePermissions();
  const required = Array.isArray(permission) ? permission : [permission];

  if (!canAny(...required)) {
    return (
      <EmptyState
        icon={<FiLock size={24} />}
        title="You do not have access to this area"
        message="Ask the super admin to grant you this permission if you need it."
      />
    );
  }

  return <>{children}</>;
};

/** Super-admin-only screens, such as staff management. */
export const RequireSuperAdmin = ({ children }: { children: ReactNode }) => {
  const { isSuperAdmin } = usePermissions();

  if (!isSuperAdmin) {
    return (
      <EmptyState
        icon={<FiLock size={24} />}
        title="Super admin only"
        message="Only the store owner can manage staff accounts and permissions."
      />
    );
  }

  return <>{children}</>;
};
