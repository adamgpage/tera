"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerSchema, type RegisterInput } from "@/lib/utils/validation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { COUNTRIES, LANGUAGES } from "@/lib/utils/formatting";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fields, setFields] = useState<RegisterInput>({
    name: "",
    email: "",
    password: "",
    country: "",
    language: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterInput, string>>
  >({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const result = registerSchema.safeParse(fields);
    if (!result.success) {
      const errs: Partial<Record<keyof RegisterInput, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegisterInput;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: fields.email,
        password: fields.password,
        options: {
          data: {
            name: fields.name,
            country: fields.country,
            languages: fields.language,
          },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Ensure public.users row exists (fallback if trigger didn't fire)
      await fetch("/api/auth/complete-registration", { method: "POST" });

      // Check if email confirmation is required
      // If not (dev mode), redirect straight to dashboard
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      // Email confirmation required — show success message
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Alert variant="success" title="Check your email">
        We&apos;ve sent a confirmation link to <strong>{fields.email}</strong>.
        Click the link to activate your account.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <Input
        id="name"
        label="Full name"
        autoComplete="name"
        value={fields.name}
        onChange={(e) => setFields({ ...fields, name: e.target.value })}
        error={fieldErrors.name}
      />

      <Input
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={fields.email}
        onChange={(e) => setFields({ ...fields, email: e.target.value })}
        error={fieldErrors.email}
      />

      <Input
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        value={fields.password}
        onChange={(e) => setFields({ ...fields, password: e.target.value })}
        error={fieldErrors.password}
      />

      <Select
        id="country"
        label="Country"
        placeholder="Select your country"
        options={COUNTRIES}
        value={fields.country}
        onChange={(e) => setFields({ ...fields, country: e.target.value })}
        error={fieldErrors.country}
      />

      <Select
        id="language"
        label="Primary language"
        placeholder="Select your language"
        options={LANGUAGES}
        value={fields.language}
        onChange={(e) => setFields({ ...fields, language: e.target.value })}
        error={fieldErrors.language}
      />

      <Button type="submit" className="w-full" loading={loading}>
        Create account
      </Button>
    </form>
  );
}
