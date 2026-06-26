import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { LogoSymbol, LogoWordmark } from '@/components/brand/Logo';

interface SignInPageProps {
  description?: React.ReactNode;
  heroImageSrc?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-foreground/40 focus-within:bg-foreground/10">
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  description = "Acesse sua conta para continuar",
  heroImageSrc = "/login-hero.png",
  onSignIn,
  onResetPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('login-screen-active');
    return () => document.documentElement.classList.remove('login-screen-active');
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background font-geist md:flex-row">
      {/* Left column: sign-in form */}
      <section className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="animate-element animate-delay-100 flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white p-2">
                <LogoSymbol className="w-full h-auto" />
              </span>
              <LogoWordmark className="h-9 w-auto text-foreground" />
            </div>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-5" onSubmit={onSignIn}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                <GlassInputWrapper>
                  <input name="email" type="email" placeholder="Digite seu e-mail" className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Senha</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Digite sua senha" className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                  <span className="text-foreground/90">Manter conectado</span>
                </label>
                <a href="#" onClick={(e) => { e.preventDefault(); onResetPassword?.(); }} className="text-muted-foreground transition-colors hover:text-foreground hover:underline">Esqueci minha senha</a>
              </div>

              <button type="submit" className="animate-element animate-delay-600 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                Entrar
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      {heroImageSrc && (
        <section className="relative hidden flex-1 overflow-hidden p-6 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-6 rounded-3xl bg-cover bg-center shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          />
          <div className="pointer-events-none absolute inset-6 rounded-3xl ring-1 ring-white/10" />
        </section>
      )}
    </div>
  );
};  
