const RECIPIENT_EMAIL = 'lukshaolga1982@gmail.com';
const CABINET_URL = 'https://lukshaolga1982-ship-it.github.io/CT_25_26/';

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const studentName = clean_(data.studentName, 120);
    const testLabel = clean_(data.testLabel, 160);
    const testScore = clean_(data.testScore, 10);
    const primaryScore = clean_(data.primaryScore, 10);
    const maxPrimary = clean_(data.maxPrimary, 10);

    if (!studentName || !testLabel || !testScore) {
      return response_({ ok: false, error: 'Missing fields' });
    }

    const subject = `Ученик отправил тест: ${studentName}`;
    const body = [
      `${studentName} отправил(а) работу.`,
      '',
      `Тест: ${testLabel}`,
      `Результат: ${testScore} из 100`,
      `Первичный балл: ${primaryScore} из ${maxPrimary}`,
      '',
      `Открыть кабинет учителя: ${CABINET_URL}`
    ].join('\n');

    MailApp.sendEmail(RECIPIENT_EMAIL, subject, body);
    return response_({ ok: true });
  } catch (error) {
    return response_({ ok: false, error: String(error) });
  }
}

function clean_(value, limit) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, limit);
}

function response_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
