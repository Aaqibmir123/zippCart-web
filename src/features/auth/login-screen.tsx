"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { useAuth } from "./auth-provider";
import { SessionBoundary } from "./session-boundary";
import { authApi } from "../../lib/api/auth-api";
import { markSessionMayExist } from "../../lib/auth/session-storage";
import { Button, Field, Notice } from "../../components/ui";

export function LoginScreen() {
  const { setUser } = useAuth();
  const search = useSearchParams();
  const lock = useRef(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const values = new FormData(event.currentTarget as HTMLFormElement);
    const submittedPhone = String(values.get("phone") ?? "");
    const submittedPassword = String(values.get("password") ?? "");
    if (!/^[6-9]\d{9}$/.test(submittedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const { user: loginUser } = await authApi.passwordLogin(
        submittedPhone,
        submittedPassword,
      );
      if (
        !loginUser?.id ||
        loginUser.authMethod !== "password" ||
        !loginUser.roles?.some((role) => role === "admin" || role === "seller")
      )
        throw new Error(
          "The backend did not return an authorized workspace account.",
        );
      let user;
      try {
        // A 200 login response alone does not prove this browser retained the
        // HttpOnly cookie. Verify the cookie round-trip before opening a
        // workspace whose server-side routes depend on it.
        ({ user } = await authApi.me());
      } catch {
        throw new Error(
          "Your password was accepted, but this browser could not confirm the secure session. Open the website and API using the same hostname (both localhost or both 127.0.0.1), then try again.",
        );
      }
      if (
        !user?.id ||
        user.id !== loginUser.id ||
        user.authMethod !== "password" ||
        !user.roles?.some((role) => role === "admin" || role === "seller")
      )
        throw new Error(
          "Your secure session could not be matched to this account. Please sign in again.",
        );
      await markSessionMayExist().catch(() => undefined);
      setUser(user);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setPassword("");
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <SessionBoundary role="login">
      <main className="relative min-h-dvh overflow-hidden bg-[#f7f5fb]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 top-20 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl"
        />
        <div className="relative mx-auto grid min-h-dvh max-w-[1440px] lg:grid-cols-[minmax(0,1.04fr)_minmax(0,.96fr)]">
          <section className="relative isolate hidden min-h-dvh flex-col justify-between overflow-hidden bg-gradient-to-br from-[#24113f] via-purple-800 to-[#a83f91] px-6 py-7 text-white lg:flex lg:px-14 lg:py-12 xl:px-20">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full border-[48px] border-white/5"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-40 -left-28 -z-10 h-96 w-96 rounded-full border-[56px] border-white/5"
            />
            <div className="flex items-center justify-between gap-4">
              <span className="text-2xl font-black tracking-tight sm:text-3xl">
                ZippCart<span className="text-orange-300">.</span>
              </span>
            </div>
            <div className="mt-10 max-w-xl lg:mt-0">
              <p className="text-[11px] font-bold tracking-[.24em] text-purple-200 sm:text-xs">
                YOUR BUSINESS, CONNECTED
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:mt-6 lg:text-5xl xl:text-[3.5rem]">
                Clarity for your everyday business.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-purple-100 sm:mt-6 sm:text-base sm:leading-7">
                Your store, orders and operations, together in one workspace.
              </p>
            </div>
            <p className="mt-8 hidden text-xs text-purple-200 lg:block">
              One secure sign-in. Your account opens its authorized workspace.
            </p>
          </section>
          <section className="flex items-center justify-center px-4 py-8 sm:px-8 sm:py-12 lg:px-10 xl:px-16">
            <div className="w-full max-w-[460px] rounded-[28px] border border-white bg-white/90 p-5 shadow-xl shadow-purple-950/5 backdrop-blur sm:p-8 lg:p-10">
              <div className="mb-7 flex items-center gap-3 sm:mb-9">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-purple-50 text-purple-700">
                  <LockKeyhole size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-black tracking-tight text-slate-900">
                    ZippCart<span className="text-pink-500">.</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Secure sign in</p>
                </div>
              </div>
              <div className="mb-7">
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Sign in with your mobile number and password. Your role opens
                  the right workspace.
                </p>
              </div>
              {search.has("passwordChanged") && (
                <Notice>
                  Password changed. Sign in with your new password.
                </Notice>
              )}
              <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
                <Field
                  label="Mobile Number"
                  name="phone"
                  value={phone}
                  onChange={(event) => {
                    setPhone(
                      event.target.value.replace(/\D/g, "").slice(0, 10),
                    );
                    setError("");
                  }}
                  disabled={busy}
                  autoComplete="tel-national"
                  inputMode="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  maxLength={10}
                />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  disabled={busy}
                  autoComplete="current-password"
                />
                {error && <Notice error>{error}</Notice>}
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-700 to-purple-600 py-3 shadow-md shadow-purple-200/60 hover:from-purple-800 hover:to-purple-700"
                >
                  {busy ? (
                    "Signing in..."
                  ) : (
                    <>
                      Login <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>
              <p className="text-center text-xs leading-6 text-slate-500">
                By continuing, you agree to our{" "}
                <Link
                  prefetch={false}
                  href="/terms"
                  className="text-purple-800 underline"
                >
                  Terms & Conditions
                </Link>{" "}
                and{" "}
                <Link
                  prefetch={false}
                  href="/privacy"
                  className="text-purple-800 underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </main>
    </SessionBoundary>
  );
}
