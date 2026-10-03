const fs = require('fs');
const https = require('https');

const DATA_FILE = 'data/fenegosida.json';
const OUT_JSON = 'data/whatsapp-latest.json';
const OUT_TXT = 'data/whatsapp-latest.txt';
const nepaliDigits = '०१२३४५६७८९';

function np(value) {
  return String(value).replace(/\d/g, d => nepaliDigits[d]);
}
function money(value) {
  return np(Number(value).toLocaleString('en-US'));
}
function signedMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 'स्थिर';
  return (n > 0 ? '▲ +' : '▼ ') + money(Math.abs(n)) + ' रुपैयाँ';
}
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {headers:{'User-Agent':'LaxmanNepal-GoldPrice/1.0','Accept':'application/json'}}, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}
async function getNepaliDate(iso) {
  try {
    const payload = await getJson('https://usemiti.com/api/today');
    const bs = payload && payload.bs;
    if (bs && bs.year && bs.month && bs.day) {
      const months = ['बैशाख','जेठ','असार','श्रावण','भाद्र','आश्विन','कार्तिक','मंसिर','पौष','माघ','फाल्गुण','चैत्र'];
      const weekdays = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहीबार','शुक्रबार','शनिबार'];
      const ad = payload.ad;
      const weekday = ad && ad.year && ad.month && ad.day
        ? weekdays[new Date(Number(ad.year), Number(ad.month)-1, Number(ad.day)).getDay()]
        : '';
      return np(bs.day) + ' ' + (months[Number(bs.month)-1] || '') + ' ' + np(bs.year) + (weekday ? ', ' + weekday : '');
    }
  } catch (e) {
    console.warn('Nepali date API unavailable; using ISO fallback.');
  }
  const parts = String(iso).split('-');
  return parts.length === 3 ? np(parts[0] + '/' + parts[1] + '/' + parts[2]) : iso;
}

(async () => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (data.status !== 'verified') throw new Error('Gold data is not verified');
  if (!data.rateDate || !Number(data.goldTola) || !Number(data.silverTola)) throw new Error('Incomplete gold/silver data');

  const dateText = await getNepaliDate(data.rateDate);
  const goldChange = Number(data.goldTola) - Number(data.goldYesterday || 0);
  const silverChange = Number(data.silverTola) - Number(data.silverYesterday || 0);

  const text = [
    '🪙 आजको सुनचाँदीको मूल्य',
    '',
    '📅 मिति: ' + dateText,
    '',
    '🟡 छापावाल सुन: रु. ' + money(data.goldTola) + ' प्रति तोला',
    '🟡 छापावाल सुन: रु. ' + money(data.gold10g) + ' प्रति १० ग्राम',
    (Number(data.tejabiTola) > 0 ? '🟠 तेजाबी सुन: रु. ' + money(data.tejabiTola) + ' प्रति तोला' + (data.tejabiStatus === 'carried-forward' ? ' (अन्तिम प्रमाणित दर)' : '') : null),
    '⚪ चाँदी: रु. ' + money(data.silverTola) + ' प्रति तोला',
    '⚪ चाँदी: रु. ' + money(data.silver10g) + ' प्रति १० ग्राम',
    '',
    '📈 सुन: ' + signedMoney(goldChange),
    '📈 चाँदी: ' + signedMoney(silverChange),
    '',
    '📌 स्रोत: नेपाल सुनचाँदी व्यवसायी महासंघ (FENEGOSIDA)',
    '🌐 https://laxmannepal.com.np/Gold-Price-In-Nepal/'
  ].filter(Boolean).join('\n');

  const output = {
    rateDate: data.rateDate,
    publishedAt: data.publishedAt || null,
    fetchedAt: data.fetchedAt || null,
    status: data.status || 'verified',
    source: data.source || 'FENEGOSIDA',
    sourceUrl: data.sourceUrl || 'https://api.fenegosida.org/api/website/v1/Dashboard/today',
    tejabiStatus: data.tejabiStatus || (Number(data.tejabiTola) > 0 ? 'verified' : 'unavailable'),
    selection: 'verified-fenegosida-snapshot',
    generatedAt: new Date().toISOString(),
    text
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2) + '\n');
  fs.writeFileSync(OUT_TXT, text + '\n');
  console.log(text);
})().catch(err => { console.error(err); process.exit(1); });
