import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import { Button, Input, Turnstile, isTurnstileEnabled } from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuthError, login } from '@/store/slices/authSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const schema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  useDocumentTitle('Sign in');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const submitting = useAppSelector((state) => state.auth.submitting);
  const authError = useAppSelector((state) => state.auth.error);

  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const redirectTo = (location.state as { from?: string } | null)?.from || '/account';

  useEffect(() => {
    dispatch(clearAuthError());
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

    const result = await dispatch(login({ ...values, turnstileToken }));

    if (login.fulfilled.match(result)) {
      navigate(redirectTo, { replace: true });
      return;
    }

    const payload = result.payload as { requiresVerification?: boolean } | undefined;
    if (payload?.requiresVerification) navigate('/verify-email');
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to track your orders, save wishlists and check out faster."
      footer={
        <>
          New to RetroShop?{' '}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Create an account
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
          label="Email address"
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
              to="/forgot-password"
              className="text-xs font-semibold text-ink-500 transition hover:text-brand-600"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <Turnstile onVerify={setTurnstileToken} action="login" />

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
