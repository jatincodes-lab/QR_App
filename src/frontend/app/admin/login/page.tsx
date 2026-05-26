"use client";

import { FormEvent, useEffect, useState } from "react";
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
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="hidden overflow-hidden border-slate-800 bg-slate-950 text-white shadow-md lg:flex lg:flex-col lg:justify-between">
          <CardContent className="p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-slate-950 shadow-sm">
                <QrCode size={22} strokeWidth={2.4} />
              </div>
              <div>
                <p className="text-sm font-semibold">QR Menu Admin</p>
                <p className="text-xs text-slate-300">Restaurant control panel</p>
              </div>
            </div>

            <div className="mt-16 max-w-2xl">
              <Badge className="border-teal-400/30 bg-teal-400/10 text-teal-200">Built for daily operations</Badge>
              <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-normal">
                Keep menus, branches, and QR tables easy to manage.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                A simple workspace for restaurant owners and staff who need clear actions, readable information, and fewer mistakes during service hours.
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
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-300">{text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="flex min-h-[calc(100vh-32px)] items-center justify-center px-5 py-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                  <QrCode size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">QR Menu Admin</p>
                  <p className="text-xs text-muted-foreground">Restaurant control panel</p>
                </div>
              </div>
            </div>

            <CardHeader className="mt-8 px-0 pb-2 pt-0 lg:mt-0">
              <Badge variant="secondary" className="w-fit gap-2">
                <Building2 size={14} />
                Admin access
              </Badge>
              <CardTitle className="mt-3 text-3xl">Login to your workspace</CardTitle>
              <CardDescription className="leading-6">
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
                <Label>Email address</Label>
                <div className="relative mt-2">
                  <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    autoComplete="email"
                    placeholder="owner@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <Label>Password</Label>
                <div className="relative mt-2">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter password"
                    className="pl-10 pr-11"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </Button>
                </div>
              </label>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full"
              >
                {isSubmitting ? "Logging in..." : "Login"}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </Button>
            </form>

            <div className="mt-6 space-y-2 border-t pt-5">
              {["Clear branch setup", "Simple menu controls", "QR table management"].map((text) => (
                <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 size={16} className="text-emerald-600" />
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
