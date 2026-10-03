const fs = require('fs');

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
function bsDate(iso) {
  // Keep the machine date canonical. The website already exposes the exact BS date.
  // This compact fallback avoids introducing a second calendar dependency into Actions.
  const parts = String(iso).split('-');
  return parts.length === 3 ? np(parts[0] + '/' + parts[1] + '/' + parts[2]) : iso;
}

const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
if (data.status !== 'verified') throw new Error('Gold data is not verified');
if (!data.rateDate || !Number(data.goldTola) || !Number(data.silverTola)) {
  throw new Error('Incomplete gold/silver data');
}

const goldChange = Number(data.goldTola) - Number(data.goldYesterday || 0);
const silverChange = Number(data.silverTola) - Number(data.silverYesterday || 0);

const text = [
  '🪙 आजको सुनचाँदीको मूल्य',
  '',
  '📅 प्रकाशित मिति: ' + bsDate(data.rateDate),
  '',
  '🟡 छापावाल सुन: रु. ' + money(data.goldTola) + ' प्रति तोला',
  '🟡 छापावाल सुन: रु. ' + money(data.gold10g) + ' प्रति १० ग्राम',
  '🟠 तेजाबी सुन: रु. ' + money(data.tejabiTola) + ' प्रति तोला',
  '⚪ चाँदी: रु. ' + money(data.silverTola) + ' प्रति तोला',
  '⚪ चाँदी: रु. ' + money(data.silver10g) + ' प्रति १० ग्राम',
  '',
  '📈 सुन: ' + signedMoney(goldChange),
  '📈 चाँदी: ' + signedMoney(silverChange),
  '',
  '📌 स्रोत: नेपाल सुनचाँदी व्यवसायी महासंघ (FENEGOSIDA)',
  '🌐 https://laxmannepal.com.np/Gold-Price-In-Nepal/'
].join('\n');

const output = {
  generatedAt: new Date().toISOString(),
  rateDate: data.rateDate,
  source: data.source,
  sourceUrl: data.sourceUrl,
  text
};

fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2) + '\n');
fs.writeFileSync(OUT_TXT, text + '\n');
console.log(text);
