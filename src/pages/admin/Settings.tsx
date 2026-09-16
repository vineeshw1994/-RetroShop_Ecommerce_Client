import { useEffect, useState } from 'react';
import { FiSave, FiSettings } from 'react-icons/fi';
import { PageHeader } from '@/components/admin';
import { Button, ErrorState, Input, Skeleton } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { invalidateShopSettingsCache, useAsync, useDocumentTitle, usePermissions } from '@/hooks';
import { adminSettingsService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';

const Settings = () => {
  useDocumentTitle('Shop settings');

  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canUpdate = can('settings:update');

  const { data, loading, error, reload } = useAsync(() => adminSettingsService.get(), []);
  const [returnDays, setReturnDays] = useState('14');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.data) setReturnDays(String(data.data.returnDays));
  }, [data]);

  const handleSave = async () => {
    const days = Number(returnDays);
    if (!Number.isInteger(days) || days < 0 || days > 365) {
      dispatch(pushToast('Return days must be a whole number between 0 and 365', 'error'));
      return;
    }

    setSaving(true);
    try {
      await adminSettingsService.update({ returnDays: days });
      invalidateShopSettingsCache();
      dispatch(pushToast('Shop settings saved', 'success'));
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full max-w-xl" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Shop settings"
        description="Policies shown on the storefront and used when customers request returns."
      />

      <section className="card max-w-xl p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <FiSettings size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink-900">Return window</h2>
            <p className="mt-1 text-sm text-ink-500">
              How many days after delivery a customer can request a return. Set to 0 to hide the
              return button entirely.
            </p>

            <div className="mt-4 max-w-xs">
              <Input
                type="number"
                min={0}
                max={365}
                label="Return days"
                value={returnDays}
                onChange={(event) => setReturnDays(event.target.value)}
                disabled={!canUpdate}
                hint="Shown on product pages, footer, and the customer order detail screen."
              />
            </div>

            {canUpdate && (
              <Button
                className="mt-4"
                leftIcon={<FiSave size={14} />}
                loading={saving}
                onClick={handleSave}
              >
                Save settings
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
