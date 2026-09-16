import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiCheckCircle, FiEdit2, FiMapPin, FiPhone, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useAsync, useDocumentTitle } from '@/hooks';
import {
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  Skeleton,
} from '@/components/ui';
import type { Address } from '@/types';

const PHONE_PATTERN = /^[+\d][\d\s()-]{6,22}$/;

const addressSchema = z.object({
  label: z.string().max(40, 'Keep the label under 40 characters'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter the recipient’s full name')
    .max(120, 'Keep the name under 120 characters'),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'Enter a valid contact number, e.g. +44 7700 900123'),
  line1: z.string().trim().min(3, 'Enter the street address').max(160, 'That line is too long'),
  line2: z.string().max(160, 'That line is too long'),
  city: z.string().trim().min(2, 'Enter the town or city').max(80, 'That is too long'),
  state: z.string().max(80, 'That is too long'),
  postcode: z.string().trim().min(3, 'Enter the postcode').max(20, 'That postcode is too long'),
  country: z.string().trim().min(2, 'Enter the country').max(80, 'That is too long'),
  isDefault: z.boolean(),
});

type AddressValues = z.infer<typeof addressSchema>;

const EMPTY_FORM: AddressValues = {
  label: '',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'United Kingdom',
  isDefault: false,
};

const toFormValues = (address: Address): AddressValues => ({
  label: address.label || '',
  fullName: address.fullName,
  phone: address.phone,
  line1: address.line1,
  line2: address.line2 || '',
  city: address.city,
  state: address.state || '',
  postcode: address.postcode,
  country: address.country,
  isDefault: address.isDefault,
});

const addressLines = (address: Address) =>
  [address.line1, address.line2, address.city, address.state, address.postcode, address.country]
    .filter(Boolean)
    .join(', ');

const Addresses = () => {
  useDocumentTitle('Delivery addresses');

  const dispatch = useAppDispatch();
  const { data, loading, error, reload } = useAsync(() => accountService.listAddresses(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultingId, setDefaultingId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY_FORM,
  });

  const addresses = data?.data || [];
  const isFirstAddress = addresses.length === 0;

  useEffect(() => {
    if (formOpen) reset(editing ? toFormValues(editing) : EMPTY_FORM);
  }, [formOpen, editing, reset]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (address: Address) => {
    setEditing(address);
    setFormOpen(true);
  };

  const onSubmit = async (values: AddressValues) => {
    const payload = {
      label: values.label.trim() || null,
      fullName: values.fullName,
      phone: values.phone,
      line1: values.line1,
      line2: values.line2.trim() || null,
      city: values.city,
      state: values.state.trim() || null,
      postcode: values.postcode,
      country: values.country,
      isDefault: values.isDefault,
    };

    try {
      if (editing) {
        await accountService.updateAddress(editing.id, payload);
        dispatch(pushToast('Address updated', 'success'));
      } else {
        await accountService.createAddress(payload);
        dispatch(pushToast('Address saved', 'success'));
      }

      setFormOpen(false);
      setEditing(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    }
  };

  const handleSetDefault = async (address: Address) => {
    setDefaultingId(address.id);
    try {
      await accountService.updateAddress(address.id, { isDefault: true });
      dispatch(pushToast('Default delivery address updated', 'success'));
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setDefaultingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await accountService.deleteAddress(deleteTarget.id);
      dispatch(pushToast('Address removed', 'success'));
      setDeleteTarget(null);
      await reload();
    } catch (caught) {
      dispatch(pushToast(getErrorMessage(caught), 'error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
            Delivery addresses
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Save the places we deliver to so checkout takes seconds.
          </p>
        </div>

        <Button size="sm" leftIcon={<FiPlus size={15} />} onClick={openCreate}>
          Add address
        </Button>
      </header>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && addresses.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<FiMapPin size={22} />}
            title="No saved addresses"
            message="Add an address now and it will be picked automatically at checkout."
            action={{ label: 'Add address', onClick: openCreate }}
          />
        </div>
      )}

      {!loading && !error && addresses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address, index) => (
            <motion.article
              key={address.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: Math.min(index, 6) * 0.04 }}
              className="card flex flex-col p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-bold text-ink-900">
                  {address.label || 'Delivery address'}
                </h2>
                {address.isDefault && (
                  <Badge tone="success" dot>
                    Default
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm font-semibold text-ink-800">{address.fullName}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{addressLines(address)}</p>

              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
                <FiPhone size={13} className="text-ink-400" />
                {address.phone}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FiEdit2 size={13} />}
                  onClick={() => openEdit(address)}
                >
                  Edit
                </Button>

                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiCheckCircle size={14} />}
                    loading={defaultingId === address.id}
                    onClick={() => handleSetDefault(address)}
                  >
                    Set as default
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-brand-600 hover:bg-brand-50 hover:text-brand-700"
                  leftIcon={<FiTrash2 size={13} />}
                  onClick={() => setDeleteTarget(address)}
                >
                  Delete
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit address' : 'Add a delivery address'}
        description={
          editing ? 'Update where we should send your parcels.' : 'Where should we deliver?'
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="address-form" loading={isSubmitting}>
              {editing ? 'Save changes' : 'Save address'}
            </Button>
          </>
        }
      >
        <form id="address-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Label"
            placeholder="Home, Work, Mum’s house…"
            hint="Optional — helps you spot it at checkout."
            error={errors.label?.message}
            {...register('label')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              autoComplete="name"
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            <Input
              label="Phone"
              required
              type="tel"
              autoComplete="tel"
              placeholder="+44 7700 900123"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <Input
            label="Address line 1"
            required
            autoComplete="address-line1"
            error={errors.line1?.message}
            {...register('line1')}
          />

          <Input
            label="Address line 2"
            autoComplete="address-line2"
            placeholder="Flat, building, unit (optional)"
            error={errors.line2?.message}
            {...register('line2')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Town or city"
              required
              autoComplete="address-level2"
              error={errors.city?.message}
              {...register('city')}
            />

            <Input
              label="County or state"
              autoComplete="address-level1"
              placeholder="Optional"
              error={errors.state?.message}
              {...register('state')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Postcode"
              required
              autoComplete="postal-code"
              error={errors.postcode?.message}
              {...register('postcode')}
            />

            <Input
              label="Country"
              required
              autoComplete="country-name"
              error={errors.country?.message}
              {...register('country')}
            />
          </div>

          <Checkbox
            label="Make this my default delivery address"
            description={
              isFirstAddress && !editing
                ? 'Your first saved address becomes the default automatically.'
                : 'Setting this will unset your current default.'
            }
            error={errors.isDefault?.message}
            {...register('isDefault')}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete this address?"
        message={`“${deleteTarget?.label || deleteTarget?.fullName || 'This address'}” will be removed from your account. Orders already placed keep their original address.`}
        confirmLabel="Delete address"
      />
    </div>
  );
};

export default Addresses;
