---
name: curate-content
description: "eng-stud 학습 콘텐츠 시드 데이터를 큐레이션한다. Peppa Pig 시즌별 핵심 표현, TOEIC 발췌, 일상 회화 표현, 향후 영어 동화·팟캐스트 등 어떤 콘텐츠든 한국 학습자 관점에서 PlayPhrase 검색 적합성(3~6단어)과 자연스러운 한글 의역을 갖춘 시드 데이터를 생성한다. 'Peppa S{n} 표현 추가', '일상회화 N개 더', 'TOEIC 카테고리 발췌', '신규 카테고리(비즈니스/여행 등)', '신규 도메인(동화/팟캐스트) 콘텐츠' 요청에 사용한다."
---

# Curate Content — 영어 학습 시드 큐레이션

## 작업 흐름

### Phase 0: 기존 시드 흡수
**작성 전에 반드시** 다음을 읽는다:
- `server/seed-phrases.ts` (일반 표현)
- `server/seed-peppa-phrases.ts` (Peppa S1 E1~E10)
- 도메인이 다르면 해당 시드 파일 + schema의 관련 테이블

목적:
- 동일·유사 표현 회피 (중복 검사)
- 기존 카테고리 파악 (재사용 우선)
- 데이터 포맷 일치 (필드, 출처 라벨 형식)

### Phase 1: 데이터 포맷 (phrases 기준)

```ts
{
  phraseEn: string,    // 3~6단어, PlayPhrase 검색 가능한 표현
  phraseKo: string,    // 20자 이내, 자연스러운 의역
  category: string,    // greeting | feeling | daily | agreement | request | (신규)
}
```

Peppa 표현이면:
```ts
{ season: 1, episode: 3, phraseEn, phraseKo, category }
```

### Phase 2: 큐레이션 기준

#### PlayPhrase 최적화
- 영화·드라마 대사에서 흔히 나오는 표현
- 3~6단어 (너무 길면 검색 매칭률 급락)
- 고유명사·시대 한정 표현 제외
- ✅ "What's up with you" / ❌ "The thermodynamic equilibrium of"

#### 한글 번역
- 직역 ❌ → 의역 ✅
- "Help yourself" → "마음껏 드세요" (✅) / "스스로를 도와라" (❌)
- 존댓말 기본 (학습자 대상)
- 20자 이내

#### 카테고리 분류
기존 5개(`greeting`/`feeling`/`daily`/`agreement`/`request`) 우선 재사용. 신규 추가는:
- 기존 5개로 분류가 부자연스러운 표현이 **5개 이상** 모일 때만
- 영어 한 단어 소문자 (예: `business`, `travel`)
- summary.md에 신규 카테고리 근거 명시

#### 중복 검사
- 영문 표현 lowercase 비교로 동일 검사
- 핵심 단어 3개 이상 일치하면 유사 표현으로 간주
- 50% 이상 중복 발생 시 신규 생성 멈추고 summary.md에 명시 (오케스트레이터가 범위 조정)

### Phase 3: 콘텐츠 종류별 가이드

#### Peppa Pig 에피소드 표현
- 에피소드당 3개 (대표 표현 1, 반복 표현 1, 학습 가치 1)
- IMDB/Wikipedia/팬위키 검색으로 줄거리·핵심 대사 파악
- 출처 라벨: 자동 채워짐 (storage에서 episode 매핑)
- 출력: `_workspace/02_curate/seed-data.ts`에 `SeedPeppaPhrase[]` 배열

#### 일상 회화 (일반 시드)
- 카테고리별 균등 분포 권장
- 출력: `_workspace/02_curate/seed-data.ts`에 `SeedPhrase[]` 배열

#### TOEIC 발췌
- 단발성은 페이지 다이얼로그로 사용자가 직접 (curator 대상 아님)
- 일괄: 카테고리별 핵심 표현 자동 추출 → `POST /api/phrases` bulk insert 명세

#### 신규 도메인 (동화/팟캐스트 등)
- 새 source 타입이 필요하면 scaffold-feature에 위임 (schema 확장)
- curator는 데이터 본체만 생성
- 출력: `_workspace/02_curate/seed-data.ts` + 새 시드 파일 경로 제안

### Phase 4: 출력

`_workspace/02_curate/seed-data.ts`:
```ts
// 즉시 import 가능한 형태
import type { ... } from "@shared/schema";

export const newSeedData = [
  { phraseEn: "...", phraseKo: "...", category: "..." },
  // ...
];
```

`_workspace/02_curate/summary.md`:
```markdown
# Curate Summary

## 생성 수량
- 총 N개

## 카테고리 분포
| 카테고리 | 개수 |
|---------|------|
| greeting | 5 |
| ...

## 출처
| 출처 | 개수 |
|------|------|
| Peppa S2E01 ~ S2E10 | 30 |
| ...

## 중복 회피
- 검사 대상: phrases (60) + peppa (30) = 90개
- 중복 후보 N건 → 모두 재작성

## 신규 카테고리 (있다면)
- `business`: 근거 — ...

## 미해결
- (있다면)
```

**중요:** 실제 `server/seed-*.ts` 수정은 reviewer 통과 후 오케스트레이터가 결정. curator는 `_workspace/`에만 쓴다.

## 절대 하지 말 것
- 7단어 이상 표현 (PlayPhrase 검색 실패)
- 동일 영어 표현 중복 (배열 내·기존 시드와)
- 자동번역기 톤의 한글 ("당신은 어떻게 지내고 있습니까?")
- 신규 카테고리 남발
- 실제 `server/seed-*.ts` 직접 수정 (reviewer가 한다)
