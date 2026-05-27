# Oracle Cloud 배포 가이드

Oracle Cloud Always Free 티어로 eng-stud를 호스팅하는 단계별 가이드입니다.
Railway 비용($5/월) 회피 + 한국 리전 + 영구 무료.

## 준비물

- 신용카드 (검증용, 청구 없음)
- 본인 도메인 (선택 — Cloudflare Tunnel 사용 시 필요)
- 1~3시간 시간

## 1. Oracle Cloud 가입

1. https://signup.oraclecloud.com 접속
2. 이메일·국가(South Korea)·이름 입력
3. 이메일 인증 + 휴대전화 인증
4. 신용카드 등록 (Always Free만 사용하면 청구 0원, 검증용)
5. 가입 완료 → Home Region 선택 시 **Seoul (ap-seoul-1)** 또는 **Chuncheon (ap-chuncheon-1)** 권장

> 가입 거부되는 경우: 브라우저 변경, VPN 끄기, 다른 카드 시도. 일부 prepaid·virtual 카드 거부됨.

## 2. ARM A1 시도 → 실패 시 AMD Micro

### 2-A. ARM A1 (사양 강력, capacity 부족 빈번)

1. 좌측 메뉴 → **Compute → Instances → Create Instance**
2. **Image**: Canonical Ubuntu 22.04 (Always Free 표시)
3. **Shape**: **VM.Standard.A1.Flex** 선택 → OCPU 4, RAM 24GB
4. SSH 키: **Generate a key pair for me** → Private/Public 둘 다 다운로드
5. **Create** 클릭
6. "Out of capacity" 에러 시 → 시간 두고 재시도하거나 2-B로

### 2-B. AMD E2 Micro (즉시 가능, 사양 작음)

1. 동일하게 Create Instance
2. **Shape**: **VM.Standard.E2.1.Micro** (Always Free 표시)
3. 나머지 동일

## 3. 네트워크 (포트 열기)

기본적으로 OCI는 80/443 막혀 있음. 두 곳에서 열어야 함.

### 3-A. VCN Security List (Oracle 측)

1. 좌측 메뉴 → **Networking → Virtual Cloud Networks**
2. 본인 VCN 클릭 → **Security Lists** → Default Security List
3. **Add Ingress Rules**:
   - Source CIDR: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port Range: `80,443`
4. 저장

### 3-B. Ubuntu 방화벽 (인스턴스 측)

SSH 접속 후 (다음 단계):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. SSH 접속

```bash
# Mac/Linux/WSL
chmod 600 ~/Downloads/ssh-key-2026-*.key
ssh -i ~/Downloads/ssh-key-2026-*.key ubuntu@<공인 IP>

# Windows PowerShell
ssh -i C:\Users\xxx\Downloads\ssh-key-2026-xxx.key ubuntu@<공인 IP>
```

공인 IP는 인스턴스 상세 페이지 상단에 표시됨.

## 5. 시스템 셋업

```bash
# 1. 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# 2. Docker 설치
sudo apt install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
# 재로그인 (exit 후 다시 SSH) — docker 그룹 적용

# 3. AMD micro만: swap 2GB 추가 (RAM 1GB라 빌드/부팅에 필요)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. 방화벽 (3-B 참조)
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

## 6. eng-stud 배포

### 6-A. 옵션 A: 인스턴스에서 직접 빌드 (간단, 시간 5~10분)

ARM A1이면 자원 여유 있어서 추천. AMD micro면 swap 켜고 진행.

```bash
# 1. 코드 받기
git clone https://github.com/manturster-art/eng-stud.git
cd eng-stud
git checkout claude/english-learning-peppa-pig-a24is  # 또는 main 머지 후 main

# 2. Docker 이미지 빌드
docker build -t eng-stud:latest .

# 3. 영구 데이터 디렉토리 + 환경변수
mkdir -p ~/eng-stud-data

# 4. 실행
docker run -d \
  --name eng-stud \
  --restart unless-stopped \
  -p 80:8080 \
  -v ~/eng-stud-data:/data \
  -e DATABASE_PATH=/data/data.db \
  -e JWT_SECRET=$(openssl rand -hex 48) \
  -e INVITE_CODE=peppa-invite-2026 \
  eng-stud:latest

