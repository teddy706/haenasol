// Hanasol 구구단 저장/대시보드 스크립트
// 스프레드시트 편집기에서: 코드 붙여넣기 → setup() 실행 → 웹 앱 배포 → buildDashboard() 실행

const SHEET_SUMMARY = 'GUGUDAN_SUMMARY';
const SHEET_QUESTIONS = 'GUGUDAN_QUESTIONS';
const SHEET_DASHBOARD = 'DASHBOARD';

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function setup() {
  const summaryHeaders = [
    'Timestamp','SessionId','Player','Mode','Dan','Total','Correct','StartedAt','FinishedAt','DurationMs','UserAgent','DetailsJSON'
  ];
  const questionHeaders = [
    'Timestamp','SessionId','Player','Mode','Dan','A','B','User','CorrectAns','Correct','TimeMs','UserAgent'
  ];
  const dashHeaders = ['DASHBOARD'];

  getOrCreateSheet_(SHEET_SUMMARY, summaryHeaders);
  getOrCreateSheet_(SHEET_QUESTIONS, questionHeaders);
  const dash = getOrCreateSheet_(SHEET_DASHBOARD, dashHeaders);
  dash.setFrozenRows(1);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const ss = SpreadsheetApp.getActive();
    const now = new Date();
    const sessionId = data.startedAt || (data.details && data.details[0] && data.details[0].startedAt) || now.toISOString();

    if (data.type === 'gugudan_q') {
      const q = (data.details && data.details[0]) || {};
      const sh = ss.getSheetByName(SHEET_QUESTIONS) || ss.insertSheet(SHEET_QUESTIONS);
      const row = [
        now,
        sessionId,
        data.player || '',
        data.mode || '',
        data.dan || '',
        q.a != null ? q.a : '',
        q.b != null ? q.b : '',
        q.user != null ? q.user : '',
        q.correctAns != null ? q.correctAns : '',
        q.correct ? 1 : 0,
        q.timeMs != null ? q.timeMs : '',
        data.userAgent || ''
      ];
      sh.appendRow(row);
    } else {
      const sh = ss.getSheetByName(SHEET_SUMMARY) || ss.insertSheet(SHEET_SUMMARY);
      const row = [
        now,
        sessionId,
        data.player || '',
        data.mode || '',
        data.dan || '',
        data.total != null ? data.total : '',
        data.correct != null ? data.correct : '',
        data.startedAt || '',
        data.finishedAt || '',
        data.durationMs != null ? data.durationMs : '',
        data.userAgent || '',
        JSON.stringify(data.details || [])
      ];
      sh.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildDashboard() {
  const ss = SpreadsheetApp.getActive();
  const dash = ss.getSheetByName(SHEET_DASHBOARD) || ss.insertSheet(SHEET_DASHBOARD);
  dash.clear();

  // 타이틀
  dash.getRange('A1').setValue('Hanasol 구구단 대시보드');
  dash.getRange('A1').setFontWeight('bold').setFontSize(16);

  // KPI 섹션
  dash.getRange('A3').setValue('지표');
  dash.getRange('A4').setValue('총 세션 수');
  dash.getRange('B4').setFormula('=COUNTA(' + SHEET_SUMMARY + '!A2:A)');

  dash.getRange('A5').setValue('평균 점수(개)');
  dash.getRange('B5').setFormula('=IFERROR(AVERAGE(' + SHEET_SUMMARY + '!G2:G),0)');

  dash.getRange('A6').setValue('평균 정답률');
  dash.getRange('B6').setFormula('=IFERROR(AVERAGE(ArrayFormula(' + SHEET_SUMMARY + '!G2:G / ' + SHEET_SUMMARY + '!F2:F)),0)');

  dash.getRange('A7').setValue('평균 소요 시간(초)');
  dash.getRange('B7').setFormula('=IFERROR(AVERAGE(' + SHEET_SUMMARY + '!J2:J)/1000,0)');

  // 단별 평균 정답(개) 테이블
  dash.getRange('D3').setValue('단별 평균 정답(개)');
  dash.getRange('D4').setFormula('=QUERY(' + SHEET_SUMMARY + '!E2:G, "select E, avg(G) where E is not null group by E label avg(G) \'평균 정답\'", 1)');

  // 모드별 정답률(문제 단위) 테이블
  dash.getRange('I3').setValue('모드별 정답률');
  dash.getRange('I4').setFormula('=QUERY(' + SHEET_QUESTIONS + '!D2:K, "select D, avg(J) where D is not null group by D label avg(J) \'정답률\'", 1)');

  // 최근 세션 10개 테이블
  dash.getRange('A10').setValue('최근 세션 10개');
  dash.getRange('A11').setFormula('=QUERY(' + SHEET_SUMMARY + '!A2:K, "select A,C,E,D,G,F,J order by A desc limit 10 label A \'기록시간\', C \'이름\', E \'단\', D \'모드\', G \'정답\', F \'총문항\', J \'소요ms\'", 1)');

  // 차트: 단별 평균 정답(개)
  const chart1 = dash.newChart()
    .asColumnChart()
    .addRange(dash.getRange('D5:E14'))
    .setPosition(3, 7, 0, 0)
    .setOption('title', '단별 평균 정답(개)')
    .build();
  dash.insertChart(chart1);

  // 차트: 모드별 정답률
  const chart2 = dash.newChart()
    .asColumnChart()
    .addRange(dash.getRange('I5:J14'))
    .setPosition(3, 11, 0, 0)
    .setOption('title', '모드별 정답률')
    .setOption('vAxis.viewWindow', { min: 0, max: 1 })
    .build();
  dash.insertChart(chart2);

  // 차트: 점수 추이(요약 시트 사용)
  const sum = ss.getSheetByName(SHEET_SUMMARY);
  if (sum) {
    const lastRow = Math.max(2, sum.getLastRow());
    const chart3 = dash.newChart()
      .asLineChart()
      .addRange(sum.getRange(1, 1, lastRow - 1, 7)) // A:G (도메인: Timestamp, 시리즈 포함)
      .setPosition(18, 1, 0, 0)
      .setOption('title', '세션별 점수 추이')
      .setOption('legend.position', 'none')
      .build();
    dash.insertChart(chart3);
  }
}

