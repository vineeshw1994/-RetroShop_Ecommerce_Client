import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiMail, FiRefreshCw } from 'react-icons/fi';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui';
import OtpInput from '@/components/auth/OtpInput';
import { authService } from '@/services/auth.service';
import { getErrorMessage } from '@/lib/api';
import { useAppDispatch, useAppSelector } from '@/store';
import { clearAuthError, verifyEmail } from '@/store/slices/authSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { useDocumentTitle } from '@/hooks';

const schema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
});

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  useDocumentTitle('Verify your email');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pendingEmail = useAppSelector((state) => state.auth.pendingVerificationEmail);
  const submitting = useAppSelector((state) => state.auth.submitting);
  const authError = useAppSelector((state) => state.auth.error);

  // Captured once: the slice clears the pending email on success, and this
  // screen must not bounce to /signup while it is navigating away.
  const [email] = useState(() => pendingEmail || searchParams.get('email') || '');

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((previous) => previous - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    const result = await dispatch(verifyEmail({ email, code: values.code }));

    if (verifyEmail.fulfilled.match(result)) {
      dispatch(pushToast('Email verified, welcome to RetroShop'));
      navigate('/account', { replace: true });
      return;
    }

    reset({ code: '' });
  };

  const resend = async () => {
    setResending(true);
    try {
      await authService.resendCode(email);
      dispatch(pushToast('We have sent you a fresh code'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      dispatch(pushToast(getErrorMessage(error), 'error'));
    } finally {
      setResending(false);
    }
  };

  if (!email) return null;

  return (
    <AuthLayout
      title="Check your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-semibold text-ink-800">{email}</span>. Pop
          it in below to finish setting up your account.
        </>
      }
      footer={
        <>
          Wrong email address?{' '}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Start again
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <OtpInput
              label="Verification code"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              disabled={submitting}
              autoFocus
            />
          )}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={submitting}
          leftIcon={<FiMail size={16} />}
        >
          Verify email
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500">Code not arrived yet?</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resend}
          loading={resending}
          disabled={resending || cooldown > 0}
          leftIcon={<FiRefreshCw size={14} />}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </Button>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
