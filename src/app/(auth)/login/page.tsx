import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { SocialButtons } from "@/components/auth/social-buttons";

export default function LoginPage() {
  return (
    <Card>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-text-primary">
          Sign in to Tera
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Connect with people who have solved your problem.
        </p>
      </div>

      <SocialButtons />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <LoginForm />

      <p className="mt-6 text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-tera-600 hover:text-tera-700">
          Create one
        </Link>
      </p>
    </Card>
  );
}
