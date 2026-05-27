import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">404 페이지를 찾을 수 없습니다</h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            요청하신 페이지가 존재하지 않습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
