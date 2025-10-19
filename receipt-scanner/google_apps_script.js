/**
 * Google Apps Script for Receipt Scanner with Duplicate Detection
 *
 * This script receives receipt data from the web app and writes it to Google Sheets.
 * It checks for duplicates before saving and returns a warning if found.
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Save the project (give it a name like "Receipt Scanner")
 * 6. Click Deploy > New deployment
 * 7. Select type: Web app
 * 8. Execute as: Me
 * 9. Who has access: Anyone
 * 10. Click Deploy
 * 11. Copy the Web app URL
 * 12. Paste it into your HTML page's "Google Apps Script URL" field
 *
 * NOTE: This version enables CORS to allow reading responses from the web app
 */

/**
 * Handle POST requests from the web app
 */
function doPost(e) {
  try {
    // Parse the incoming JSON data
    const data = JSON.parse(e.postData.contents);

    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Check if this is the first time - add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Date',
        'Time',
        'Merchant',
        'Total',
        'Currency',
        'Tax',
        'Item Count',
        'Items (Description x Qty @ Price)',
        'Timestamp'
      ]);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 9);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('#ffffff');
    }

    // Check for duplicates (unless force flag is set)
    if (!data.force) {
      const duplicate = findDuplicate(sheet, data);
      if (duplicate) {
        // Return duplicate warning with CORS headers
        return createCorsResponse({
          isDuplicate: true,
          row: duplicate.row,
          existingReceipt: duplicate.data,
          message: `Duplicate found: ${duplicate.data.merchant} on ${duplicate.data.date} for ${duplicate.data.currency} ${duplicate.data.total}`
        });
      }
    }

    // Format items as a string
    let itemsText = '';
    if (data.items && data.items.length > 0) {
      itemsText = data.items.map(item =>
        `${item.description} x${item.quantity} @ ${data.currency} ${item.price}`
      ).join('; ');
    } else {
      itemsText = 'No items';
    }

    // Prepare row data
    const rowData = [
      data.date || '',
      data.time || '',
      data.merchantName || 'Unknown',
      data.total || '0.00',
      data.currency || 'USD',
      data.tax || '0.00',
      data.items ? data.items.length : 0,
      itemsText,
      new Date().toISOString()
    ];

    // Append the new row
    sheet.appendRow(rowData);

    // Auto-resize columns for better readability
    sheet.autoResizeColumns(1, 9);

    // Return success response with CORS headers
    return createCorsResponse({
      success: true,
      message: 'Receipt saved successfully',
      row: sheet.getLastRow()
    });

  } catch (error) {
    // Return error response with CORS headers
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

/**
 * Find duplicate receipts in the sheet
 * Returns the duplicate row info or null if no duplicate found
 */
function findDuplicate(sheet, newReceipt) {
  const lastRow = sheet.getLastRow();

  // No duplicates if sheet is empty or only has headers
  if (lastRow <= 1) {
    return null;
  }

  // Get all existing data (skip header row)
  // Columns: Date, Time, Merchant, Total, Currency, Tax, ItemCount, Items, Timestamp
  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  // Check each row for duplicates
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowData = {
      date: row[0],
      time: row[1],
      merchant: row[2],
      total: row[3].toString(),
      currency: row[4],
      tax: row[5],
      itemCount: row[6],
      items: row[7],
      timestamp: row[8]
    };

    // Duplicate detection logic (same as mobile app):
    // Match if: same merchant + same date + same total
    const merchantMatch = rowData.merchant.toLowerCase() === (newReceipt.merchantName || '').toLowerCase();
    const dateMatch = rowData.date === newReceipt.date;
    const totalMatch = parseFloat(rowData.total) === parseFloat(newReceipt.total);

    if (merchantMatch && dateMatch && totalMatch) {
      return {
        row: i + 2, // +2 because: +1 for header, +1 for 1-based indexing
        data: rowData
      };
    }
  }

  return null;
}

/**
 * Create a CORS-enabled response
 * This allows the web app to read the response
 */
function createCorsResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);

  // Note: Apps Script doesn't support custom headers in the same way as regular servers
  // But it does allow cross-origin requests by default when deployed as "Anyone"

  return output;
}

/**
 * Handle GET requests (for testing)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('Receipt Scanner Google Apps Script is running! Use POST to submit receipt data.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Optional: Function to get receipt statistics
 * You can call this from the script editor to see stats
 */
function getReceiptStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    Logger.log('No receipts found');
    return;
  }

  // Get all totals (column D, starting from row 2)
  const totals = sheet.getRange(2, 4, lastRow - 1, 1).getValues();

  let sum = 0;
  totals.forEach(row => {
    const value = parseFloat(row[0]);
    if (!isNaN(value)) {
      sum += value;
    }
  });

  Logger.log(`Total receipts: ${lastRow - 1}`);
  Logger.log(`Total amount: ${sum.toFixed(2)}`);
}
