/* GoldwingGas — OCR preprocess + extra Chilean receipt patterns */

const OCR_STATION_PATTERNS = [
  { re: /COPEC/, name: 'Copec' },
  { re: /SHELL/, name: 'Shell' },
  { re: /PETROBRAS|IPIRANGA/, name: 'Petrobras' },
  { re: /\bTERPEL\b/, name: 'Terpel' },
  { re: /\bARAMCO\b/, name: 'Aramco' },
  { re: /\bENEX\b/, name: 'Enex' },
  { re: /\bESSO\b/, name: 'Esso' },
  { re: /\bPRIMAX\b/, name: 'Primax' },
  { re: /\bYPF\b/, name: 'YPF' },
  { re: /PRONTO/, name: 'Pronto' }
];

function preprocessReceiptImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxSide = Math.max(img.width, img.height);
        const scale = maxSide < 1200 ? 1200 / maxSide : maxSide > 2400 ? 1800 / maxSide : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const contrasted = (gray - 128) * 1.45 + 128;
          const v = contrasted > 165 ? 255 : contrasted < 70 ? 0 : contrasted;
          d[i] = d[i + 1] = d[i + 2] = v;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('OCR preprocess fallback', err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function detectFuelStation(normalizedText) {
  for (const p of OCR_STATION_PATTERNS) {
    if (p.re.test(normalizedText)) return p.name;
  }
  return '';
}

function parseChileanMoney(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d.,]/g, '');
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) return parseInt(cleaned.replace(/\./g, ''), 10);
  if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) return parseInt(cleaned.replace(/,/g, ''), 10);
  const asNum = parseInt(cleaned.replace(/[.,]/g, ''), 10);
  return Number.isFinite(asNum) ? asNum : 0;
}

function extractOcrPrice(normalizedText) {
  const labeled = normalizedText.match(/(?:TOTAL\s*(?:A\s*PAGAR)?|MONTO|PAGO|NETO|VALOR(?:\s*TOTAL)?|COSTO|\$|CLP|PESOS)\s*[:\.]?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{3,7})\b/);
  if (labeled) return parseChileanMoney(labeled[1]);
  return 0;
}

function extractOcrLiters(normalizedText) {
  const labeled = [...normalizedText.matchAll(/(\d{1,2}[\.,]\d{1,3})\s*(?:L|LTS|LT|LIT|LITROS|LTR|VOLUMEN|CANTIDAD)\b/g)];
  for (const m of labeled) {
    const val = parseFloat(m[1].replace(',', '.'));
    if (val >= 1 && val <= 25) return val;
  }
  const floats = normalizedText.match(/\b(\d{1,2}[\.,]\d{1,2})\b/g) || [];
  for (const s of floats) {
    const val = parseFloat(s.replace(',', '.'));
    if (val >= 4 && val <= 20) return val;
  }
  return 0;
}
