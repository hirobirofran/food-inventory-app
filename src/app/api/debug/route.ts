import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GOOGLE_PRIVATE_KEY ?? '';
  return NextResponse.json({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ? '✅ set' : '❌ missing',
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ set' : '❌ missing',
    keyLength: key.length,
    keyStart: key.substring(0, 30).replace(/\n/g, '[LF]').replace(/\\n/g, '[ESC-N]'),
    hasBeginMarker: key.includes('BEGIN PRIVATE KEY'),
    hasActualNewlines: key.includes('\n'),
    hasEscapedNewlines: key.includes('\\n'),
  });
}
