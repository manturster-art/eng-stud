import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "./Logo";
import { useTheme } from "./ThemeProvider";
import { Moon, Sun, LayoutDashboard, Pencil, Tv2, MessagesSquare, Settings as SettingsIcon, Sparkles, Brain, LogOut, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard, testId: "nav-dashboard", mobile: true },
  { href: "/log", label: "학습 기록", icon: Pencil, testId: "nav-log", mobile: true },
  { href: "/peppa", label: "페파피그", icon: Tv2, testId: "nav-peppa", mobile: false },
  { href: "/phrases", label: "표현 학습", icon: MessageSquareQuote, testId: "nav-phrases", mobile: true },
  { href: "/toeic", label: "토익 400문장", icon: MessagesSquare, testId: "nav-toeic", mobile: true },
  { href: "/quiz", label: "오늘의 퀴즈", icon: Brain, testId: "nav-quiz", mobile: true },
  { href: "/predict", label: "목표 예측", icon: Sparkles, testId: "nav-predict", mobile: false },
  { href: "/settings", label: "설정", icon: SettingsIcon, testId: "nav-settings", mobile: false },
];

// 모바일 바텀 네비 5개: 일일 학습 핵심 루틴 (Peppa·예측·설정은 사이드바·대시보드 카드로 접근)
const mobileNavItems = navItems.filter((item) => item.mobile);

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <span className="text-primary"><Logo size={26} /></span>
          <div className="leading-tight">
            <div className="font-semibold text-sm tracking-tight">Eight Months</div>
            <div className="text-[11px] text-muted-foreground">영어 학습 대시보드</div>
          </div>
        </div>
        <nav className="px-2.5 py-3 flex-1 space-y-0.5">
          {navItems.map((item) => {
            const active = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm hover-elevate active-elevate-2",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/85"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {user && (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-md" data-testid="text-current-user">
              {user.picture ? (
                <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full border border-sidebar-border" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold">
                  {(user.name || user.email || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 leading-tight">
                <div className="text-xs font-medium truncate">{user.name || "사용자"}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
              <button
                onClick={logout}
                data-testid="button-logout"
                title="로그아웃"
                className="p-1.5 rounded-md hover-elevate active-elevate-2 text-muted-foreground"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          )}
          <button
            data-testid="button-theme-toggle"
            onClick={toggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs hover-elevate active-elevate-2 border"
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 border-b bg-background/90 backdrop-blur z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 text-primary">
          <Logo size={22} />
          <span className="font-semibold text-sm text-foreground">Eight Months</span>
        </div>
        <button
          onClick={toggle}
          className="p-2 rounded-md border hover-elevate"
          data-testid="button-theme-toggle-mobile"
          title="테마 전환"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </div>
      <div className="md:hidden fixed bottom-0 inset-x-0 border-t bg-background z-30 flex justify-around">
        {mobileNavItems.map((item) => {
          const active = location === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`mobile-${item.testId}`}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 text-[10px]",
                active ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
