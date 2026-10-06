import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import SocialContinue from '@/components/auth/SocialContinue';
import { Button, Checkbox, Input } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuthError, login } from '@/store/slices/authSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const REMEMBER_KEY = 'rs_remember_email';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

const Login = () => {
  useDocumentTitle('Sign in');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const submitting = useAppSelector((state) => state.auth.submitting);
  const authError = useAppSelector((state) => state.auth.error);

  const [showPassword, setShowPassword] = useState(false);

  const remembered = (() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) || '';
    } catch {
      return '';
    }
  })();

  const redirectTo =
    searchParams.get('next') || (location.state as { from?: string } | null)?.from || '/account';

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: remembered, password: '', rememberMe: Boolean(remembered) },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      if (values.rememberMe) localStorage.setItem(REMEMBER_KEY, values.email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* ignore */
    }

    const result = await dispatch(
      login({ email: values.email, password: values.password })
    );

    if (login.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
      return;
    }

    const payload = result.payload as
      | { requiresVerification?: boolean; devOtp?: string }
      | undefined;
    if (payload?.requiresVerification) {
      if (payload.devOtp) {
        dispatch(pushToast(`Development OTP: ${payload.devOtp}`, 'info'));
      }
      navigate('/verify-email');
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to your Respawn account."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-400 hover:text-brand-500">
            Register
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
            className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-sm font-medium text-rose-300"
          >
            <FiAlertCircle className="mt-0.5 shrink-0" size={15} />
            {authError}
          </motion.p>
        )}

        <Input
          {...register('email')}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          leftIcon={<FiMail size={16} />}
          error={errors.email?.message}
        />

        <Input
          {...register('password')}
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
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

        <div className="flex items-center justify-between gap-3">
          <Checkbox {...register('rememberMe')} label="Remember me" />
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-brand-400 transition hover:text-brand-500"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-6">
        <SocialContinue />
      </div>
    </AuthLayout>
  );
};

export default Login;
