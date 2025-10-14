// Hanasol 게임 저장/대시보드 스크립트
// 스프레드시트 편집기에서: 코드 붙여넣기 → setup() 실행 → 웹 앱 배포 → buildDashboard() 실행

const SHEET_GUGUDAN_SUMMARY = 'GUGUDAN_SUMMARY';
const SHEET_GUGUDAN_QUESTIONS = 'GUGUDAN_QUESTIONS';
const SHEET_ARITHMETIC_SUMMARY = 'ARITHMETIC_SUMMARY';
const SHEET_ARITHMETIC_QUESTIONS = 'ARITHMETIC_QUESTIONS';
const SHEET_SPELLING_SUMMARY = 'SPELLING_SUMMARY';
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
  const guguSummaryHeaders = ['Timestamp','SessionId','Player','Mode','Dan','Total','Correct','BestStreak','StartedAt','FinishedAt','DurationMs','UserAgent','QuestionList','DetailsJSON'];
  const guguQuestionHeaders = ['Timestamp','SessionId','Player','Mode','Dan','A','B','QuestionText','AnswerText','User','CorrectAns','Correct','StreakAfter','BestStreak','TimeMs','UserAgent'];
  const arithSummaryHeaders = ['Timestamp','SessionId','Player','Mode','Total','Correct','BestStreak','StartedAt','FinishedAt','DurationMs','UserAgent','DetailsJSON'];
  const arithQuestionHeaders = ['Timestamp','SessionId','Player','Mode','A','B','Operator','QuestionText','AnswerText','User','CorrectAns','Correct','StreakAfter','BestStreak','TimeMs','UserAgent'];
  const spellingSummaryHeaders = ['Timestamp','SessionId','Player','Level','Total','Correct','StartedAt','FinishedAt','DurationMs','UserAgent','DetailsJSON'];
  const dashHeaders = ['DASHBOARD'];

  getOrCreateSheet_(SHEET_GUGUDAN_SUMMARY, guguSummaryHeaders);
  getOrCreateSheet_(SHEET_GUGUDAN_QUESTIONS, guguQuestionHeaders);
  getOrCreateSheet_(SHEET_ARITHMETIC_SUMMARY, arithSummaryHeaders);
  getOrCreateSheet_(SHEET_ARITHMETIC_QUESTIONS, arithQuestionHeaders);
  getOrCreateSheet_(SHEET_SPELLING_SUMMARY, spellingSummaryHeaders);
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
      const sh = ss.getSheetByName(SHEET_GUGUDAN_QUESTIONS);
      sh.appendRow([
        now, sessionId, data.player || '', data.mode || '', data.dan || '',
        q.a, q.b, `${q.a}×${q.b}`, q.correctAns, q.user, q.correctAns, q.correct ? 1 : 0,
        q.streakAfter, data.bestStreak, q.timeMs, data.userAgent || ''
      ]);
    } else if (data.type === 'gugudan') {
      const sh = ss.getSheetByName(SHEET_GUGUDAN_SUMMARY);
      const questionList = Array.isArray(data.details) ? data.details.map(d => `${d.a}×${d.b}=${d.correctAns}`).join(' | ') : '';
      sh.appendRow([
        now, sessionId, data.player || '', data.mode || '', data.dan || '', data.total, data.correct, data.bestStreak,
        data.startedAt, data.finishedAt, data.durationMs, data.userAgent || '', questionList, JSON.stringify(data.details || [])
      ]);
    } else if (data.type === 'arithmetic_q') {
      const q = (data.details && data.details[0]) || {};
      const sh = ss.getSheetByName(SHEET_ARITHMETIC_QUESTIONS);
      sh.appendRow([
        now, sessionId, data.player || '', data.mode || '', 
        q.a, q.b, "'" + q.op, `${q.a}${q.op}${q.b}`, q.correctAns, q.user, q.correctAns, q.correct ? 1 : 0,
        q.streakAfter, data.bestStreak, q.timeMs, data.userAgent || ''
      ]);
    } else if (data.type === 'arithmetic') {
      const sh = ss.getSheetByName(SHEET_ARITHMETIC_SUMMARY);
      sh.appendRow([
        now, sessionId, data.player || '', data.mode || '', data.total, data.correct, data.bestStreak,
        data.startedAt, data.finishedAt, data.durationMs, data.userAgent || '', JSON.stringify(data.details || [])
      ]);
    } else if (data.type === 'spelling') {
      const sh = ss.getSheetByName(SHEET_SPELLING_SUMMARY);
      sh.appendRow([
        now, sessionId, data.player || '', data.level || '', data.total, data.correct,
        data.startedAt, data.finishedAt, data.durationMs, data.userAgent || '', JSON.stringify(data.details || [])
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function buildDashboard() {
  const ss = SpreadsheetApp.getActive();
  const dash = ss.getSheetByName(SHEET_DASHBOARD) || ss.insertSheet(SHEET_DASHBOARD);
  dash.clear();

  // --- 구구단 섹션 ---
  dash.getRange('A1').setValue('구구단 게임 대시보드').setFontWeight('bold').setFontSize(16);
  dash.getRange('A3').setValue('총 세션 수');
  dash.getRange('B3').setFormula('=COUNTA(' + SHEET_GUGUDAN_SUMMARY + '!A2:A)');
  dash.getRange('A4').setValue('평균 정답률');
  dash.getRange('B4').setFormula('=IFERROR(AVERAGE(ArrayFormula(' + SHEET_GUGUDAN_SUMMARY + '!G2:G / ' + SHEET_GUGUDAN_SUMMARY + '!F2:F)))').setNumberFormat('0.0%');

  dash.getRange('D3').setValue('단별 평균 정답률');
  dash.getRange('D4').setFormula('=QUERY(' + SHEET_GUGUDAN_QUESTIONS + '!E2:L, "select E, avg(L) where E is not null group by E label avg(L) \'정답률\'", 1)');

  const chart1 = dash.newChart().asColumnChart().addRange(dash.getRange('D4:E12')).setPosition(2, 6, 0, 0).setOption('title', '구구단: 단별 정답률').build();
  dash.insertChart(chart1);

  // --- 덧셈/뺄셈 섹션 ---
  dash.getRange('A15').setValue('덧셈/뺄셈 게임 대시보드').setFontWeight('bold').setFontSize(16);
  dash.getRange('A17').setValue('총 세션 수');
  dash.getRange('B17').setFormula('=COUNTA(' + SHEET_ARITHMETIC_SUMMARY + '!A2:A)');
  dash.getRange('A18').setValue('평균 정답률');
  dash.getRange('B18').setFormula('=IFERROR(AVERAGE(ArrayFormula(' + SHEET_ARITHMETIC_SUMMARY + '!F2:F / ' + SHEET_ARITHMETIC_SUMMARY + '!E2:E)))').setNumberFormat('0.0%');

  dash.getRange('D17').setValue('모드별 평균 정답률');
  dash.getRange('D18').setFormula('=QUERY(' + SHEET_ARITHMETIC_QUESTIONS + '!D2:L, "select D, avg(L) where D is not null group by D label avg(L) \'정답률\'", 1)');

  const chart2 = dash.newChart().asBarChart().addRange(dash.getRange('D18:E21')).setPosition(16, 6, 0, 0).setOption('title', '덧셈/뺄셈: 모드별 정답률').build();
  dash.insertChart(chart2);
}

function doGet(e) {
  try {
    const sheetName = '2-2'; // Provided by user
    const ss = SpreadsheetApp.openByUrl("https://docs.google.com/spreadsheets/d/1S3Q1Aa6LJt7zp-0PfIErR9hGLlbhbqkgofg6oQTIvfo/edit?usp=sharing");
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found.`);
    }
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Get headers
    const json = data.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify({ ok: true, data: json }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
