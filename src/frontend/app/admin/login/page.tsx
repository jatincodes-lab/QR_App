"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ApiError, login } from "../../../lib/api";
import { getAccessToken, setAccessToken } from "../../../lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/admin/branches");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await login(email, password);
      setAccessToken(response.accessToken);
      router.replace("/admin/branches");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-on-background">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-8">
        <Card className="hidden overflow-hidden border-primary/10 bg-primary text-white shadow-modal lg:flex lg:flex-col lg:justify-between">
          <CardContent className="p-8 lg:p-10">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white text-primary shadow-soft-saas">
                <QrCode size={22} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-sm font-bold">Qrave</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Restaurant OS</p>
              </div>
            </div>

            <div className="mt-20 max-w-2xl">
              <Badge className="border-soft-gold/30 bg-soft-gold/15 text-soft-gold">Built for daily operations</Badge>
              <h1 className="mt-5 text-display-lg leading-tight tracking-normal text-white">
                Crave-worthy QR ordering for modern restaurants.
              </h1>
              <p className="mt-5 max-w-xl text-body-md leading-7 text-white/70">
                A reliable workspace for restaurant operators who need clear actions, readable information, and fewer mistakes during service hours.
              </p>
            </div>
          </CardContent>

          <div className="grid grid-cols-3 border-t border-white/10 bg-white/[0.04]">
            {[
              ["Branches", "Manage locations"],
              ["Menu", "Update items"],
              ["QR Tables", "Serve guests faster"]
            ].map(([title, text]) => (
              <div key={title} className="border-r border-white/10 p-5 last:border-r-0">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[calc(100vh-32px)] items-center justify-center border-outline-variant/40 bg-surface-container-lowest px-5 py-8 shadow-soft-saas lg:min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-soft-gold">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">Qrave</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Restaurant OS</p>
                </div>
              </div>
            </div>

            <CardHeader className="mt-8 px-0 pb-2 pt-0 lg:mt-0">
              <Badge variant="secondary" className="w-fit gap-2 bg-primary/5 text-primary">
                <Building2 size={14} />
                Admin access
              </Badge>
              <CardTitle className="mt-4 text-headline-lg text-primary">Login to your workspace</CardTitle>
              <CardDescription className="leading-6 text-on-surface-variant">
                Use your owner account to manage branches, menus, and QR code setup.
              </CardDescription>
            </CardHeader>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <Label className="text-on-surface">Email address</Label>
                <div className="relative mt-2">
                  <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="owner@example.com"
                    className="h-11 rounded-lg border-outline-variant/60 bg-surface-container-low pl-10 focus-visible:ring-primary"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <Label className="text-on-surface">Password</Label>
                <div className="relative mt-2">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className="h-11 rounded-lg border-outline-variant/60 bg-surface-container-low pl-10 pr-11 focus-visible:ring-primary"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-on-surface-variant"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </label>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-lg bg-primary text-on-primary shadow-soft-saas hover:bg-primary-container"
              >
                {isSubmitting ? "Logging in..." : "Login"}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t border-outline-variant/30 pt-5">
              <p className="pb-2 text-sm text-on-surface-variant">
                New to Qrave?{" "}
                <Link href="/admin/register" className="font-bold text-primary">
                  Create an owner account
                </Link>
              </p>
              {["Clear branch setup", "Simple menu controls", "QR table management"].map((text) => (
                <div key={text} className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <CheckCircle2 size={16} className="text-soft-gold" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
