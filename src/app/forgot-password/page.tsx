"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPassword } from "@/hooks/use-auth";
import { getFriendlyApiErrorMessage } from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    try {
      const response = await forgotPassword.mutateAsync(values);
      toast.success(response.message);
    } catch (error) {
      toast.error(getFriendlyApiErrorMessage(error));
    }
  }

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
                Reset your password
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we will send a reset link.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  aria-invalid={!!form.formState.errors.email}
                  autoComplete="email"
                  id="email"
                  placeholder="you@example.com"
                  type="email"
                  {...form.register("email")}
                />
                {form.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                ) : null}
              </div>
              <Button
                className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={forgotPassword.isPending}
                type="submit"
              >
                {forgotPassword.isPending ? "Sending..." : "Send reset link"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link
                className="font-medium text-emerald-700 underline-offset-4 hover:underline"
                href="/login"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
