# syntax=docker/dockerfile:1.6

# ============================================================
# Stage 1: builder — devDependencies 포함 + Vite·esbuild 빌드
# Oracle AMD Micro (1GB RAM)에서는 빌드 OOM 위험 — GitHub Actions
# 또는 로컬에서 빌드한 이미지를 push하는 것을 권장.
# ============================================================
FROM node:22-slim AS builder

WORKDIR /app

# 의존성 캐시 레이어
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 + 빌드
COPY . .
RUN npm run build

# ============================================================
# Stage 2: runtime — production 의존성만 + dist/ 결과물
# better-sqlite3는 prebuild 바이너리 사용 (node:22-slim glibc 호환)
# ============================================================
FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

# production 의존성만 설치 (devDeps 제거하여 이미지 슬림화)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 빌드 결과물만 복사 (esbuild로 단일 파일 번들 + Vite 정적 자산)
COPY --from=builder /app/dist ./dist

# 영구 데이터 디렉토리. 컨테이너 실행 시 호스트 볼륨 마운트 권장:
#   docker run -v /host/path:/data -e DATABASE_PATH=/data/data.db ...
VOLUME ["/data"]

EXPOSE 8080

# 헬스체크 — Railway/Oracle 모두 동일하게 동작
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/auth/config').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.cjs"]
