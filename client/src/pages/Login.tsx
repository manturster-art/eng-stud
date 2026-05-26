import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GraduationCap, Sparkles, BookOpen, Trophy, LogIn } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS load failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("GIS load failed"));
    document.head.appendChild(s);
  });
}

export default function Login() {
  const { loginWithGoogleCredential, loginWithPassword } = useAuth();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);

  const [passwordAuthEnabled, setPasswordAuthEnabled] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfgRes = await apiRequest("GET", "/api/auth/config");
        const cfg = await cfgRes.json();
        if (cancelled) return;

        setPasswordAuthEnabled(Boolean(cfg.passwordAuthEnabled));

        // Google은 ACCESS_PASSWORD가 설정되지 않은 경우에만 시도 (없으면 데모용 Client ID라 origin 등록 불가)
        const tryGoogle = !cfg.passwordAuthEnabled && cfg.googleClientId;
        if (!tryGoogle) return;

        await loadGoogleScript();
        if (cancelled) return;
        if (!window.google?.accounts?.id) throw new Error("Google SDK 미로딩");
        window.google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: async (response: any) => {
            try {
              await loginWithGoogleCredential(response.credential);
              toast({ title: "환영합니다", description: "로그인되었습니다." });
            } catch (e: any) {
              setError(e?.message || "로그인 실패");
              toast({ title: "로그인 실패", description: e?.message ?? "다시 시도해 주십시오.", variant: "destructive" });
            }
          },
          ux_mode: "popup",
          auto_select: false,
        });
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "signin_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: 320,
          });
        }
        setGoogleEnabled(true);
      } catch (e: any) {
        // Google 초기화 실패는 비밀번호 인증이 활성화된 경우 무시
        if (!passwordAuthEnabled) setError(e?.message || "초기화 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogleCredential, toast, passwordAuthEnabled]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPassword(password);
      toast({ title: "환영합니다", description: "로그인되었습니다." });
    } catch (e: any) {
      const msg = e?.message?.includes("401") ? "비밀번호가 올바르지 않습니다." : (e?.message || "로그인 실패");
      setError(msg);
      toast({ title: "로그인 실패", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-6">
      <Card className="w-full max-w-md border-border/60 shadow-lg" data-testid="card-login">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <CardTitle className="text-xl font-bold">영어 학습 대시보드</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            8개월 맞춤 학습 계획에 오신 것을 환영합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-5">
            {passwordAuthEnabled && (
              <form onSubmit={handlePasswordSubmit} className="w-full space-y-3" data-testid="form-password-login">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">접근 비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    autoFocus
                    autoComplete="current-password"
                    data-testid="input-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-1.5"
                  disabled={submitting}
                  data-testid="button-password-login"
                >
                  <LogIn className="size-4" />
                  {submitting ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            )}

            {googleEnabled && (
              <>
                {passwordAuthEnabled && (
                  <div className="w-full flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="flex-1 border-t" />
                    또는
                    <div className="flex-1 border-t" />
                  </div>
                )}
                <div ref={buttonRef} data-testid="button-google-signin" className="min-h-[44px] flex items-center justify-center" />
              </>
            )}

            {!passwordAuthEnabled && !googleEnabled && !error && (
              <p className="text-xs text-muted-foreground">로그인 방법을 준비 중입니다...</p>
            )}

            {error && (
              <p className="text-xs text-destructive" data-testid="text-login-error">{error}</p>
            )}

            <div className="w-full pt-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground text-center mb-3">로그인 후 이용 가능한 기능</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-[11px] text-muted-foreground">학습 기록</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-[11px] text-muted-foreground">매일 퀴즈</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-[11px] text-muted-foreground">목표 추적</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
