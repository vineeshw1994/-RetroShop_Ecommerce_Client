import { useState } from 'react';

import { Link, useNavigate } from 'react-router-dom';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { motion } from 'framer-motion';

import { FiArrowRight, FiMail } from 'react-icons/fi';

import AuthLayout from '@/layouts/AuthLayout';

import { Button, Input } from '@/components/ui';

import { authService } from '@/services/auth.service';

import { getErrorMessage } from '@/lib/api';

import { useAppDispatch } from '@/store';

import { pushToast } from '@/store/slices/uiSlice';

import { useDocumentTitle } from '@/hooks';



const schema = z.object({

  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),

});



const ForgotPassword = () => {

  useDocumentTitle('Forgot password');



  const dispatch = useAppDispatch();

  const navigate = useNavigate();



  const [sentTo, setSentTo] = useState<string | null>(null);



  const {

    register,

    handleSubmit,

    formState: { errors, isSubmitting },

  } = useForm({

    resolver: zodResolver(schema),

    defaultValues: { email: '' },

  });



  const onSubmit = async (values: z.infer<typeof schema>) => {

    try {

      const response = await authService.forgotPassword({ email: values.email });

      if (response.data?.devOtp) {

        dispatch(pushToast(`Development OTP: ${response.data.devOtp}`, 'info'));

      }

      setSentTo(values.email);

    } catch (error) {

      dispatch(pushToast(getErrorMessage(error), 'error'));

    }

  };



  return (

    <AuthLayout

      title={sentTo ? 'Check your email' : 'Forgot your password?'}

      subtitle={

        sentTo

          ? undefined

          : 'Give us the email address on your account and we will send a 6-digit reset code.'

      }

      footer={

        <>

          Remembered it?{' '}

          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">

            Back to sign in

          </Link>

        </>

      }

    >

      {sentTo ? (

        <motion.div

          initial={{ opacity: 0, y: 8 }}

          animate={{ opacity: 1, y: 0 }}

          transition={{ duration: 0.25 }}

          className="card p-5 sm:p-6"

        >

          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">

            <FiMail size={20} />

          </span>



          <h2 className="mt-4 text-base font-bold text-ink-900">Reset code on its way</h2>

          <p className="mt-1.5 text-sm leading-relaxed text-ink-500">

            If an account exists for{' '}

            <span className="font-semibold text-ink-800">{sentTo}</span> you will receive a 6-digit

            code shortly. Check your spam folder if it does not turn up.

          </p>



          <Button

            className="mt-5"

            size="lg"

            fullWidth

            rightIcon={<FiArrowRight size={16} />}

            onClick={() => navigate(`/reset-password?email=${encodeURIComponent(sentTo)}`)}

          >

            Enter the code

          </Button>



          <button

            type="button"

            onClick={() => setSentTo(null)}

            className="mt-3 w-full text-center text-xs font-semibold text-ink-500 transition hover:text-brand-600"

          >

            Use a different email address

          </button>

        </motion.div>

      ) : (

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          <Input

            {...register('email')}

            type="email"

            label="Email address"

            autoComplete="email"

            leftIcon={<FiMail size={16} />}

            error={errors.email?.message}

          />



          <Button type="submit" size="lg" fullWidth loading={isSubmitting} disabled={isSubmitting}>

            Send reset code

          </Button>

        </form>

      )}

    </AuthLayout>

  );

};



export default ForgotPassword;


