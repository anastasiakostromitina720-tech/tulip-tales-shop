import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Вход в админ-панель" }] }),
});

function LoginPage() {
  const { signIn, signUp, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [loading, user, isAdmin, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error } = await fn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (mode === "signup") {
      toast.success("Аккаунт создан. Попросите администратора назначить вам роль.");
    }
  }

  const showNoAccess = !loading && user && !isAdmin;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-blush/10 to-background">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif italic">Тюльпаны</h1>
          <p className="text-sm text-muted-foreground mt-1">админ-панель</p>
        </div>
        <form onSubmit={submit} className="bg-card rounded-3xl p-8 shadow-sm space-y-4">
          <h2 className="font-serif text-2xl">
            {mode === "signin" ? "Войти" : "Создать аккаунт"}
          </h2>

          {showNoAccess && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-xl p-3">
              У этого аккаунта нет прав администратора. Обратитесь к владельцу проекта,
              чтобы он добавил вашему пользователю роль admin в таблице user_roles.
            </div>
          )}

          <label className="block">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Email</div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Пароль</div>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "..." : mode === "signin" ? "Войти" : "Зарегистрироваться"}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
          >
            {mode === "signin" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
          Создайте аккаунт, затем владелец проекта должен добавить запись в таблицу <code>user_roles</code>{" "}
          с ролью <code>admin</code> для вашего пользователя.
        </p>
      </div>
    </div>
  );
}
