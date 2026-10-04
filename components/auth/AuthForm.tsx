"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "signIn" | "signUp";
type Step =
  | { kind: "form" }
  | { kind: "verify"; email: string }
  | { kind: "forgot" }
  | { kind: "reset"; email: string };

const inputClass =
  "h-10 w-full rounded-lg border border-input bg-input/30 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function friendlyError(err: unknown, mode: Mode) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/InvalidAccountId|Invalid credentials|InvalidSecret/i.test(msg)) {
    return "That email and password do not match.";
  }
  if (/already exists/i.test(msg)) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (/Invalid password/i.test(msg)) {
    return "Use a password with at least 8 characters.";
  }
  if (/Invalid code|Could not verify code/i.test(msg)) {
    return "That code is invalid or expired.";
  }
  if (/TooManyFailedAttempts/i.test(msg)) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  return mode === "signUp" ? "Could not create your account." : "Could not sign you in.";
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input {...rest} className={inputClass} />
    </label>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (err) {
      setError(friendlyError(err, mode));
    } finally {
      setPending(false);
    }
  }

  function done() {
    router.push("/dashboard");
    router.refresh();
  }

  function onSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    data.set("email", email);
    data.set("flow", mode);
    void run(async () => {
      const result = await signIn("password", data);
      if (result.signingIn) done();
      else setStep({ kind: "verify", email });
    });
  }

  function onSubmitVerify(e: React.FormEvent<HTMLFormElement>, email: string) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("email", email);
    data.set("flow", "email-verification");
    void run(async () => {
      await signIn("password", data);
      done();
    });
  }

  function onSubmitForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    data.set("email", email);
    data.set("flow", "reset");
    void run(async () => {
      await signIn("password", data);
      setStep({ kind: "reset", email });
    });
  }

  function onSubmitReset(e: React.FormEvent<HTMLFormElement>, email: string) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("email", email);
    data.set("flow", "reset-verification");
    void run(async () => {
      await signIn("password", data);
      done();
    });
  }

  function onGoogle() {
    void run(async () => {
      await signIn("google", { redirectTo: "/dashboard" });
    });
  }

  const title =
    step.kind === "verify"
      ? "Check your email"
      : step.kind === "forgot" || step.kind === "reset"
        ? "Reset your password"
        : mode === "signUp"
          ? "Create your account"
          : "Welcome back";

  const subtitle =
    step.kind === "verify" || step.kind === "reset"
      ? `We sent a code to ${step.email}.`
      : step.kind === "forgot"
        ? "Enter your email and we will send you a code."
        : mode === "signUp"
          ? "Start your daily report."
          : "Sign in to your daily report.";

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      {step.kind === "form" && (
        <>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            disabled={pending}
            onClick={onGoogle}
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmitForm} className="space-y-4">
            {mode === "signUp" && (
              <Field label="Name" name="name" type="text" autoComplete="name" required />
            )}
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              minLength={8}
              required
            />
            {mode === "signIn" && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setError(null);
                  setStep({ kind: "forgot" });
                }}
              >
                Forgot password?
              </button>
            )}
            <Button type="submit" className="h-10 w-full" disabled={pending}>
              {mode === "signUp" ? "Create account" : "Sign in"}
            </Button>
          </form>
        </>
      )}

      {step.kind === "verify" && (
        <form onSubmit={(e) => onSubmitVerify(e, step.email)} className="space-y-4">
          <Field
            label="Verification code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            Verify
          </Button>
        </form>
      )}

      {step.kind === "forgot" && (
        <form onSubmit={onSubmitForgot} className="space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            Send code
          </Button>
        </form>
      )}

      {step.kind === "reset" && (
        <form onSubmit={(e) => onSubmitReset(e, step.email)} className="space-y-4">
          <Field
            label="Code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <Field
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Button type="submit" className="h-10 w-full" disabled={pending}>
            Reset password
          </Button>
        </form>
      )}

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      {step.kind === "form" && mode === "signIn" && (
        <p className="text-center text-xs text-muted-foreground">
          Had an account before our sign-in update? Continue with Google or create an account
          with the same email and your data will be there.
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {step.kind !== "form" ? (
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              setError(null);
              setStep({ kind: "form" });
            }}
          >
            Back
          </button>
        ) : mode === "signUp" ? (
          <>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-foreground hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/sign-up" className="text-foreground hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
