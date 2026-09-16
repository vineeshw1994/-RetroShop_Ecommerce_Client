import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { FiMail } from 'react-icons/fi';

import { useAppDispatch } from '@/store';

import { pushToast } from '@/store/slices/uiSlice';

import { contactService } from '@/services/shop.service';

import { getErrorMessage } from '@/lib/api';

import { useDocumentTitle } from '@/hooks';

import { Button, Input, Textarea } from '@/components/ui';



const schema = z.object({

  name: z.string().trim().min(2, 'Enter your name'),

  email: z.string().trim().email('Enter a valid email'),

  phone: z.string().optional(),

  subject: z.string().trim().min(3, 'Enter a subject'),

  message: z.string().trim().min(10, 'Tell us a little more'),

});



const Contact = () => {

  useDocumentTitle('Contact us');

  const dispatch = useAppDispatch();



  const {

    register,

    handleSubmit,

    reset,

    formState: { errors, isSubmitting },

  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', subject: '', message: '' } });



  const onSubmit = async (values: z.infer<typeof schema>) => {

    try {

      await contactService.submit(values);

      dispatch(pushToast('Thanks — we have your message and will reply by email.', 'success'));

      reset();

    } catch (error) {

      dispatch(pushToast(getErrorMessage(error), 'error'));

    }

  };



  return (

    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">

      <h1 className="text-3xl font-black tracking-tight text-ink-900">Contact us</h1>

      <p className="mt-2 max-w-2xl text-sm text-ink-500">

        Questions about an order, a game we do not list yet, or a trade-in? Send a message and we

        will get back to you.

      </p>



      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">

        <aside className="card space-y-4 p-5">

          <p className="flex items-start gap-3 text-sm text-ink-600">

            <FiMail className="mt-0.5 text-brand-600" />

            We reply to every message by email.

          </p>

        </aside>



        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-5">

          <div className="grid gap-4 sm:grid-cols-2">

            <Input {...register('name')} label="Name" required error={errors.name?.message} />

            <Input {...register('email')} type="email" label="Email" required error={errors.email?.message} />

          </div>

          <Input {...register('phone')} label="Phone (optional)" />

          <Input {...register('subject')} label="Subject" required error={errors.subject?.message} />

          <Textarea {...register('message')} label="Message" rows={6} required error={errors.message?.message} />

          <Button type="submit" loading={isSubmitting}>

            Send message

          </Button>

        </form>

      </div>

    </div>

  );

};



export default Contact;