# 5. 로그 확인
docker logs -f eng-stud
```

### 6-B. 옵션 B: GitHub Actions로 빌드 → GHCR Pull (권장, AMD micro)

GitHub Actions가 빌드 → GitHub Container Registry에 push → 인스턴스는 pull만.
빌드 메모리 부족 회피 + 배포 자동화.

자세한 설정은 별도 가이드 참조. 일단 6-A 진행 권장.

## 7. 접속 테스트

```bash
curl http://localhost:8080/api/auth/config
# {"googleClientId":"...","signupEnabled":true}
```

외부에서:
```
http://<공인 IP>/api/auth/config
```

브라우저로 `http://<공인 IP>` → 로그인 폼 보여야 정상.

> 이 시점에선 HTTP. HTTPS는 다음 단계.

## 8. 도메인 + HTTPS (Cloudflare Tunnel 권장)

### 왜 Cloudflare Tunnel?
- 무료
- 포트 80/443을 인터넷에 노출 안 함 (보안)
- HTTPS 자동
- 본인 도메인 필요 (Cloudflare 네임서버 사용)

### 셋업

1. **도메인 준비**: 본인 도메인을 Cloudflare DNS로 옮기기 (무료)
2. **Cloudflare Zero Trust 가입** (무료)
3. **Tunnel 생성**:
   ```
   Zero Trust → Networks → Tunnels → Create a tunnel
   → Cloudflared 선택
   → 토큰 받기
   ```
4. 인스턴스에서 설치:
   ```bash
   # AMD64
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   sudo cloudflared service install <받은 토큰>
   ```
   ARM이면 `cloudflared-linux-arm64.deb`
5. Tunnel 설정에서 **Public Hostname** 추가:
   - Subdomain: `eng-stud` (또는 원하는 이름)
   - Domain: 본인 도메인
   - Service: HTTP, URL `localhost:80`
6. 저장 → `https://eng-stud.본인도메인.com` 으로 접속 가능

### 또는 더 단순: Caddy로 직접 HTTPS

본인 도메인을 인스턴스 IP로 A 레코드 연결 후:

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```
```
eng-stud.본인도메인.com {
  reverse_proxy localhost:80
}
```
```bash
sudo systemctl reload caddy
```

Let's Encrypt 인증서 자동 발급됨.

## 9. Idle 회수 회피 (Always Free 정책)

Oracle Always Free는 7일간 CPU 평균 20% 미만이면 회수 위험. 가벼운 cron으로 회피:

```bash
crontab -e
```
```
*/5 * * * * /bin/dd if=/dev/zero of=/dev/null bs=1M count=50 > /dev/null 2>&1
```
(5분마다 5초간 CPU 사용)

## 10. Railway 마이그레이션 (선택)

Oracle Cloud에서 정상 동작 확인 후:

1. Railway 영구 볼륨에서 SQLite 백업 다운로드 (Railway CLI 또는 콘솔)
2. Oracle 인스턴스의 `~/eng-stud-data/`로 업로드
3. `docker restart eng-stud`
4. 동작 확인 후 Railway 서비스 삭제

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 외부 접속 시 timeout | 80 포트 닫힘 | Section 3-A, 3-B 확인 |
| Docker build OOM | RAM 1GB 부족 | swap 추가 (Section 5-3) 또는 옵션 B |
| Cannot find module 'better-sqlite3' | npm ci 실패 | 컨테이너 내부에서 `npm rebuild better-sqlite3` |
| Cloudflare Tunnel 연결 안 됨 | 토큰 잘못 / cloudflared 미실행 | `sudo systemctl status cloudflared` |
| 자동 시작 안 됨 | `--restart unless-stopped` 빠짐 | `docker update --restart unless-stopped eng-stud` |

## 비용 모니터링

OCI 콘솔 → Cost Management → Cost Analysis. Always Free 한도 안에 있으면 $0.
한도 초과 시 알림 설정: Budgets → Create Budget → 임계 $1.

## 참고 링크

- Oracle Always Free: https://www.oracle.com/cloud/free/
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- Caddy: https://caddyserver.com/docs/quick-starts/reverse-proxy
