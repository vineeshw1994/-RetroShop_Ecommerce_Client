import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiAlertTriangle,
  FiCheck,
  FiCopy,
  FiEdit2,
  FiKey,
  FiInfo,
  FiLock,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiUploadCloud,
  FiUsers,
} from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { adminStaffService, type StaffInput } from '@/services/admin.service';
import { ApiError, getErrorMessage } from '@/lib/api';
import { formatDateTime, formatRelative, initials, permissionActionLabel } from '@/lib/format';
import cn from '@/lib/cn';
import {
  useAsync,
  useDebounce,
  useDocumentTitle,
  usePermissions,
  useQueryFilters,
} from '@/hooks';
import { DataTable, FilterToolbar, PageHeader, type Column } from '@/components/admin';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Input,
  Modal,
  Pagination,
  Select,
  SmartImage,
  Switch,
  type SelectOption,
} from '@/components/ui';
import type { AdminUser, PermissionModule } from '@/types';

const PAGE_SIZE = 20;

/* Module scope: `useQueryFilters` memoises on this object identity. */
const STAFF_DEFAULTS = {
  page: '1',
  search: '',
  role: '',
  status: '',
};

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'super_admin', label: 'Super admin' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Disabled' },
];

const SESSION_NOTICE =
  'Changing permissions or disabling an account signs that person out of the dashboard immediately.';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter their full name').max(120, 'Name is too long'),
  email: z.string().trim().min(1, 'An email is required').email('Enter a valid email address'),
  phone: z.string().trim().max(32, 'Phone number is too long'),
  jobTitle: z.string().trim().max(120, 'Job title is too long'),
  role: z.enum(['staff', 'super_admin']),
  password: z
    .string()
    .refine((value) => value === '' || value.length >= 8, 'Use at least 8 characters'),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  role: 'staff',
  password: '',
  isActive: true,
};

const FORM_FIELDS = Object.keys(EMPTY_VALUES) as (keyof FormValues)[];

const isFormField = (field: string): field is keyof FormValues =>
  (FORM_FIELDS as string[]).includes(field);

const permissionKey = (moduleKey: string, action: string) => `${moduleKey}:${action}`;

interface MatrixProps {
  modules: PermissionModule[];
  selected: string[];
  fullAccess: boolean;
  disabled: boolean;
  disabledNote?: string;
  onChange: (next: string[]) => void;
  onFullAccessChange: (next: boolean) => void;
}

