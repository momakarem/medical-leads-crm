import { FormEvent, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button/Button';
import { Input } from '../../../components/ui/Input/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { useI18n } from '../../../i18n/I18nContext';
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout';
import { ApiError } from '../../../services/apiClient';
import type { UserRole } from '../../../types';

function roleHome(role: UserRole): string {
  if (role === 'admin' || role === 'manager') return '/dashboard';
  return '/dashboard';
}

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => ({
    email: email.trim() ? '' : t('auth.emailRequired'),
    password: password ? '' : t('auth.passwordRequired'),
  }), [email, password, t]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validation.email || validation.password) return;

    setIsLoading(true);
    setError(null);
    try {
      const user = await login(email.trim(), password, rememberMe);
      window.history.pushState({}, '', roleHome(user.role));
      window.dispatchEvent(new PopStateEvent('popstate'));    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.message.toLowerCase().includes('inactive')) {
        setError(t('auth.inactiveAccount'));
      } else if (requestError instanceof ApiError && requestError.status === 401) {
        setError(t('auth.invalidCredentials'));
      } else {
        setError(t('auth.serverError'));
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form className="login-card" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div>
          <p className="eyebrow">{t('auth.secureAccess')}</p>
          <h2>{t('auth.signIn')}</h2>
          <p>{t('auth.subtitle')}</p>
        </div>

        {error ? <div className="form-alert" role="alert">{error}</div> : null}

        <Input label={t('auth.email')} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={validation.email} />
        <Input label={t('auth.password')} name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={validation.password} />

        <div className="login-options">
          <label className="checkbox-control">
            <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
            <span>{t('auth.rememberMe')}</span>
          </label>
          <a href="#forgot-password" onClick={(event) => event.preventDefault()}>{t('auth.forgotPassword')}</a>
        </div>

        <Button type="submit" variant="primary" isLoading={isLoading}>{t('auth.login')}</Button>
      </form>
    </AuthLayout>
  );
}


