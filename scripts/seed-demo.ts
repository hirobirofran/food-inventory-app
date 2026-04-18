import { google } from 'googleapis';
import { demoFoods } from './demoData';

const SHEET_NAME = 'inventory';
const HEADER = ['id', 'name', 'category', 'quantity', 'unit', 'expiryDate', 'storageLocation', 'minQuantity', 'note'];

function offsetToDate(offsetDays: number | null): string {
  if (offsetDays === null) return '';
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.DEMO_SHEET_ID;
  const prodSheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!email || !privateKey) {
    console.error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY in .env.local');
    process.exit(1);
  }
  if (!spreadsheetId) {
    console.error('Missing DEMO_SHEET_ID in .env.local');
    console.error('Set DEMO_SHEET_ID to the demo spreadsheet ID (must be different from GOOGLE_SPREADSHEET_ID).');
    process.exit(1);
  }
  if (spreadsheetId === prodSheetId) {
    console.error('Refusing to seed: DEMO_SHEET_ID matches GOOGLE_SPREADSHEET_ID.');
    console.error('This script only writes to the demo spreadsheet. Aborting to avoid overwriting production.');
    process.exit(1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  console.log(`Clearing demo sheet ${spreadsheetId}...`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAME}!A:I`,
  });

  const rows: string[][] = [HEADER];
  let idCounter = Date.now();
  for (const item of demoFoods) {
    rows.push([
      String(idCounter++),
      item.name,
      item.category,
      String(item.quantity),
      item.unit,
      offsetToDate(item.expiryOffsetDays),
      item.storageLocation,
      String(item.minQuantity),
      item.note,
    ]);
  }

  console.log(`Writing ${demoFoods.length} items + header...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });

  console.log(`Done. Seeded ${demoFoods.length} items to demo sheet.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
