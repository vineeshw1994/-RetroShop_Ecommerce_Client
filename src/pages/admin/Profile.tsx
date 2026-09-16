import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FiAlertTriangle,
  FiCheck,
  FiLock,
  FiShield,
  FiUpload,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { PageHeader } from '@/components/admin';
import { Badge, Button, Input, SmartImage } from '@/components/ui';
import { useAppDispatch } from '@/store';
import { adminLogout, setAdmin } from '@/store/slices/adminAuthSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle, usePermissions } from '@/hooks';
import { adminProfileService } from '@/services/admin.service';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime, initials, permissionActionLabel } from '@/lib/format';
import cn from '@/lib/cn';

const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(30, 'That phone number looks too long'),
  jobTitle: z.string().trim().max(80, 'Keep the job title under 80 characters'),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[a-z]/, 'Add a lowercase letter')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/\d/, 'Add a number'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Both passwords must match',
    path: ['confirmPassword'],
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { key: 'lower', label: 'A lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { key: 'upper', label: 'An uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'number', label: 'A number', test: (value: string) => /\d/.test(value) },
];

const Profile = () => {
  useDocumentTitle('My profile');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { admin, modules, isSuperAdmin } = usePermissions();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', phone: '', jobTitle: '' },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const { reset: resetProfile } = profileForm;
  const newPassword = passwordForm.watch('newPassword') || '';

  useEffect(() => {
    if (!admin) return;
    resetProfile({
      name: admin.name,
      email: admin.email,
      phone: admin.phone ?? '',
      jobTitle: admin.jobTitle ?? '',
    });
  }, [admin, resetProfile]);

  // Object URLs leak unless revoked when the preview is replaced.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  if (!admin) return null;

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Choose a JPG, PNG or WebP image.');
      setAvatarFile(null);
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('That image is larger than 2 MB.');
      setAvatarFile(null);
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveProfile = async (values: ProfileValues) => {
    try {
      let updated = (await adminProfileService.update(values)).data.admin;

      if (avatarFile) {
        updated = (await adminProfileService.updateAvatar(avatarFile)).data.admin;
        clearAvatar();
      }

      dispatch(setAdmin(updated));
      dispatch(pushToast('Profile updated', 'success'));
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const savePassword = async (values: PasswordValues) => {
    try {
      await adminProfileService.changePassword(values);
      dispatch(pushToast('Password changed — please sign in again', 'success'));
      await dispatch(adminLogout());
      navigate('/admin/login');
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const grantedByModule = modules
    .map((module) => ({
      ...module,
      granted: module.actions.filter((action) =>
        admin.permissions.includes(`${module.key}:${action}`)
      ),
    }))
    .filter((module) => module.granted.length > 0);

  return (
    <div>
      <PageHeader
        title="My profile"
        description="Your details, password and access level"
        actions={
          <Badge tone={isSuperAdmin ? 'brand' : 'neutral'}>
            {isSuperAdmin ? 'Super admin' : 'Staff'}
          </Badge>
        }
      />

      {admin.mustChangePassword && (
        <div className="mb-4 flex gap-3 rounded-[--radius-card] border border-amber-200 bg-amber-50 p-4">
          <FiAlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-900">Set your own password</p>
            <p className="mt-0.5 text-sm text-amber-700">
              You are still signed in with a temporary password. Choose a new one below before you
              carry on.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-ink-900">
            <FiUser size={15} className="text-ink-400" />
            Identity
          </h2>

          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="New avatar preview"
                  className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-brand-500"
                />
              ) : admin.avatar ? (
                <SmartImage
                  src={admin.avatar}
                  alt={admin.name}
                  wrapperClassName="h-20 w-20 shrink-0 rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xl font-bold text-white">
                  {initials(admin.name)}
                </span>
              )}

              <div className="min-w-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_AVATAR_TYPES.join(',')}
                  className="hidden"
                  onChange={(event) => pickAvatar(event.target.files?.[0])}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<FiUpload size={14} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose photo
                  </Button>

                  {avatarFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<FiX size={14} />}
                      onClick={clearAvatar}
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-ink-500">JPG, PNG or WebP, up to 2 MB.</p>
                {avatarError && (
                  <p className="mt-1 text-xs font-medium text-brand-600">{avatarError}</p>
                )}
                {avatarFile && !avatarError && (
                  <p className="mt-1 truncate text-xs text-ink-500">
                    {avatarFile.name} — saved when you press Save changes.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                required
                error={profileForm.formState.errors.name?.message}
                {...profileForm.register('name')}
              />
              <Input
                label="Email"
                type="email"
                required
                error={profileForm.formState.errors.email?.message}
                {...profileForm.register('email')}
              />
              <Input
                label="Phone"
                type="tel"
                error={profileForm.formState.errors.phone?.message}
                {...profileForm.register('phone')}
              />
              <Input
                label="Job title"
                placeholder="e.g. Store manager"
                error={profileForm.formState.errors.jobTitle?.message}
                {...profileForm.register('jobTitle')}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" loading={profileForm.formState.isSubmitting}>
                Save changes
              </Button>
            </div>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink-900">
            <FiShield size={15} className="text-ink-400" />
            My access
          </h2>
          <p className="mb-4 text-xs text-ink-500">
            Only the shop owner can change what you are allowed to do.
          </p>

          {isSuperAdmin ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-sm font-bold text-brand-800">Full access</p>
              <p className="mt-1 text-sm text-brand-700">
                As a super admin you can reach every part of the dashboard, including staff and
                permissions.
              </p>
            </div>
          ) : grantedByModule.length ? (
            <ul className="space-y-3">
              {grantedByModule.map((module) => (
                <li key={module.key}>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                    {module.label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {module.granted.map((action) => (
                      <Badge key={action} tone="info">
                        {permissionActionLabel(action)}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-500">
              No permissions have been granted to your account yet. Ask the owner to give you
              access.
            </p>
          )}

          <dl className="mt-5 space-y-1.5 border-t border-ink-100 pt-4 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Role</dt>
              <dd className="font-semibold text-ink-800">
                {isSuperAdmin ? 'Super admin' : 'Staff'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Last sign in</dt>
              <dd className="font-semibold text-ink-800">{formatDateTime(admin.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Account created</dt>
              <dd className="font-semibold text-ink-800">{formatDateTime(admin.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-ink-900">
            <FiLock size={15} className="text-ink-400" />
            Change password
          </h2>
          <p className="mb-4 text-xs text-ink-500">
            Saving a new password signs you out of every device, including this one.
          </p>

          <form onSubmit={passwordForm.handleSubmit(savePassword)} className="space-y-4">
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              required
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register('newPassword')}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register('confirmPassword')}
              />
            </div>

            <ul className="grid gap-2 rounded-lg bg-ink-50 p-3 sm:grid-cols-2">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(newPassword);

                return (
                  <li
                    key={rule.key}
                    className={cn(
                      'flex items-center gap-2 text-xs font-medium transition-colors',
                      passed ? 'text-emerald-700' : 'text-ink-500'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                        passed ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-200 text-ink-400'
                      )}
                    >
                      {passed ? <FiCheck size={10} /> : <FiX size={10} />}
                    </span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-xs text-amber-700">
                <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
                You will be sent back to the sign-in screen straight away.
              </p>

              <Button
                type="submit"
                variant="dark"
                loading={passwordForm.formState.isSubmitting}
                className="shrink-0"
              >
                Change password
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
