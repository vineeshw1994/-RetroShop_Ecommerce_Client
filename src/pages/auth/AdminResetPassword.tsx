import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import { Button, Input } from '@/components/ui';
import OtpInput from '@/components/auth/OtpInput';
import PasswordStrength, { passwordSchema } from '@/components/auth/PasswordStrength';
import { adminAuthService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/api';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const schema = z
  .object({
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const AdminResetPassword = () => {
  useDocumentTitle('Staff password reset');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const emailFromQuery = searchParams.get('email') || '';
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromQuery, code: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      await adminAuthService.resetPassword(values);
      dispatch(pushToast('Password updated, you can sign in now'));
      navigate('/admin/login', { replace: true });
    } catch (error) {
      dispatch(pushToast(getErrorMessage(error), 'error'));
    }
  };

  return (
    <AuthLayout
      variant="admin"
      title="Set a new staff password"
      subtitle="Enter the code we emailed you, then choose a password you have not used before."
      footer={
        <>
          Did not get a code?{' '}
          <Link
            to="/admin/forgot-password"
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            Request a new one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          {...register('email')}
          type="email"
          label="Work email"
          placeholder="Staff email"
          autoComplete="email"
          readOnly={Boolean(emailFromQuery)}
          leftIcon={<FiMail size={16} />}
          hint={emailFromQuery ? 'The account this code was sent to.' : undefined}
          error={errors.email?.message}
        />

        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <OtpInput
              label="Reset code"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              disabled={isSubmitting}
              autoFocus={Boolean(emailFromQuery)}
            />
          )}
        />

        <div>
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="New password"
            placeholder="Create a password"
            autoComplete="new-password"
            leftIcon={<FiLock size={16} />}
            error={errors.password?.message}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            }
          />
          <PasswordStrength value={password} />
        </div>

        <Input
          {...register('confirmPassword')}
          type={showPassword ? 'text' : 'password'}
          label="Confirm new password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          leftIcon={<FiLock size={16} />}
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="dark"
          size="lg"
          fullWidth
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
};

export default AdminResetPassword;
