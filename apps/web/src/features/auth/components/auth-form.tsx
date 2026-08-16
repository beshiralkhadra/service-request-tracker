"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, LifeBuoy, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  LoginInputSchema,
  RegisterInputSchema,
  type LoginInput,
  type RegisterInput,
} from "@service-request-tracker/contracts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiClientError } from "@/lib/http/api-error";

import { useLogin, useRegister } from "../hooks/use-auth";

type AuthMode = "login" | "register";

const errorMessage = (error: Error | null): string | null => {
  if (error === null) {
    return null;
  }
  if (error instanceof ApiClientError) {
    return error.problem.detail ?? error.problem.title;
  }
  return "The request could not be completed. Please try again.";
};

interface FieldErrorProps {
  message: string | undefined;
}

function FieldError({ message }: FieldErrorProps) {
  return message === undefined ? null : (
    <p className="text-xs text-destructive">{message}</p>
  );
}

function LoginForm() {
  const login = useLogin();
  const form = useForm<LoginInput>({
    defaultValues: { email: "", password: "" },
    resolver: zodResolver(LoginInputSchema),
  });
  const mutationError = errorMessage(login.error);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit((input) => login.mutate(input))}
    >
      {mutationError === null ? null : (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Sign in failed</AlertTitle>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          {...form.register("email")}
          aria-invalid={form.formState.errors.email !== undefined}
          autoComplete="email"
          id="login-email"
          placeholder="name@example.com"
          type="email"
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          {...form.register("password")}
          aria-invalid={form.formState.errors.password !== undefined}
          autoComplete="current-password"
          id="login-password"
          type="password"
        />
        <FieldError message={form.formState.errors.password?.message} />
      </div>

      <Button
        className="w-full"
        disabled={login.isPending}
        size="lg"
        type="submit"
      >
        {login.isPending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        Sign in
      </Button>
    </form>
  );
}

function RegistrationForm() {
  const registerAccount = useRegister();
  const form = useForm<RegisterInput>({
    defaultValues: { displayName: "", email: "", password: "" },
    resolver: zodResolver(RegisterInputSchema),
  });
  const mutationError = errorMessage(registerAccount.error);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit((input) => registerAccount.mutate(input))}
    >
      {mutationError === null ? null : (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{mutationError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="register-name">Full name</Label>
        <Input
          {...form.register("displayName")}
          aria-invalid={form.formState.errors.displayName !== undefined}
          autoComplete="name"
          id="register-name"
        />
        <FieldError message={form.formState.errors.displayName?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          {...form.register("email")}
          aria-invalid={form.formState.errors.email !== undefined}
          autoComplete="email"
          id="register-email"
          placeholder="name@example.com"
          type="email"
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">Password</Label>
        <Input
          {...form.register("password")}
          aria-invalid={form.formState.errors.password !== undefined}
          autoComplete="new-password"
          id="register-password"
          type="password"
        />
        <p className="text-xs text-muted-foreground">At least 12 characters</p>
        <FieldError message={form.formState.errors.password?.message} />
      </div>

      <Button
        className="w-full"
        disabled={registerAccount.isPending}
        size="lg"
        type="submit"
      >
        {registerAccount.isPending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <ArrowRight aria-hidden="true" />
        )}
        Create customer account
      </Button>
    </form>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--primary)_0_42%,var(--chart-2)_42%_67%,var(--chart-3)_67%_100%)]" />
      <main className="relative w-full max-w-md rounded-lg border bg-card shadow-[0_24px_70px_-35px_oklch(0.2_0.02_185/45%)]">
        <header className="border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <LifeBuoy aria-hidden="true" className="size-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Service Desk</h1>
              <p className="font-mono text-[0.6875rem] text-muted-foreground">
                SECURE REQUEST ACCESS
              </p>
            </div>
          </div>
        </header>

        <Tabs
          className="gap-5 px-6 py-6"
          onValueChange={(value) => setMode(value as AuthMode)}
          value={mode}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register">
            <RegistrationForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
