import { StreamExportReport } from '../types';

export async function exportStreamSessionToGoogleSheets(
  accessToken: string,
  report: StreamExportReport
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // Step 1: Create a new spreadsheet with the Google Sheets REST API
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `StreamFlow Session Log - ${report.streamTitle.slice(0, 30)} (${new Date().toLocaleDateString()})`,
      },
      sheets: [
        {
          properties: {
            title: 'Stream Analytics & Earnings',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json();
    throw new Error(errorData.error?.message || 'Failed to create Google Sheet');
  }

  const sheetData = await createResponse.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Step 2: Append header and metric rows
  const headerRow = [
    'Session Date/Time',
    'Stream Title',
    'Streamer',
    'Duration',
    'Peak Viewers',
    'Total Gifts',
    'Diamonds Earned',
    'Estimated USD ($)',
    'PK Battle Result',
    'Top Supporter',
  ];

  const dataRow = [
    report.timestamp,
    report.streamTitle,
    report.streamer,
    report.duration,
    report.peakViewers,
    report.totalGiftsReceived,
    report.diamondsEarned,
    report.estimatedEarningsUsd,
    report.pkWinLoss,
    report.topGifter,
  ];

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:J2?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headerRow, dataRow],
      }),
    }
  );

  if (!updateResponse.ok) {
    const err = await updateResponse.json();
    throw new Error(err.error?.message || 'Failed to populate sheet data');
  }

  return { spreadsheetId, spreadsheetUrl };
}
