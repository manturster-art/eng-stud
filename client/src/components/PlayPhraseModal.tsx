import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertTriangle, Volume2 } from "lucide-react";
import { speakEnglish } from "@/lib/utils-study";

export function playphraseUrl(phrase: string): string {
  return `https://www.playphrase.me/#/search?q=${encodeURIComponent(phrase)}&language=en`;
}

interface PlayPhraseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phraseEn: string;
  phraseKo?: string;
  sourceLabel?: string;
  onOpenedInNewTab?: () => void;
}

export function PlayPhraseModal({
  open,
  onOpenChange,
  phraseEn,
  phraseKo,
  sourceLabel,
  onOpenedInNewTab,
}: PlayPhraseModalProps) {
  const url = playphraseUrl(phraseEn);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmbedBlocked(false);
      setLoaded(false);
      return;
    }
    const timer = window.setTimeout(() => {
      // 3초 내에 로드되지 않으면 임베드 차단으로 간주
      if (!loaded) setEmbedBlocked(true);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [open, loaded]);

  const openNewTab = () => {
    window.open(url, "_blank", "noopener,noreferrer");
    onOpenedInNewTab?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" data-testid="dialog-playphrase">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2 flex-wrap">
            <span className="font-medium">{phraseEn}</span>
            <button
              type="button"
              onClick={() => speakEnglish(phraseEn)}
              className="p-1 rounded-md text-muted-foreground hover:text-primary hover-elevate active-elevate-2"
              title="영어 발음 듣기"
              data-testid="button-speak-modal"
            >
              <Volume2 className="size-3.5" />
            </button>
            {sourceLabel && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {sourceLabel}
              </Badge>
            )}
          </DialogTitle>
          {phraseKo && (
            <DialogDescription className="text-xs pt-0.5">
              {phraseKo}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="relative">
          <div className="aspect-video w-full rounded-md overflow-hidden border bg-muted/30">
            <iframe
              ref={iframeRef}
              src={url}
              title={`PlayPhrase: ${phraseEn}`}
              className="w-full h-full"
              onLoad={() => setLoaded(true)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
              allow="autoplay; encrypted-media"
              data-testid="iframe-playphrase"
            />
          </div>

          {embedBlocked && (
            <div className="mt-3 rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-xs leading-relaxed flex gap-2">
              <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-foreground">임베드가 차단된 것 같습니다</p>
                <p className="text-muted-foreground mt-0.5">
                  PlayPhrase.me가 iframe 임베딩을 허용하지 않을 수 있습니다. 아래
                  "새 탭에서 열기" 버튼으로 직접 확인해 주세요.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-[11px] text-muted-foreground">
            영화·드라마 클립으로 실제 발화 컨텍스트를 확인하실 수 있습니다.
          </p>
          <Button
            type="button"
            onClick={openNewTab}
            className="gap-1.5"
            data-testid="button-open-new-tab"
          >
            <ExternalLink className="size-3.5" />
            새 탭에서 열기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
