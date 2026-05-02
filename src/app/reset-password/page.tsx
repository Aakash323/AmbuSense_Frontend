"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPassword } from "@/hooks/use-auth";
import { getFriendlyApiErrorMessage } from "@/lib/api";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const resetPassword = useResetPassword();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token) {
      toast.error("This reset link is missing its token.");
      return;
    }

    try {
      const response = await resetPassword.mutateAsync({
        token,
        newPassword: values.newPassword,
      });
      toast.success(response.message);
      router.replace("/login");
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error));
    }
  }

  if (!token) {
    return (
      <AuthCard
        description="The reset link is missing or incomplete. Please request a fresh password reset link."
        title="Invalid reset link"
      >
        <Button
          asChild
          className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link
            className="font-medium text-emerald-700 underline-offset-4 hover:underline"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description="Choose a new password for your AmbuSense account."
      title="Create a new password"
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            aria-invalid={!!form.formState.errors.newPassword}
            autoComplete="new-password"
            id="newPassword"
            placeholder="Enter a new password"
            type="password"
            {...form.register("newPassword")}
          />
          {form.formState.errors.newPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.newPassword.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            aria-invalid={!!form.formState.errors.confirmPassword}
            autoComplete="new-password"
            id="confirmPassword"
            placeholder="Confirm your new password"
            type="password"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button
          className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={resetPassword.isPending}
          type="submit"
        >
          {resetPassword.isPending ? "Saving..." : "Reset password"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Back to{" "}
        <Link
          className="font-medium text-emerald-700 underline-offset-4 hover:underline"
          href="/login"
        >
          sign in
        </Link>
      </p>
    </AuthCard>
  );
}

function AuthCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,#f8fffc_0%,#eefdf6_45%,#f8fafc_100%)] px-4 py-10">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center justify-center">
        <Card className="w-full border-emerald-100/80 bg-white/90 shadow-xl shadow-emerald-950/5 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-lg font-semibold text-emerald-700">
              AS
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard
          description="Preparing your password reset form."
          title="Loading reset link"
        >
          <Button className="h-11 w-full" disabled>
            Loading...
          </Button>
        </AuthCard>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
