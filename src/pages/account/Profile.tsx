import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiCamera, FiEye, FiEyeOff, FiLock, FiShield, FiUser } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser } from '@/store/slices/authSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useDocumentTitle } from '@/hooks';
import { formatDate, formatDateTime, initials } from '@/lib/format';
import PasswordStrength, { passwordSchema } from '@/components/auth/PasswordStrength';
import { Button, Input, Skeleton, SmartImage, Switch } from '@/components/ui';

const PHONE_PATTERN = /^[+\d][\d\s()-]{6,22}$/;

const MAX_AVATAR_BYTES = 8 * 1024 * 1024;

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Enter your first name').max(60, 'That is too long'),
  lastName: z.string().trim().min(2, 'Enter your last name').max(60, 'That is too long'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || PHONE_PATTERN.test(value),
      'Enter a valid phone number, e.g. +44 7700 900123'
    ),
});

type ProfileValues = z.infer<typeof profileSchema>;

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Both passwords must match',
    path: ['confirmPassword'],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'Choose a password you have not used here before',
    path: ['newPassword'],
  });

type PasswordValues = z.infer<typeof passwordFormSchema>;

const EMPTY_PASSWORDS: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const SectionCard = ({
  icon,
  title,
  description,
  children,
  delay = 0,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  delay?: number;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="card p-5 sm:p-6"
  >
    <header className="flex items-start gap-3 border-b border-ink-100 pb-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-bold text-ink-900">{title}</h2>
        <p className="mt-0.5 text-xs text-ink-500">{description}</p>
      </div>
    </header>

    <div className="pt-5">{children}</div>
  </motion.section>
);

const Profile = () => {
  useDocumentTitle('Profile & security');

  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(Boolean(user?.marketingOptIn));
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: EMPTY_PASSWORDS,
  });

  const newPassword = passwordForm.watch('newPassword');

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      dispatch(pushToast('Choose an image file (JPG, PNG, WebP or GIF)', 'error'));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      dispatch(pushToast('That image is larger than 8MB — please pick a smaller one', 'error'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploadingAvatar(true);

    try {
      const response = await accountService.updateAvatar(file);
      dispatch(setUser(response.data.user));
      dispatch(pushToast('Profile photo updated', 'success'));
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setAvatarPreview(null);
      URL.revokeObjectURL(objectUrl);
      setUploadingAvatar(false);
    }
  };

  const onProfileSubmit = async (values: ProfileValues) => {
    try {
      const response = await accountService.updateProfile({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        marketingOptIn,
      });

      dispatch(setUser(response.data.user));
      dispatch(pushToast('Profile saved', 'success'));
      profileForm.reset(values);
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const onPasswordSubmit = async (values: PasswordValues) => {
    try {
      await accountService.changePassword(values);
      dispatch(
        pushToast('Password changed — every other device has been signed out', 'success')
      );
      passwordForm.reset(EMPTY_PASSWORDS);
      setVisible({ current: false, next: false, confirm: false });
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  if (!user) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
          Profile &amp; security
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Keep your details current so orders and delivery updates reach you.
        </p>
      </header>

      <SectionCard
        icon={<FiUser size={16} />}
        title="Profile details"
        description="Your name, contact number and photo."
      >
        <div className="flex flex-col items-start gap-4 border-b border-ink-100 pb-5 sm:flex-row sm:items-center">
          <div className="relative">
            {avatarPreview ? (
              // Local blob preview, so it bypasses the asset-path resolution in SmartImage.
              <img
                src={avatarPreview}
                alt="Selected profile photo"
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : user.avatar ? (
              <SmartImage
                src={user.avatar}
                alt={user.fullName}
                wrapperClassName="h-20 w-20 rounded-full"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                {initials(user.fullName)}
              </span>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white shadow-md transition hover:bg-ink-800 disabled:opacity-60"
            >
              <FiCamera size={14} />
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-ink-900">{user.fullName}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              JPG, PNG, WebP or GIF, up to 8MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              loading={uploadingAvatar}
              onClick={() => fileInputRef.current?.click()}
            >
              {user.avatar ? 'Change photo' : 'Upload photo'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <form
          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
          className="space-y-4 pt-5"
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              autoComplete="given-name"
              error={profileForm.formState.errors.firstName?.message}
              {...profileForm.register('firstName')}
            />

            <Input
              label="Last name"
              required
              autoComplete="family-name"
              error={profileForm.formState.errors.lastName?.message}
              {...profileForm.register('lastName')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="+44 7700 900123"
              hint="Our couriers use this for delivery updates."
              error={profileForm.formState.errors.phone?.message}
              {...profileForm.register('phone')}
            />

            <Input
              label="Email"
              type="email"
              value={user.email}
              readOnly
              disabled
              hint="Your email address cannot be changed."
            />
          </div>

          <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
            <Switch
              checked={marketingOptIn}
              onChange={setMarketingOptIn}
              label="Email me about new stock and offers"
              description="Trade-in deals and restock alerts. No more than once a week."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={profileForm.formState.isSubmitting}>
              Save changes
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        icon={<FiLock size={16} />}
        title="Change password"
        description="Use at least 8 characters with a mix of cases and a number."
        delay={0.06}
      >
        <form
          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
          className="space-y-4"
          noValidate
        >
          <Input
            label="Current password"
            required
            type={visible.current ? 'text' : 'password'}
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setVisible((state) => ({ ...state, current: !state.current }))}
                aria-label={visible.current ? 'Hide password' : 'Show password'}
                className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                {visible.current ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            }
            {...passwordForm.register('currentPassword')}
          />

          <div>
            <Input
              label="New password"
              required
              type={visible.next ? 'text' : 'password'}
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword?.message}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setVisible((state) => ({ ...state, next: !state.next }))}
                  aria-label={visible.next ? 'Hide password' : 'Show password'}
                  className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                >
                  {visible.next ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              }
              {...passwordForm.register('newPassword')}
            />
            <PasswordStrength value={newPassword} />
          </div>

          <Input
            label="Confirm new password"
            required
            type={visible.confirm ? 'text' : 'password'}
            autoComplete="new-password"
            error={passwordForm.formState.errors.confirmPassword?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setVisible((state) => ({ ...state, confirm: !state.confirm }))}
                aria-label={visible.confirm ? 'Hide password' : 'Show password'}
                className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                {visible.confirm ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            }
            {...passwordForm.register('confirmPassword')}
          />

          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-700">
            <FiShield size={14} className="mt-0.5 shrink-0" />
            Changing your password signs you out of every other device. You will stay signed in
            here.
          </p>

          <div className="flex justify-end">
            <Button type="submit" loading={passwordForm.formState.isSubmitting}>
              Update password
            </Button>
          </div>
        </form>
      </SectionCard>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.12 }}
        className="card p-5"
      >
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-500">Account</h2>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-ink-400">Member since</dt>
            <dd className="mt-0.5 font-semibold text-ink-800">{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-400">Last sign-in</dt>
            <dd className="mt-0.5 font-semibold text-ink-800">
              {formatDateTime(user.lastLoginAt)}
            </dd>
          </div>
        </dl>
      </motion.section>
    </div>
  );
};

export default Profile;
