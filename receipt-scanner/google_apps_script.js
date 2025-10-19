/**
 * Google Apps Script for Receipt Scanner
 *
 * This script receives receipt data from the web app and writes it to Google Sheets.
 * Deploy this as a web app to get a URL that your HTML page can POST to.
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
 * 9. Who has access: Anyone (or "Anyone with the link" if you prefer)
 * 10. Click Deploy
 * 11. Copy the Web app URL
 * 12. Paste it into your HTML page's "Google Apps Script URL" field
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

    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Receipt saved successfully',
        row: sheet.getLastRow()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
