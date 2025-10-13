# Hanasol 구구단: 스프레드시트 스키마 & 대시보드 가이드

이 문서는 구글 스프레드시트에 저장되는 데이터의 시트 구조(컬럼 체계)와,
간단한 대시보드를 만드는 방법(Apps Script/수식)을 안내합니다.

## 시트 구조

다음 3개 시트를 추천합니다.

- `GUGUDAN_SUMMARY` — 게임 1판(9문제) 요약 기록
- `GUGUDAN_QUESTIONS` — 문제 1개 단위의 세부 기록
- `DASHBOARD` — 지표/차트 시각화 전용 시트

### GUGUDAN_SUMMARY (열)

1. `Timestamp` — 서버 기록 시각(now)
2. `SessionId` — 세션 식별값(가능하면 startedAt 사용)
3. `Player` — 이름(선택)
4. `Mode` — sequential / reverse / random
5. `Dan` — 2~9
6. `Total` — 총 문항 수(기본 9)
7. `Correct` — 맞힌 개수
8. `StartedAt` — ISO 문자열
9. `FinishedAt` — ISO 문자열
10. `DurationMs` — 총 소요 시간(ms)
11. `UserAgent` — 브라우저 UA
12. `DetailsJSON` — 세부 기록 전체(JSON 문자열, 선택)

### GUGUDAN_QUESTIONS (열)

1. `Timestamp` — 서버 기록 시각(now)
2. `SessionId` — 세션 식별값(요약의 StartedAt 권장)
3. `Player` — 이름(선택)
4. `Mode` — sequential / reverse / random
5. `Dan` — 2~9
6. `A` — 단(=dan)
7. `B` — 곱해지는 수(1~9)
8. `User` — 사용자가 입력한 값(null 허용)
9. `CorrectAns` — 정답
10. `Correct` — 정오(1 또는 0)
11. `TimeMs` — 해당 문제 소요 시간(ms)
12. `UserAgent` — 브라우저 UA

## Apps Script로 자동 셋업/저장/대시보드 만들기

1) 스프레드시트 → 도구 → 앱스 스크립트 열기

2) `scripts/google_apps_script.gs` 파일 내용을 복사해 붙여넣기

3) 상단 실행 버튼으로 `setup()` 실행(권한 승인 필요). 시트와 헤더가 자동 생성됩니다.

4) 배포 → 새 배포 → 유형: 웹 앱
- 실행 사용자: 본인
- 접근 권한: 누구나
- 발급된 웹 앱 URL을 `gugudan.html`에 연결(meta/전역변수/설정 버튼 중 택1)

5) `buildDashboard()` 실행하면 `DASHBOARD` 시트에 수치/차트가 생성됩니다.

## 대시보드 주요 수식(시트에서 직접 써도 OK)

- 총 세션 수: `=COUNTA(GUGUDAN_SUMMARY!A2:A)`
- 평균 점수(개): `=IFERROR(AVERAGE(GUGUDAN_SUMMARY!G2:G),0)`
- 평균 정답률: `=IFERROR(AVERAGE(ArrayFormula(GUGUDAN_SUMMARY!G2:G / GUGUDAN_SUMMARY!F2:F)),0)`
- 평균 소요 시간(초): `=IFERROR(AVERAGE(GUGUDAN_SUMMARY!J2:J)/1000,0)`

테이블(차트용 데이터):

- 단별 평균 정답(개):
  `=QUERY(GUGUDAN_SUMMARY!E2:G, "select E, avg(G) where E is not null group by E label avg(G) '평균 정답'", 1)`

- 모드별 정답률(문제 단위):
  `=QUERY(GUGUDAN_QUESTIONS!D2:K, "select D, avg(J) where D is not null group by D label avg(J) '정답률'", 1)`

- 최근 세션 10개:
  `=QUERY(GUGUDAN_SUMMARY!A2:K, "select A,C,E,D,G,F,J order by A desc limit 10 label A '기록시간', C '이름', E '단', D '모드', G '정답', F '총문항', J '소요ms'", 1)`

## 문제 해결 팁

- 새 코드로 바꾼 뒤에는 “배포 → 새 버전”으로 다시 배포해야 URL이 최신 로직을 사용합니다.
- CORS 이슈를 피하려면 클라이언트에서 헤더를 추가하지 않고 `text/plain` 본문으로 전송하세요(이 프로젝트는 이미 그렇게 동작합니다).
- 시트명이 다르면 스크립트 상단 상수(SHEET_…)를 변경하세요.

