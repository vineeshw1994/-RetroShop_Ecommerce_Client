import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiArrowLeft, FiMail } from 'react-icons/fi';
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
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
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

  const [email] = useState(() => pendingEmail || searchParams.get('email') || '');
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
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
      dispatch(pushToast('Email verified, welcome to Respawn'));
      navigate('/account', { replace: true });
      return;
    }

    reset({ code: '' });
  };

  const resend = async () => {
    setResending(true);
    try {
      const response = await authService.resendCode(email);
      if (response.data?.devOtp) {
        dispatch(pushToast(`Development OTP: ${response.data.devOtp}`, 'info'));
      } else {
        dispatch(pushToast('We have sent you a fresh code'));
      }
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
      title="Verify your email"
      subtitle={
        <>
          We&apos;ve sent a 6-digit code to <span className="font-semibold text-brand-400">{email}</span>
          . Enter the code below to complete your registration.
        </>
      }
      extra={
        <div className="mt-10 rounded-3xl border border-brand-500/20 bg-ink-100/80 p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-brand-500/30 bg-brand-500/10 text-brand-400 shadow-glow">
            <FiMail size={36} />
          </div>
          <h2 className="text-xl font-black text-ink-900">Almost there!</h2>
          <p className="mt-2 text-sm text-ink-500">
            Verify your email to access your account and start shopping.
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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

        <Controller
          name="code"
          control={control}
          render={({ field, fieldState }) => (
            <OtpInput
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              disabled={submitting}
              autoFocus
            />
          )}
        />

        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-ink-500">Didn&apos;t receive a code?</p>
          <button
            type="button"
            onClick={resend}
            disabled={resending || cooldown > 0}
            className="font-semibold text-accent-400 hover:text-accent-500 disabled:text-ink-400"
          >
            {cooldown > 0 ? `Resend (${cooldown}s)` : resending ? 'Sending…' : 'Resend'}
          </button>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>
          Verify email
        </Button>
      </form>

      <Link
        to="/signup"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-400 hover:text-brand-500"
      >
        <FiArrowLeft size={14} />
        Use a different email
      </Link>
    </AuthLayout>
  );
};

export default VerifyEmail;
