import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail, FiUser } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import SocialContinue from '@/components/auth/SocialContinue';
import { Button, Checkbox, Input } from '@/components/ui';
import { passwordSchema } from '@/components/auth/PasswordStrength';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuthError, signup } from '@/store/slices/authSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name').max(120, 'Name is too long'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    acceptTerms: z.boolean().refine((value) => value === true, {
      message: 'Please accept the terms to continue',
    }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || parts[0] || 'Customer',
  };
};

const Signup = () => {
  useDocumentTitle('Create an account');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const submitting = useAppSelector((state) => state.auth.submitting);
  const authError = useAppSelector((state) => state.auth.error);

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const { firstName, lastName } = splitName(values.fullName);
    const result = await dispatch(
      signup({
        firstName,
        lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
      })
    );

    if (signup.fulfilled.match(result)) {
      dispatch(pushToast('Account created, check your email for the 6-digit code'));
      if (result.payload.devOtp) {
        dispatch(pushToast(`Development OTP: ${result.payload.devOtp}`, 'info'));
      }
      navigate('/verify-email');
    }
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((previous) => !previous)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
    >
      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
    </button>
  );

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join Respawn for a faster checkout, order tracking, trade-ins and exclusive deals."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-400 hover:text-accent-500">
            Sign in
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
          {...register('fullName')}
          placeholder="Full name"
          autoComplete="name"
          leftIcon={<FiUser size={16} />}
          error={errors.fullName?.message}
        />

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
          autoComplete="new-password"
          leftIcon={<FiLock size={16} />}
          error={errors.password?.message}
          rightSlot={passwordToggle}
        />

        <Input
          {...register('confirmPassword')}
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm password"
          autoComplete="new-password"
          leftIcon={<FiLock size={16} />}
          error={errors.confirmPassword?.message}
        />

        <Checkbox
          {...register('acceptTerms')}
          error={errors.acceptTerms?.message}
          label={
            <>
              I agree to the{' '}
              <Link to="/terms" className="font-semibold text-brand-400 hover:text-brand-500">
                Terms &amp; Conditions
              </Link>{' '}
              and Privacy Policy
            </>
          }
        />

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          Create account
        </Button>
      </form>

      <div className="mt-6">
        <SocialContinue />
      </div>
    </AuthLayout>
  );
};

export default Signup;
