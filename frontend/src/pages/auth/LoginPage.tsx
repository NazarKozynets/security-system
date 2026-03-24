import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { z } from 'zod';
import { useAuth } from '../../providers/AuthProvider';
import { getErrorMessage } from '../../shared/lib/errors';
import { hasAdminPanelAccess } from '../../shared/lib/rbac';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { PageHeader } from '../../shared/ui/PageHeader';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const loggedInUser = await login(values.email, values.password);
      if (hasAdminPanelAccess(loggedInUser)) {
        const dest =
          from && from.startsWith('/admin') ? from : '/admin';
        navigate(dest, { replace: true });
      } else if (from && isPublicPath(from)) {
        navigate(from, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (e) {
      toast.error(getErrorMessage(e, 'Invalid credentials'));
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '48px auto', padding: '0 16px' }}>
      <PageHeader title="Sign in" subtitle="Use your institutional account." />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <Link to="/" style={{ alignSelf: 'center', fontSize: 14 }}>
              Back to home
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function isPublicPath(path: string) {
  return path === '/' || path === '/login' || path === '/forbidden';
}
