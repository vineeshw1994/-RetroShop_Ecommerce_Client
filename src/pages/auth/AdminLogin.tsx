import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiEye, FiEyeOff, FiInfo, FiLock, FiMail } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import { Button, Input, Turnstile, isTurnstileEnabled } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store';
import { adminLogin, clearAdminAuthError } from '@/store/slices/adminAuthSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const AdminLogin = () => {
  useDocumentTitle('Staff sign in');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const submitting = useAppSelector((state) => state.adminAuth.submitting);
  const authError = useAppSelector((state) => state.adminAuth.error);

  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const redirectTo = (location.state as { from?: string } | null)?.from || '/admin';

  useEffect(() => {
    dispatch(clearAdminAuthError());
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (isTurnstileEnabled && !turnstileToken) {
      dispatch(pushToast('Please complete the human verification first', 'error'));
      return;
    }

    const result = await dispatch(adminLogin({ ...values, turnstileToken }));

    if (adminLogin.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <AuthLayout
      variant="admin"
      title="Staff sign in"
      subtitle="Use the dashboard credentials the store owner gave you."
      footer={
        <>
          Shopping instead?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Customer sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {authError && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm font-medium text-brand-700"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" size={15} />
            {authError}
          </motion.p>
        )}

        <Input
          {...register('email')}
          type="email"
          label="Work email"
          placeholder="Staff email"
          autoComplete="email"
          leftIcon={<FiMail size={16} />}
          error={errors.email?.message}
        />

        <div>
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Your password"
            autoComplete="current-password"
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

          <div className="mt-1.5 text-right">
            <Link
              to="/admin/forgot-password"
              className="text-xs font-semibold text-ink-500 transition hover:text-brand-600"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Turnstile onVerify={setTurnstileToken} action="admin-login" />

        <Button
          type="submit"
          variant="dark"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
        >
          Sign in to dashboard
        </Button>
      </form>

      <p className="mt-5 flex items-start gap-2 rounded-lg bg-ink-50 px-3.5 py-3 text-xs leading-relaxed text-ink-600">
        <FiInfo className="mt-0.5 shrink-0 text-ink-400" size={14} />
        There is no staff sign-up. The store owner creates every staff account and sets its
        permissions, so ask them for access if you do not have credentials yet.
      </p>
    </AuthLayout>
  );
};

export default AdminLogin;
