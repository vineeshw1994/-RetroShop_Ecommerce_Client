import { FaApple, FaFacebookF, FaGoogle } from 'react-icons/fa';
import { useAppDispatch } from '@/store';
import { pushToast } from '@/store/slices/uiSlice';

const PROVIDERS = [
  { id: 'apple', label: 'Continue with Apple', icon: FaApple },
  { id: 'google', label: 'Continue with Google', icon: FaGoogle },
  { id: 'facebook', label: 'Continue with Facebook', icon: FaFacebookF },
] as const;

const SocialContinue = () => {
  const dispatch = useAppDispatch();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        <span className="h-px flex-1 bg-ink-300" />
        Or continue with
        <span className="h-px flex-1 bg-ink-300" />
      </div>

      <div className="space-y-2.5">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() =>
              dispatch(
                pushToast(`${provider.label.replace('Continue with ', '')} sign-in is coming soon`, 'info')
              )
            }
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-ink-300 bg-ink-100 text-sm font-bold text-ink-800 transition hover:border-brand-500/40 hover:bg-ink-200"
          >
            <provider.icon size={16} />
            {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SocialContinue;
