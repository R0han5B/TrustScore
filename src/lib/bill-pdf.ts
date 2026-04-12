type BillPdfItem = {
  name: string;
  quantity: number;
  price: number;
};

type BillPdfShop = {
  name: string;
  address: string;
  city: string;
  phone?: string | null;
  email?: string | null;
  gstNumber?: string | null;
};

type BillPdfData = {
  billNumber: string;
  billDate: Date;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  items: BillPdfItem[];
  totalAmount: number;
  shop: BillPdfShop;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CARD_WIDTH = 520;
const CARD_PADDING = 18;

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(value);
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.52;
}

function drawText(
  x: number,
  y: number,
  text: string,
  font = 'F1',
  fontSize = 12,
  color = '0 0 0'
) {
  return [
    'BT',
    `/${font} ${fontSize} Tf`,
    `${color} rg`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${escapePdfText(text)}) Tj`,
    'ET',
  ].join('\n');
}

function drawCenteredText(y: number, text: string, font = 'F1', fontSize = 12, color = '0 0 0') {
  const width = estimateTextWidth(text, fontSize);
  const x = (PAGE_WIDTH - width) / 2;
  return drawText(x, y, text, font, fontSize, color);
}

function drawRightText(rightX: number, y: number, text: string, font = 'F1', fontSize = 12, color = '0 0 0') {
  const width = estimateTextWidth(text, fontSize);
  return drawText(rightX - width, y, text, font, fontSize, color);
}

function drawRupeeSymbol(x: number, y: number, size = 12, color = '0 0 0') {
  const topY = y + size * 0.72;
  const midY = y + size * 0.48;
  const diagStartX = x + size * 0.18;
  const diagStartY = y + size * 0.42;
  const diagEndX = x + size * 0.66;
  const diagEndY = y;
  const rightX = x + size * 0.72;

  return [
    `${Math.max(1, size * 0.08).toFixed(2)} w`,
    `${color} RG`,
    `${x.toFixed(2)} ${topY.toFixed(2)} m`,
    `${rightX.toFixed(2)} ${topY.toFixed(2)} l`,
    'S',
    `${x.toFixed(2)} ${midY.toFixed(2)} m`,
    `${rightX.toFixed(2)} ${midY.toFixed(2)} l`,
    'S',
    `${diagStartX.toFixed(2)} ${diagStartY.toFixed(2)} m`,
    `${diagEndX.toFixed(2)} ${diagEndY.toFixed(2)} l`,
    'S',
  ].join('\n');
}

function drawCurrencyAmountRight(
  rightX: number,
  y: number,
  amount: number,
  font = 'F1',
  fontSize = 12,
  color = '0 0 0'
) {
  const amountText = amount.toFixed(2);
  const symbolSize = fontSize;
  const gap = Math.max(2, fontSize * 0.2);
  const amountWidth = estimateTextWidth(amountText, fontSize);
  const symbolWidth = symbolSize * 0.8;
  const totalWidth = symbolWidth + gap + amountWidth;
  const startX = rightX - totalWidth;

  return [
    drawRupeeSymbol(startX, y, symbolSize, color),
    drawText(startX + symbolWidth + gap, y, amountText, font, fontSize, color),
  ].join('\n');
}

function drawLine(x1: number, y1: number, x2: number, y2: number, width = 1, color = '0.86 0.88 0.91') {
  return [
    `${width} w`,
    `${color} RG`,
    `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
    'S',
  ].join('\n');
}

function drawRect(x: number, y: number, width: number, height: number, fill = '1 1 1', stroke = '0.85 0.87 0.9') {
  return [
    `${fill} rg`,
    `${stroke} RG`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`,
    'B',
  ].join('\n');
}

export function generateBillPdfBuffer(data: BillPdfData) {
  const cardX = (PAGE_WIDTH - CARD_WIDTH) / 2;
  const itemRowHeight = 26;
  const cardHeight = 230 + data.items.length * itemRowHeight;
  const cardY = PAGE_HEIGHT - 40 - cardHeight;
  const leftX = cardX + CARD_PADDING;
  const rightX = cardX + CARD_WIDTH - CARD_PADDING;

  let currentY = cardY + cardHeight - 34;
  const commands: string[] = [];

  commands.push(drawRect(cardX, cardY, CARD_WIDTH, cardHeight));
  commands.push(drawCenteredText(currentY, data.shop.name, 'F2', 19));
  currentY -= 20;
  commands.push(drawCenteredText(currentY, `${data.shop.address}, ${data.shop.city}`, 'F1', 10, '0.48 0.53 0.6'));

  currentY -= 18;
  commands.push(drawLine(leftX, currentY, rightX, currentY));

  currentY -= 22;
  commands.push(drawText(leftX, currentY, 'Bill No:', 'F1', 11, '0.48 0.53 0.6'));
  commands.push(drawRightText(rightX, currentY, data.billNumber, 'F1', 11, '0.14 0.16 0.2'));

  currentY -= 26;
  commands.push(drawText(leftX, currentY, 'Date:', 'F1', 11, '0.48 0.53 0.6'));
  commands.push(drawRightText(rightX, currentY, formatDate(data.billDate), 'F1', 11, '0.14 0.16 0.2'));

  currentY -= 26;
  commands.push(drawText(leftX, currentY, 'Customer:', 'F1', 11, '0.48 0.53 0.6'));
  commands.push(drawRightText(rightX, currentY, data.customerName || 'Walk-in Customer', 'F1', 11, '0.14 0.16 0.2'));

  currentY -= 12;
  commands.push(drawLine(leftX, currentY, rightX, currentY));

  for (const item of data.items) {
    const amount = item.quantity * item.price;
    currentY -= 22;
    commands.push(drawText(leftX, currentY, `${item.name} x${item.quantity}`, 'F1', 11, '0.14 0.16 0.2'));
    commands.push(drawCurrencyAmountRight(rightX, currentY, amount, 'F1', 11, '0.14 0.16 0.2'));
    currentY -= 10;
    commands.push(drawLine(leftX, currentY, rightX, currentY, 0.8, '0.9 0.92 0.95'));
  }

  currentY -= 22;
  commands.push(drawText(leftX, currentY, 'Total:', 'F2', 12, '0.08 0.1 0.14'));
  commands.push(drawCurrencyAmountRight(rightX, currentY, data.totalAmount, 'F2', 12, '0.08 0.1 0.14'));

  const content = commands.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj',
    `6 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
