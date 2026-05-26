import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GraduationCap, Sparkles, BookOpen, Trophy, LogIn, UserPlus } from "lucide-react";

export default function Login() {
  const { loginWithUsername, registerWithInvite } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfgRes = await apiRequest("GET", "/api/auth/config");
        const cfg = await cfgRes.json();
        if (cancelled) return;
        setSignupEnabled(Boolean(cfg.signupEnabled));
      } catch {
        // config 실패해도 로그인은 시도 가능
      } finally {
        if (!cancelled) setConfigLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("사용자명과 비밀번호를 모두 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginWithUsername(username.trim(), password);
      toast({ title: "환영합니다", description: "로그인되었습니다." });
    } catch (e: any) {
      const msg = e?.message?.includes("401") ? "사용자명 또는 비밀번호가 올바르지 않습니다." : (e?.message || "로그인 실패");
      setError(msg);
      toast({ title: "로그인 실패", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password || !inviteCode.trim()) {
      setError("모든 항목을 입력해 주세요.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username.trim())) {
      setError("사용자명은 영문/숫자/-/_ 조합 3~32자여야 합니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerWithInvite(username.trim(), password, inviteCode.trim());
      toast({ title: "환영합니다", description: "가입 후 자동 로그인되었습니다." });
    } catch (e: any) {
      const raw = e?.message || "";
      let msg = "가입 실패";
      if (raw.includes("invalid invite code")) msg = "초대코드가 올바르지 않습니다.";
      else if (raw.includes("username already taken")) msg = "이미 사용 중인 사용자명입니다.";
      else if (raw.includes("username must be")) msg = "사용자명 형식이 올바르지 않습니다 (영문/숫자/-/_ 3~32자).";
      else if (raw.includes("password must be")) msg = "비밀번호는 6자 이상이어야 합니다.";
      else if (raw.includes("signup is disabled")) msg = "신규 가입이 비활성화되어 있습니다.";
      else if (raw) msg = raw;
      setError(msg);
      toast({ title: "가입 실패", description: msg, variant: "destructive" });
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
        <CardContent className="pt-4">
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "login" | "register"); setError(null); }}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login" data-testid="tab-login">로그인</TabsTrigger>
              <TabsTrigger value="register" disabled={!signupEnabled} data-testid="tab-register">
                회원가입
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="pt-4">
              <form onSubmit={handleLogin} className="space-y-3" data-testid="form-login">
                <div className="space-y-1.5">
                  <Label htmlFor="login-username" className="text-xs">사용자명</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="예: peppa"
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs">비밀번호</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="비밀번호"
                    data-testid="input-login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gap-1.5"
                  disabled={submitting}
                  data-testid="button-login"
                >
                  <LogIn className="size-4" />
                  {submitting ? "로그인 중..." : "로그인"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="pt-4">
              {!signupEnabled && configLoaded && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  신규 가입이 비활성화되어 있습니다. 관리자에게 초대를 요청해 주세요.
                </p>
              )}
              {signupEnabled && (
                <form onSubmit={handleRegister} className="space-y-3" data-testid="form-register">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-username" className="text-xs">사용자명</Label>
                    <Input
                      id="reg-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      placeholder="영문/숫자/-/_ 3~32자"
                      data-testid="input-reg-username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-xs">비밀번호</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="6자 이상"
                      data-testid="input-reg-password"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-invite" className="text-xs">초대코드</Label>
                    <Input
                      id="reg-invite"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="관리자에게 받은 초대코드"
                      data-testid="input-reg-invite"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full gap-1.5"
                    disabled={submitting}
                    data-testid="button-register"
                  >
                    <UserPlus className="size-4" />
                    {submitting ? "가입 중..." : "가입하고 시작"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <p className="text-xs text-destructive text-center mt-3" data-testid="text-login-error">{error}</p>
          )}

          <div className="w-full pt-5 mt-4 border-t border-border/60">
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
        </CardContent>
      </Card>
    </div>
  );
}
