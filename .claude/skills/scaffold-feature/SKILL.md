---
name: scaffold-feature
description: "eng-stud 영어 학습 대시보드에 신규 학습 모듈을 풀스택 스캐폴딩한다. shared/schema.ts → server/storage.ts → server/routes.ts → client/src/pages/*.tsx 4단 패턴을 기존 phrases/peppa/toeic 구현 그대로 따른다. '새 학습 모듈 추가', '동화 페이지 만들어줘', '발음 평가 기능', '어휘 카드 모듈', '기존 모듈에 북마크/SRS/마스터리 추가' 등 신규 또는 기능 확장 요청에 사용한다. 단순 문구 수정·CSS 조정·버그 픽스는 트리거하지 않는다."
---

# Scaffold Feature — eng-stud 모듈 스캐폴딩

## 작업 흐름

### Phase 0: 참조 표준 흡수
다음 중 최소 2개를 읽고 패턴을 머릿속에 흡수한 후 작성한다:
- `client/src/pages/Phrases.tsx` (최신 패턴, 최우선 참고)
- `client/src/pages/Peppa.tsx` (에피소드 + 확장 영역 패턴)
- `client/src/pages/Toeic.tsx` (SRS + 다이얼로그 패턴)
- `server/storage.ts` 의 `listPhrases`/`createPhrase`/`updatePhrase`/`deletePhrase`
- `server/routes.ts` 의 `/api/phrases` 블록

### Phase 1: shared/schema.ts

```ts
export const newTable = sqliteTable("new_table", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  // ... domain fields ...
  createdAt: text("created_at").notNull(),
});

export const insertNewTableSchema = createInsertSchema(newTable).omit({ id: true, userId: true });
export type InsertNewTable = z.infer<typeof insertNewTableSchema>;
export type NewTable = typeof newTable.$inferSelect;
```

`studyLogs`에 새 컬럼이 필요한 경우 같은 파일에 추가 후 storage.ts에 `safeAlter`도 같이 추가.

### Phase 2: server/storage.ts

CREATE TABLE 블록에 추가:
```sql
CREATE TABLE IF NOT EXISTS new_table (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL DEFAULT 0,
  ...
  created_at TEXT NOT NULL
);
```

기존 테이블에 컬럼 추가 시:
```ts
safeAlter("ALTER TABLE existing_table ADD COLUMN new_col INTEGER NOT NULL DEFAULT 0");
```

인덱스:
```ts
safeIndex("CREATE INDEX IF NOT EXISTS idx_new_table_user ON new_table(user_id)");
```

IStorage 인터페이스 + DatabaseStorage 클래스에 메서드 추가 — phrases 섹션을 모델로:
- `listX(userId)` — userId 스코프 SELECT
- `createX(userId, data)` — INSERT, createdAt 자동
- `updateX(userId, id, partial)` — userId AND id WHERE
- `deleteX(userId, id)` — userId AND id WHERE
- 도메인 특화 메서드 (예: `recordReview`)

`seedUserData()`가 신규 데이터 시드를 받아야 하면 시그니처 확장. auth.ts의 호출도 같이 수정.

### Phase 3: server/routes.ts

```ts
import { insertNewTableSchema } from "@shared/schema";
// ...
app.use("/api/x", requireAuth);

app.get("/api/x", async (req, res) => {
  const list = await storage.listX(req.auth!.userId);
  res.json(list);
});

app.post("/api/x", async (req, res) => {
  const parsed = insertNewTableSchema.safeParse({
    ...req.body,
    createdAt: req.body?.createdAt || new Date().toISOString(),
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
  const x = await storage.createX(req.auth!.userId, parsed.data);
  res.json(x);
});

app.patch("/api/x/:id", async (req, res) => {
  const partial = insertNewTableSchema.partial().safeParse(req.body);
  if (!partial.success) return res.status(400).json({ error: partial.error.issues });
  const x = await storage.updateX(req.auth!.userId, Number(req.params.id), partial.data);
  res.json(x);
});

app.delete("/api/x/:id", async (req, res) => {
  await storage.deleteX(req.auth!.userId, Number(req.params.id));
  res.json({ ok: true });
});
```

도메인 특화 액션 (예: `/api/x/:id/review`)은 별도 POST 라우트.

### Phase 4: client/src/pages/X.tsx

표준 레이아웃:
- 헤더 (제목 + 1줄 설명)
- KPI 카드 4~5개 (`grid grid-cols-2 sm:grid-cols-4 gap-3`)
- 전체 진척률 Progress 바
- 필터 (Tabs / Select / Search)
- 리스트 행 (`border rounded-lg p-3 sm:p-4 hover-elevate`)
- 액션 버튼 (`size="sm" h-7 px-2 text-xs gap-1`)
- `data-testid` 모든 인터랙티브 요소에 부여 (`row-x-${id}`, `button-action-${id}` 등)
- 모든 UI 문자열 한국어

TanStack Query:
```tsx
const { data: list = [] } = useQuery<X[]>({ queryKey: ["/api/x"] });
const updateMut = useMutation({
  mutationFn: async ({ id, partial }) => {
    const res = await apiRequest("PATCH", `/api/x/${id}`, partial);
    return res.json();
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/x"] }),
});
```

shadcn 컴포넌트만 사용: Card, Badge, Progress, Button, Input, Select, Tabs, Dialog, Label, Textarea. lucide-react 아이콘.

### Phase 5: 통합 (조건부)

| 통합 | 필요 조건 | 작업 |
|------|---------|------|
| 라우트 등록 | 신규 페이지 | `client/src/App.tsx` `<Route path="/x" component={XPage} />` |
| 네비게이션 | 신규 페이지 | `client/src/components/AppShell.tsx` `navItems` 추가, 모바일 바텀 5개 한도 확인 |
| Dashboard KPI | 학습 활동 모듈 | `client/src/pages/Dashboard.tsx` StatCard 추가 + grid 컬럼 조정 |
| Predict 가중치 | 진척 기여 모듈 | `client/src/lib/utils-study.ts` `predictGoal()` + breakdown + Predict.tsx breakdownItems |
| Heatmap | 일일 활동 기여 | `totalActivityMin()` 에 가산 |
| 시드 | 초기 데이터 필요 | `server/seed-*.ts` 신규 파일 + `seedUserData()` 확장 + `auth.ts` 호출 수정 |

### Phase 6: 출력

- 실제 파일 경로에 코드 작성
- `_workspace/01_scaffold/summary.md`:
  ```markdown
  # Scaffold Summary
  ## 변경 파일
  - shared/schema.ts (수정): newTable 추가
  - server/storage.ts (수정): listX/createX/... 추가
  - ...
  ## 핵심 결정
  - 마스터리 임계 = 3 (phrases 패턴 따름)
  - ...
  ## 미해결
  - 시드 데이터 필요 → _workspace/scaffold-needs-content.md 참조
  ```
- 시드 필요 시 `_workspace/scaffold-needs-content.md`에 종류·범위·수량 명세

## 절대 하지 말 것
- 새 npm 의존성 추가 (shadcn/ui로 충분)
- userId 누락
- 한글 라벨 누락
- `data.db` 직접 조작
- 요청하지 않은 abstraction·"미래 대비" 코드
- 직접 시드 데이터 작성 (content-curator의 영역)
- 자기 코드 자가 검토 (module-reviewer의 영역)
