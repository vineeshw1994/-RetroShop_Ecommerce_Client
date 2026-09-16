import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { motion } from 'framer-motion';

import { FiAlertCircle, FiEye, FiEyeOff, FiLock, FiMail, FiPhone, FiUser } from 'react-icons/fi';

import AuthLayout from '@/layouts/AuthLayout';

import { Button, Checkbox, Input } from '@/components/ui';

import PasswordStrength, { passwordSchema } from '@/components/auth/PasswordStrength';

import { useAppDispatch, useAppSelector } from '@/store';

import { clearAuthError, signup } from '@/store/slices/authSlice';

import { pushToast } from '@/store/slices/uiSlice';

import { useDocumentTitle } from '@/hooks';

const schema = z

  .object({

    firstName: z.string().trim().min(2, 'First name is too short').max(60, 'First name is too long'),

    lastName: z.string().trim().min(2, 'Last name is too short').max(60, 'Last name is too long'),

    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),

    phone: z

      .string()

      .trim()

      .regex(/^[+\d][\d\s()-]{6,22}$/, 'Enter a valid phone number'),

    password: passwordSchema,

    confirmPassword: z.string().min(1, 'Confirm your password'),

    marketingOptIn: z.boolean(),

  })

  .refine((values) => values.password === values.confirmPassword, {

    message: 'Passwords do not match',

    path: ['confirmPassword'],

  });



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

    watch,

    formState: { errors },

  } = useForm({

    resolver: zodResolver(schema),

    defaultValues: {

      firstName: '',

      lastName: '',

      email: '',

      phone: '',

      password: '',

      confirmPassword: '',

      marketingOptIn: false,

    },

  });



  const password = watch('password');



  const onSubmit = async (values: z.infer<typeof schema>) => {

    const result = await dispatch(signup(values));



    if (signup.fulfilled.match(result)) {

      dispatch(pushToast('Account created, check your email for the 6-digit code'));

      if (result.payload.devOtp) {

        dispatch(

          pushToast(`Development OTP: ${result.payload.devOtp}`, 'info')

        );

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

      title="Create your account"

      subtitle="It takes a minute. We will email you a 6-digit code to confirm it is you."

      footer={

        <>

          Already have an account?{' '}

          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">

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

            className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm font-medium text-brand-700"

          >

            <FiAlertCircle className="mt-0.5 shrink-0" size={15} />

            {authError}

          </motion.p>

        )}



        <div className="grid gap-4 sm:grid-cols-2">

          <Input

            {...register('firstName')}

            label="First name"

            autoComplete="given-name"

            leftIcon={<FiUser size={16} />}

            error={errors.firstName?.message}

          />

          <Input

            {...register('lastName')}

            label="Last name"

            autoComplete="family-name"

            error={errors.lastName?.message}

          />

        </div>



        <Input

          {...register('email')}

          type="email"

          label="Email address"

          autoComplete="email"

          leftIcon={<FiMail size={16} />}

          error={errors.email?.message}

        />



        <Input

          {...register('phone')}

          type="tel"

          label="Phone number"

          autoComplete="tel"

          leftIcon={<FiPhone size={16} />}

          hint="We only use this for delivery updates."

          error={errors.phone?.message}

        />



        <div>

          <Input

            {...register('password')}

            type={showPassword ? 'text' : 'password'}

            label="Password"

            placeholder="Create a password"

            autoComplete="new-password"

            leftIcon={<FiLock size={16} />}

            error={errors.password?.message}

            rightSlot={passwordToggle}

          />

          <PasswordStrength value={password} />

        </div>



        <Input

          {...register('confirmPassword')}

          type={showPassword ? 'text' : 'password'}

          label="Confirm password"

          placeholder="Repeat your password"

          autoComplete="new-password"

          leftIcon={<FiLock size={16} />}

          error={errors.confirmPassword?.message}

        />



        <Checkbox

          {...register('marketingOptIn')}

          label="Email me new arrivals and offers"

          description="Occasional emails only, and you can opt out at any time."

        />



        <Button type="submit" size="lg" fullWidth loading={submitting} disabled={submitting}>

          Create account

        </Button>

      </form>

    </AuthLayout>

  );

};



export default Signup;


