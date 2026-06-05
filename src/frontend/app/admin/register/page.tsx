"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, QrCode, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ApiError, registerOwner } from "../../../lib/api";
import { getAccessToken, setAccessToken } from "../../../lib/auth";
import { firstInvalid, validateEmail, validatePassword, validateRequired, validateSlug } from "../../../lib/validation";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suggestedSlug = useMemo(() => slugify(tenantName), [tenantName]);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  function handleTenantNameChange(value: string) {
    setTenantName(value);
    if (!tenantSlug || tenantSlug === suggestedSlug) {
      setTenantSlug(slugify(value));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validation = firstInvalid(
      validateRequired(tenantName, "Restaurant name"),
      validateSlug(tenantSlug),
      validateRequired(ownerDisplayName, "Owner name"),
      validateEmail(ownerEmail, "Owner email"),
      validatePassword(password)
    );
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerOwner({
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim(),
        ownerDisplayName: ownerDisplayName.trim(),
        ownerEmail: ownerEmail.trim(),
        password
      });
      setAccessToken(response.accessToken);
      router.replace("/admin/dashboard");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Account could not be created. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-on-background">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-8">
        <Card className="flex min-h-[calc(100vh-32px)] items-center justify-center border-outline-variant/40 bg-surface-container-lowest px-5 py-8 shadow-soft-saas lg:min-h-[calc(100vh-64px)]">
          <div className="w-full max-w-md">
            <div className="lg:hidden">
              <BrandMark />
            </div>

            <CardHeader className="mt-8 px-0 pb-2 pt-0 lg:mt-0">
              <Badge variant="secondary" className="w-fit gap-2 bg-primary/5 text-primary">
                <Building2 size={14} />
                Owner onboarding
              </Badge>
              <CardTitle className="mt-4 text-headline-lg text-primary">Create your workspace</CardTitle>
              <CardDescription className="leading-6 text-on-surface-variant">
                Set up the restaurant account, then add branches, menu items, tables, and QR codes.
              </CardDescription>
            </CardHeader>

            {error ? (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <TextField
                icon={<Store size={18} />}
                label="Restaurant name"
                value={tenantName}
                onChange={handleTenantNameChange}
                placeholder="Demo Cafe"
                autoComplete="organization"
                required
              />
              <TextField
                icon={<QrCode size={18} />}
                label="Restaurant slug"
                value={tenantSlug}
                onChange={(value) => setTenantSlug(slugify(value))}
                placeholder="demo-cafe"
                required
              />
              <TextField
                icon={<User size={18} />}
                label="Owner name"
                value={ownerDisplayName}
                onChange={setOwnerDisplayName}
                placeholder="Priya Shah"
                autoComplete="name"
                required
              />
              <TextField
                icon={<Mail size={18} />}
                label="Owner email"
                value={ownerEmail}
                onChange={setOwnerEmail}
                placeholder="owner@example.com"
                type="email"
                autoComplete="email"
                required
              />

              <label className="block">
                <Label className="text-on-surface">Password</Label>
                <div className="relative mt-2">
                  <LockKeyhole size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <Input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create password"
                    className="h-11 rounded-lg border-outline-variant/60 bg-surface-container-low pl-10 pr-11 focus-visible:ring-primary"
                    minLength={8}
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
                {isSubmitting ? "Creating workspace..." : "Create Workspace"}
                {!isSubmitting ? <ArrowRight size={18} /> : null}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-on-surface-variant">
              Already have an account?{" "}
              <Link href="/admin/login" className="font-bold text-primary">
                Login
              </Link>
            </p>
          </div>
        </Card>

        <Card className="hidden overflow-hidden border-primary/10 bg-primary text-white shadow-modal lg:flex lg:flex-col lg:justify-between">
          <CardContent className="p-8 lg:p-10">
            <BrandMark inverse />

            <div className="mt-20 max-w-2xl">
              <Badge className="border-soft-gold/30 bg-soft-gold/15 text-soft-gold">Start in minutes</Badge>
              <h1 className="mt-5 text-display-lg leading-tight tracking-normal text-white">
                Build your QR ordering workspace without setup calls.
              </h1>
              <p className="mt-5 max-w-xl text-body-md leading-7 text-white/70">
                Create the owner account, add your first branch, publish menu items, and generate table QR links from one admin workspace.
              </p>
            </div>
          </CardContent>

          <div className="grid grid-cols-3 border-t border-white/10 bg-white/[0.04]">
            {[
              ["1", "Create owner"],
              ["2", "Add branch"],
              ["3", "Launch QR menu"]
            ].map(([step, text]) => (
              <div key={step} className="border-r border-white/10 p-5 last:border-r-0">
                <p className="text-sm font-bold">Step {step}</p>
                <p className="mt-1 text-xs leading-5 text-white/60">{text}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </main>
  );
}

function TextField({
  autoComplete,
  icon,
  label,
  onChange,
  placeholder,
  required,
  type = "text",
  value
}: {
  autoComplete?: string;
  icon: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <Label className="text-on-surface">{label}</Label>
      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 rounded-lg border-outline-variant/60 bg-surface-container-low pl-10 focus-visible:ring-primary"
          required={required}
        />
      </div>
    </label>
  );
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-11 w-11 place-items-center rounded-xl shadow-soft-saas ${inverse ? "bg-white text-primary" : "bg-primary text-soft-gold"}`}>
        <QrCode size={22} strokeWidth={2.4} />
      </div>
      <div>
        <p className={`text-sm font-bold ${inverse ? "text-white" : "text-primary"}`}>Qrave</p>
        <p className={`text-[10px] font-semibold uppercase tracking-wider ${inverse ? "text-white/60" : "text-on-surface-variant"}`}>Restaurant OS</p>
      </div>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