const PermissionMatrix = ({
  modules,
  selected,
  fullAccess,
  disabled,
  disabledNote,
  onChange,
  onFullAccessChange,
}: MatrixProps) => {
  const everything = disabled || fullAccess;

  const toggle = (key: string) =>
    onChange(
      selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key]
    );

  const toggleModule = (module: PermissionModule, next: boolean) => {
    const keys = module.actions.map((action) => permissionKey(module.key, action));
    onChange(
      next
        ? [...selected.filter((entry) => !keys.includes(entry)), ...keys]
        : selected.filter((entry) => !keys.includes(entry))
    );
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3">
        <Switch
          checked={everything}
          disabled={disabled}
          onChange={onFullAccessChange}
          label="Grant full access"
          description="Every module, including anything added to the dashboard later."
        />
      </div>

      {disabledNote && (
        <p className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
          <FiInfo className="mt-0.5 shrink-0" size={13} />
          {disabledNote}
        </p>
      )}

      <div className="space-y-3">
        {modules.map((module) => {
          const keys = module.actions.map((action) => permissionKey(module.key, action));
          const allOn = everything || keys.every((key) => selected.includes(key));

          return (
            <fieldset
              key={module.key}
              className={cn(
                'rounded-xl border border-ink-200 px-4 py-3',
                everything && 'opacity-70'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <legend className="contents">
                  <span>
                    <span className="block text-sm font-bold text-ink-900">{module.label}</span>
                    <span className="block text-xs text-ink-500">{module.description}</span>
                  </span>
                </legend>

                <button
                  type="button"
                  disabled={everything}
                  onClick={() => toggleModule(module, !allOn)}
                  className="shrink-0 text-xs font-bold text-brand-600 transition hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-400"
                >
                  {allOn ? 'Clear module' : 'Select all'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {module.actions.map((action) => {
                  const key = permissionKey(module.key, action);
                  return (
                    <Checkbox
                      key={key}
                      checked={everything || selected.includes(key)}
                      disabled={everything}
                      onChange={() => toggle(key)}
                      label={permissionActionLabel(action)}
                    />
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
};

const TemporaryPasswordPanel = ({ password }: { password: string }) => {
  const dispatch = useAppDispatch();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      dispatch(pushToast('Could not copy — select the password and copy it manually', 'error'));
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
        <FiAlertTriangle className="mt-0.5 shrink-0" size={15} />
        This temporary password is shown once and cannot be retrieved again.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 select-all rounded-lg border border-amber-200 bg-white px-3 py-2.5 font-mono text-sm font-bold tracking-wide text-ink-900">
          {password}
        </code>
        <Button
          type="button"
          variant={copied ? 'success' : 'dark'}
          size="sm"
          onClick={() => void copy()}
          leftIcon={copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <p className="mt-3 text-xs text-amber-800">
        They have also been emailed a copy and will be asked to change it the first time they sign
        in.
      </p>
    </div>
  );
};

const Staff = () => {
  useDocumentTitle('Staff & access');

  const dispatch = useAppDispatch();
  const { admin } = usePermissions();
  const { filters, setFilter, resetFilters } = useQueryFilters(STAFF_DEFAULTS);

  const [searchTerm, setSearchTerm] = useState(filters.search);
  const debouncedSearch = useDebounce(searchTerm.trim(), 400);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [fullAccess, setFullAccess] = useState(false);

  const [permissionsTarget, setPermissionsTarget] = useState<AdminUser | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [temporaryPassword, setTemporaryPassword] = useState<{
    name: string;
    password: string;
  } | null>(null);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilter({ search: debouncedSearch });
  }, [debouncedSearch, filters.search, setFilter]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const catalogue = useAsync(async () => (await adminStaffService.permissionCatalogue()).data, []);

  const page = Number(filters.page) || 1;

  const { data, loading, error, reload } = useAsync(
    () =>
      adminStaffService.list({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
      }),
    [page, debouncedSearch, filters.role, filters.status]
  );

  const rows = data?.data || [];
  const meta = data?.meta;
  const modules = catalogue.data?.modules || [];

  const totalPermissions = useMemo(
    () => modules.reduce((count, module) => count + module.actions.length, 0),
    [modules]
  );

  const moduleLabels = useMemo(
    () =>
      modules.reduce<Record<string, string>>((all, module) => {
        all[module.key] = module.label;
        return all;
      }, {}),
    [modules]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  const role = watch('role');
  const isActive = watch('isActive');
  const isSelf = Boolean(editing && admin && editing.id === admin.id);
  const isSuperAdminRole = role === 'super_admin';

  const openCreate = () => {
    setEditing(null);
    setAvatarFile(null);
    setPermissions(catalogue.data?.defaults || []);
    setFullAccess(false);
    reset(EMPTY_VALUES);
    setEditorOpen(true);
  };

  const openEdit = (staff: AdminUser) => {
    setEditing(staff);
    setAvatarFile(null);
    setPermissions(staff.permissions || []);
    setFullAccess(staff.role === 'super_admin');
    reset({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      jobTitle: staff.jobTitle || '',
      role: staff.role,
      password: '',
      isActive: staff.isActive,
    });
    setEditorOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload: Partial<StaffInput> = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      jobTitle: values.jobTitle,
    };

    // The API refuses these for your own account, so never send them.
    if (!isSelf) {
      payload.role = values.role;
      payload.isActive = values.isActive;

      if (values.role === 'super_admin') payload.fullAccess = true;
      else {
        payload.fullAccess = fullAccess;
        if (!fullAccess) payload.permissions = permissions;
      }
    }

    if (values.password !== '') payload.password = values.password;

    try {
      if (editing) {
        await adminStaffService.update(editing.id, payload, avatarFile);
        dispatch(pushToast(`${values.name} updated`, 'success'));
      } else {
        const response = await adminStaffService.create(payload as StaffInput, avatarFile);
        dispatch(pushToast(`${values.name} can now sign in to the dashboard`, 'success'));

        if (response.data.temporaryPassword) {
          setTemporaryPassword({
            name: values.name,
            password: response.data.temporaryPassword,
          });
        }
      }

      setEditorOpen(false);
      setAvatarFile(null);
      await reload();
    } catch (caught) {
      if (caught instanceof ApiError && caught.fieldErrors.length) {
        caught.fieldErrors.forEach(({ field, message }) => {
          if (isFormField(field)) setError(field, { type: 'server', message });
        });
      }
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const openPermissions = (staff: AdminUser) => {
    setPermissions(staff.permissions || []);
    setFullAccess(staff.role === 'super_admin');
    setPermissionsTarget(staff);
  };

  const handleSavePermissions = async () => {
    if (!permissionsTarget) return;

    setSavingPermissions(true);
    try {
      await adminStaffService.setPermissions(permissionsTarget.id, {
        fullAccess,
        permissions: fullAccess ? undefined : permissions,
      });
      dispatch(
        pushToast(`Access updated for ${permissionsTarget.name}, their session was ended`, 'success')
      );
      setPermissionsTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;

    setResetting(true);
    try {
      const response = await adminStaffService.resetPassword(resetTarget.id);
      setTemporaryPassword({
        name: resetTarget.name,
        password: response.data.temporaryPassword,
      });
      dispatch(pushToast(`A temporary password was issued for ${resetTarget.name}`, 'success'));
      setResetTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await adminStaffService.remove(deleteTarget.id);
      dispatch(pushToast(`${deleteTarget.name} no longer has dashboard access`, 'success'));
      setDeleteTarget(null);
      await reload();
    } catch (caught) {
      // The API refuses to remove the last super admin: show exactly why.
      setDeleteError(getErrorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = (['search', 'role', 'status'] as const).filter(
    (key) => filters[key] !== STAFF_DEFAULTS[key]
  ).length;

  const permissionSummary = (staff: AdminUser) => {
    if (staff.role === 'super_admin') {
      return (
        <span>
          <Badge tone="brand">Full access</Badge>
          <span className="mt-1 block text-xs text-ink-400">Every module</span>
        </span>
      );
    }

    const granted = staff.permissions || [];
    const moduleNames = Array.from(
      new Set(granted.map((entry) => moduleLabels[entry.split(':')[0]]).filter(Boolean))
    );

    return (
      <span title={moduleNames.join(', ')}>
        <span className="block text-sm font-semibold text-ink-800">
          {granted.length} of {totalPermissions || '—'} permissions
        </span>
        <span className="mt-0.5 block max-w-[220px] truncate text-xs text-ink-400">
          {moduleNames.length ? moduleNames.join(', ') : 'No modules yet'}
        </span>
      </span>
    );
  };

  const personCell = (staff: AdminUser) => (
    <div className="flex min-w-0 items-center gap-3">
      {staff.avatar ? (
        <SmartImage
          src={staff.avatar}
          alt={staff.name}
          wrapperClassName="h-10 w-10 shrink-0 rounded-full"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
          {initials(staff.name)}
        </span>
      )}

      <div className="min-w-0">
        <p className="truncate font-semibold text-ink-900">
          {staff.name}
          {admin?.id === staff.id && (
            <span className="ml-2 text-xs font-medium text-ink-400">(you)</span>
          )}
        </p>
        <p className="truncate text-xs text-ink-400">{staff.jobTitle || 'No job title'}</p>
      </div>
    </div>
  );

  const actionButtons = (staff: AdminUser) => {
    const own = admin?.id === staff.id;

    return (
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => openEdit(staff)}
          title="Edit"
          aria-label={`Edit ${staff.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <FiEdit2 size={15} />
        </button>

        {!own && (
          <button
            type="button"
            onClick={() => openPermissions(staff)}
            title="Permissions"
            aria-label={`Change permissions for ${staff.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-brand-50 hover:text-brand-600"
          >
            <FiShield size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setResetTarget(staff)}
          title="Reset password"
          aria-label={`Reset the password for ${staff.name}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
        >
          <FiKey size={15} />
        </button>

        {!own && (
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteTarget(staff);
            }}
            title="Remove"
            aria-label={`Remove ${staff.name}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <FiTrash2 size={15} />
          </button>
        )}
      </span>
    );
  };

  const columns = useMemo<Column<AdminUser>[]>(
    () => [
      { key: 'person', header: 'Person', render: personCell },
      {
        key: 'email',
        header: 'Email',
        hideBelow: 'lg',
        render: (staff) => <span className="text-ink-600">{staff.email}</span>,
      },
      {
        key: 'role',
        header: 'Role',
        render: (staff) => (
          <Badge tone={staff.role === 'super_admin' ? 'brand' : 'neutral'}>
            {staff.role === 'super_admin' ? 'Super admin' : 'Staff'}
          </Badge>
        ),
      },
      { key: 'permissions', header: 'Access', hideBelow: 'md', render: permissionSummary },
      {
        key: 'status',
        header: 'Status',
        render: (staff) => (
          <Badge tone={staff.isActive ? 'success' : 'danger'} dot>
            {staff.isActive ? 'Active' : 'Disabled'}
          </Badge>
        ),
      },
      {
        key: 'lastLogin',
        header: 'Last login',
        hideBelow: 'lg',
        render: (staff) => (
          <span className="whitespace-nowrap text-ink-600">
            {staff.lastLoginAt ? formatRelative(staff.lastLoginAt) : 'Never'}
          </span>
        ),
      },
      {
        key: 'createdBy',
        header: 'Added by',
        hideBelow: 'lg',
        render: (staff) => (
          <span className="text-xs text-ink-500">
            <span className="block">{staff.createdBy?.name || '—'}</span>
            <span className="block text-ink-400">{formatDateTime(staff.createdAt)}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        header: <span className="sr-only">Actions</span>,
        headerClassName: 'text-right',
        className: 'text-right',
        render: actionButtons,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [admin?.id, moduleLabels, totalPermissions]
  );

  const matrixDisabledNote = isSelf
    ? 'You cannot change your own role, access or active flag. Ask another super admin to do it.'
    : isSuperAdminRole
      ? 'Super admins implicitly hold every permission, so the matrix is locked on.'
      : undefined;

  return (
    <div>
      <PageHeader
        title="Staff & access"
        description="Staff cannot sign themselves up. Create each account here and tick exactly the features they need."
        breadcrumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Staff & access' }]}
        actions={
          <Button onClick={openCreate} leftIcon={<FiUserPlus size={16} />}>
            Add staff
          </Button>
        }
      />

      <p className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <FiInfo className="mt-0.5 shrink-0" size={15} />
        <span>{SESSION_NOTICE}</span>
      </p>

      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search name, email or job title…"
        activeCount={activeCount}
        onReset={() => {
          setSearchTerm('');
          resetFilters();
        }}
      >
        <Select
          aria-label="Filter by role"
          options={ROLE_OPTIONS}
          placeholder="All roles"
          value={filters.role}
          onChange={(event) => setFilter({ role: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-40"
        />
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          placeholder="Any status"
          value={filters.status}
          onChange={(event) => setFilter({ status: event.target.value })}
          className="h-10 w-full py-0 text-sm sm:w-36"
        />
      </FilterToolbar>

      {error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(staff) => staff.id}
            loading={loading}
            emptyTitle="No staff match these filters"
            emptyMessage="Add a colleague and choose which parts of the dashboard they can open."
            emptyAction={{ label: 'Add staff', onClick: openCreate }}
            renderMobileCard={(staff) => (
              <div className="card p-3">
                {personCell(staff)}

                <p className="mt-2 truncate text-xs text-ink-500">{staff.email}</p>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone={staff.role === 'super_admin' ? 'brand' : 'neutral'}>
                    {staff.role === 'super_admin' ? 'Super admin' : 'Staff'}
                  </Badge>
                  <Badge tone={staff.isActive ? 'success' : 'danger'} dot>
                    {staff.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                  <span className="text-xs text-ink-400">
                    {staff.role === 'super_admin'
                      ? 'Full access'
                      : `${(staff.permissions || []).length} permissions`}
                  </span>
                </div>

                <p className="mt-2 text-xs text-ink-400">
                  Last login {staff.lastLoginAt ? formatRelative(staff.lastLoginAt) : 'never'}
                </p>

                <div className="mt-3 border-t border-ink-100 pt-3">{actionButtons(staff)}</div>
              </div>
            )}
          />

          <Pagination
            meta={meta}
            className="mt-5"
            onPageChange={(next) => setFilter({ page: next }, false)}
          />
        </>
      )}

      {/* Create / edit */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editing ? `Edit ${editing.name}` : 'Add a staff member'}
        description={
          editing
            ? 'Update their details and the features they can reach.'
            : 'They will receive an email with their sign-in details.'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button form="staff-form" type="submit" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Create account'}
            </Button>
          </>
        }
      >
        <form id="staff-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              {...register('name')}
              label="Full name"
              required
              placeholder="Full name"
              error={errors.name?.message}
            />
            <Input
              {...register('email')}
              type="email"
              label="Email address"
              required
              placeholder="priya@retroshop.co.uk"
              hint="This is their dashboard username."
              error={errors.email?.message}
            />
            <Input
              {...register('phone')}
              type="tel"
              label="Phone"
              placeholder="+44 7700 900123"
              error={errors.phone?.message}
            />
            <Input
              {...register('jobTitle')}
              label="Job title"
              placeholder="Shop floor manager"
              error={errors.jobTitle?.message}
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-700">Photo</p>
            <div className="flex items-center gap-3">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Selected photo"
                  className="h-14 w-14 shrink-0 rounded-full border border-ink-100 object-cover"
                />
              ) : editing?.avatar ? (
                <SmartImage
                  src={editing.avatar}
                  alt={editing.name}
                  wrapperClassName="h-14 w-14 shrink-0 rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400">
                  <FiUsers size={20} />
                </span>
              )}

              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50">
                <FiUploadCloud size={15} />
                {avatarFile ? 'Change photo' : 'Choose photo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                />
              </label>

              {avatarFile && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setAvatarFile(null)}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-2">
            <Select
              {...register('role')}
              label="Role"
              options={ROLE_OPTIONS}
              disabled={isSelf}
              hint={
                isSelf
                  ? 'You cannot change your own role.'
                  : 'Super admins can do everything, including managing staff.'
              }
              error={errors.role?.message}
            />

            <Input
              {...register('password')}
              type="password"
              label={editing ? 'New password' : 'Password'}
              autoComplete="new-password"
              placeholder="Leave blank to email a temporary one"
              leftIcon={<FiLock size={15} />}
              hint={
                editing
                  ? 'Leave blank to keep their current password.'
                  : 'Leave blank and we will email a temporary password, shown to you once.'
              }
              error={errors.password?.message}
            />
          </div>

          <div className="rounded-xl border border-ink-200 px-4 py-3">
            <Switch
              checked={isActive}
              disabled={isSelf}
              onChange={(next) => setValue('isActive', next, { shouldDirty: true })}
              label="Account active"
              description={
                isSelf
                  ? 'You cannot disable your own account.'
                  : 'Disabling an account signs that person out straight away.'
              }
            />
          </div>

          <div className="border-t border-ink-100 pt-4">
            <h3 className="text-sm font-bold text-ink-900">What can they use?</h3>
            <p className="mb-3 mt-0.5 text-xs text-ink-500">{SESSION_NOTICE}</p>

            {catalogue.loading ? (
              <p className="text-sm text-ink-500">Loading the permission list…</p>
            ) : catalogue.error ? (
              <ErrorState message={catalogue.error} onRetry={catalogue.reload} />
            ) : (
              <PermissionMatrix
                modules={modules}
                selected={permissions}
                fullAccess={fullAccess}
                disabled={isSelf || isSuperAdminRole}
                disabledNote={matrixDisabledNote}
                onChange={setPermissions}
                onFullAccessChange={setFullAccess}
              />
            )}
          </div>
        </form>
      </Modal>

      {/* Permissions only */}
      <Modal
        open={Boolean(permissionsTarget)}
        onClose={() => setPermissionsTarget(null)}
        size="lg"
        title={`Access for ${permissionsTarget?.name || 'this person'}`}
        description={SESSION_NOTICE}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setPermissionsTarget(null)}
              disabled={savingPermissions}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSavePermissions()} loading={savingPermissions}>
              Save access
            </Button>
          </>
        }
      >
        <PermissionMatrix
          modules={modules}
          selected={permissions}
          fullAccess={fullAccess}
          disabled={permissionsTarget?.role === 'super_admin'}
          disabledNote={
            permissionsTarget?.role === 'super_admin'
              ? 'Super admins implicitly hold every permission. Change their role to staff first to pick individual features.'
              : undefined
          }
          onChange={setPermissions}
          onFullAccessChange={setFullAccess}
        />
      </Modal>

      {/* Temporary password */}
      <Modal
        open={Boolean(temporaryPassword)}
        onClose={() => setTemporaryPassword(null)}
        title={`Temporary password for ${temporaryPassword?.name || 'this account'}`}
        footer={
          <Button onClick={() => setTemporaryPassword(null)}>I have saved it</Button>
        }
      >
        {temporaryPassword && <TemporaryPasswordPanel password={temporaryPassword.password} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        onConfirm={handleResetPassword}
        loading={resetting}
        tone="primary"
        title={`Reset the password for ${resetTarget?.name || 'this account'}?`}
        message="Their current password stops working right away. We will show you a temporary one to pass on, and they will be asked to change it when they next sign in."
        confirmLabel="Reset password"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Remove ${deleteTarget?.name || 'this person'}?`}
        message={
          <>
            <p>
              They lose dashboard access immediately and any open session is ended. The last
              remaining super admin cannot be removed.
            </p>

            {deleteError && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
                <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
                {deleteError}
              </p>
            )}
          </>
        }
        confirmLabel="Remove access"
      />
    </div>
  );
};

export default Staff;
