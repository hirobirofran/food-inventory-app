import { google } from 'googleapis';
import { FoodItem } from '@/types/food';

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;
const SHEET_NAME = 'inventory';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });
}

function rowToFood(row: string[]): FoodItem | null {
  if (!row[0]) return null;
  return {
    id: row[0] ?? '',
    name: row[1] ?? '',
    category: (row[2] as FoodItem['category']) ?? 'その他',
    quantity: parseFloat(row[3]) || 0,
    unit: row[4] ?? '個',
    expiryDate: row[5] || null,
    storageLocation: (row[6] as FoodItem['storageLocation']) ?? '常温',
    minQuantity: parseFloat(row[7]) || 0,
    note: row[8] ?? '',
  };
}

function foodToRow(food: Omit<FoodItem, 'id'> & { id?: string }): string[] {
  return [
    food.id ?? '',
    food.name,
    food.category,
    String(food.quantity),
    food.unit,
    food.expiryDate ?? '',
    food.storageLocation,
    String(food.minQuantity),
    food.note,
  ];
}

export async function getFoods(): Promise<FoodItem[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = res.data.values ?? [];
  return rows.map(rowToFood).filter((f): f is FoodItem => f !== null);
}

export async function addFood(data: Omit<FoodItem, 'id'>): Promise<FoodItem> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const id = Date.now().toString();
  const newFood: FoodItem = { ...data, id };

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:I`,
    valueInputOption: 'RAW',
    requestBody: { values: [foodToRow(newFood)] },
  });

  return newFood;
}

export async function updateFood(id: string, data: Omit<FoodItem, 'id'>): Promise<FoodItem> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 行番号を検索
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex < 1) throw new Error(`Food not found: ${id}`);

  const rowNum = rowIndex + 1; // 1-indexed、1行目はヘッダー
  const updated: FoodItem = { ...data, id };

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A${rowNum}:I${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [foodToRow(updated)] },
  });

  return updated;
}

export async function deleteFood(id: string): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // シートIDを取得
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) throw new Error('Sheet not found');

  // 行番号を検索
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`,
  });
  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex(r => r[0] === id);
  if (rowIndex < 1) throw new Error(`Food not found: ${id}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });
}
