import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export default function RegisterPage() {
  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Join Tera and connect with real experience.
        </p>
      </div>

      <SocialButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <RegisterForm />

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-tera-600 hover:text-tera-700">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
