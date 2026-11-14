import { Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, User } from 'lucide-react';
import { useState, type FormEvent, type ReactElement } from 'react';
import qahwaLogo from '../assets/qahwa-logo.svg';
import loginHero from '../assets/login-hero.jpg';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Spinner } from '../components/ui/badge';
import { LanguageToggle } from '../components/ui/language-toggle';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { useI18n } from '../i18n';
import { useAuthStore } from '../store/auth';

export function LoginPage(): ReactElement {
  const { t } = useI18n();
  const login = useAuthStore((state) => state.login);
  const error = useAuthStore((state) => state.error);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const heroPoints = [t('auth.hero.point1'), t('auth.hero.point2'), t('auth.hero.point3')];

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch {
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <section className="relative isolate flex min-h-[400px] flex-col overflow-hidden bg-[#0f0c0a] px-7 py-8 sm:px-10 sm:py-10 lg:min-h-screen lg:w-[56%] lg:px-14 lg:py-12 xl:px-16">
        <img
          src={loginHero}
          alt={t('auth.hero.imageAlt')}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[56%_62%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/40 to-black/15 rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-transparent to-black/70"
        />

        <div className="relative flex items-center gap-3">
          <img
            src={qahwaLogo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full shadow-lg shadow-black/40 ring-1 ring-white/15"
          />
          <div className="leading-tight">
            <p className="font-display text-xl tracking-[0.14em] text-white">{t('app.name')}</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55">
              {t('app.company')}
            </p>
          </div>
        </div>

        <div className="relative mt-12 max-w-[620px] sm:mt-16 lg:mt-20">
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-9 bg-accent" aria-hidden="true" />
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-accent sm:text-[11px]">
              {t('auth.hero.eyebrow')}
            </p>
          </div>

          <div className="relative mt-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -end-2 top-2 hidden flex-col items-end gap-2 sm:flex rtl:items-start"
            >
              <span className="h-[3px] w-28 -rotate-12 rounded-full bg-accent/80" />
              <span className="h-[3px] w-20 -rotate-12 rounded-full bg-accent/50" />
              <span className="h-[3px] w-12 -rotate-12 rounded-full bg-accent/30" />
            </div>
            <h1 className="hero-type relative text-[clamp(2.75rem,8.5vw,5.4rem)] leading-[0.85]">
              {t('auth.hero.titleLine1')}
              <br />
              {t('auth.hero.titleLine2')}
            </h1>
          </div>

          <p className="mt-5 max-w-md text-[13px] leading-relaxed text-white/70 sm:text-[15px]">
            {t('auth.hero.subtitle')}
          </p>
        </div>

        <div className="relative mt-auto hidden flex-wrap items-center pt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45 lg:flex">
          {heroPoints.map((point, index) => (
            <span key={point} className="flex items-center">
              {index > 0 ? (
                <span className="mx-5 h-1 w-1 rounded-full bg-accent/70" aria-hidden="true" />
              ) : null}
              {point}
            </span>
          ))}
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_100%_0%,hsl(var(--accent)/0.12),transparent_60%)] rtl:bg-[radial-gradient(90%_70%_at_0%_0%,hsl(var(--accent)/0.12),transparent_60%)]"
        />

        <div className="relative w-full max-w-[420px]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-pop sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                {t('auth.form.title')}
              </p>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>

            <h2 className="mt-5 font-display text-[30px] uppercase leading-none tracking-[0.01em] text-foreground">
              {t('auth.form.welcome')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('auth.form.subtitle')}
            </p>

            <form className="mt-7 space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="username">{t('auth.form.username')}</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    className="h-11 ps-9"
                    placeholder={t('auth.form.usernamePlaceholder')}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={busy}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">{t('auth.form.password')}</Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="h-11 ps-9 pe-10"
                    placeholder={t('auth.form.passwordPlaceholder')}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label={
                      showPassword ? t('auth.form.hidePassword') : t('auth.form.showPassword')
                    }
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full text-[15px] font-semibold shadow-lg shadow-primary/15"
                disabled={busy || !username.trim() || !password}
              >
                {busy ? (
                  <>
                    <Spinner className="border-current border-t-transparent" />
                    {t('auth.form.submitting')}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 rtl:-scale-x-100" />
                    {t('auth.form.submit')}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
              <span>{t('auth.form.securityNote')}</span>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            {t('app.fullName')} · {t('app.location')}
          </p>
        </div>
      </section>
    </div>
  );
}
