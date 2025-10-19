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

    // Log incoming data for debugging
    console.log('Incoming receipt data: ' + JSON.stringify(data));

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
        'Timestamp',
        'Raw Date',
        'Raw Total'
      ]);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, 11);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#667eea');
      headerRange.setFontColor('#ffffff');
    }

    // Check for duplicates (unless force flag is set)
    if (!data.force) {
      console.log('Checking for duplicates...');
      const duplicate = findDuplicate(sheet, data);
      if (duplicate) {
        console.log('Duplicate found at row ' + duplicate.row);
        // Write debug info to a "Debug" sheet
        writeDebugLog(data, duplicate, 'DUPLICATE FOUND');
        // Return duplicate warning with CORS headers
        return createCorsResponse({
          isDuplicate: true,
          row: duplicate.row,
          existingReceipt: duplicate.data,
          message: `Duplicate found: ${duplicate.data.merchant} on ${duplicate.data.date} for ${duplicate.data.currency} ${duplicate.data.total}`
        });
      }
      console.log('No duplicate found');
      writeDebugLog(data, null, 'NO DUPLICATE');
    } else {
      console.log('Force flag set, skipping duplicate check');
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

    // Prepare row data - use setValues instead of appendRow to force text format
    const rowData = [
      data.date || '',
      data.time || '',
      data.merchantName || 'Unknown',
      data.total || '0.00',
      data.currency || 'USD',
      data.tax || '0.00',
      data.items ? data.items.length : 0,
      itemsText,
      new Date().toISOString(),
      data.date || '',  // Raw date string for duplicate detection
      data.total || ''  // Raw total string for duplicate detection
    ];

    // Append the new row
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1, 1, 11).setValues([rowData]);

    // Force columns J and K to be text by setting number format
    sheet.getRange(newRow, 10, 1, 2).setNumberFormat('@STRING@');

    // Auto-resize columns for better readability
    sheet.autoResizeColumns(1, 11);

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
  // Columns: Date, Time, Merchant, Total, Currency, Tax, ItemCount, Items, Timestamp, RawDate, RawTotal
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  // Check each row for duplicates
  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    const rowData = {
      merchant: row[2],
      rawDate: row[9] || row[0],  // Use raw date if available, fallback to parsed date
      rawTotal: row[10] || row[3],  // Use raw total if available, fallback to parsed total
    };

    // Simple string comparison - match if: same merchant + same raw date + same raw total
    const merchantMatch = (rowData.merchant || '').toLowerCase().trim() === (newReceipt.merchantName || '').toLowerCase().trim();
    const dateMatch = (rowData.rawDate || '').toString().trim() === (newReceipt.date || '').toString().trim();
    const totalMatch = (rowData.rawTotal || '').toString().trim() === (newReceipt.total || '').toString().trim();

    console.log(`Row ${i+2}: merchant=${merchantMatch} ('${rowData.merchant}' vs '${newReceipt.merchantName}'), date=${dateMatch} ('${rowData.rawDate}' vs '${newReceipt.date}'), total=${totalMatch} ('${rowData.rawTotal}' vs '${newReceipt.total}')`);

    if (merchantMatch && dateMatch && totalMatch) {
      console.log('Match found!');
      return {
        row: i + 2, // +2 because: +1 for header, +1 for 1-based indexing
        data: {
          merchant: rowData.merchant,
          date: rowData.rawDate,
          total: rowData.rawTotal
        }
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
    console.log('No receipts found');
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

  console.log(`Total receipts: ${lastRow - 1}`);
  console.log(`Total amount: ${sum.toFixed(2)}`);
}

/**
 * Migration function: Fill Raw Date and Raw Total columns for existing rows
 * Run this once from the Apps Script editor: Run > Run function > migrateOldRows
 */
function migrateOldRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    console.log('No data to migrate');
    return;
  }

  // First, set columns J and K to text format for all rows
  if (lastRow > 1) {
    sheet.getRange(2, 10, lastRow - 1, 2).setNumberFormat('@STRING@');
  }

  // Get all data
  const data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();

  let migratedCount = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2;

    // Always overwrite to ensure proper text format
    // Copy Date (column A) to Raw Date (column J)
    if (row[0]) {
      sheet.getRange(rowNumber, 10).setValue(row[0].toString());
    }

    // Copy Total (column D) to Raw Total (column K)
    if (row[3]) {
      sheet.getRange(rowNumber, 11).setValue(row[3].toString());
    }

    migratedCount++;
  }

  console.log(`Migrated ${migratedCount} rows`);
  SpreadsheetApp.getUi().alert(`Migration complete! Updated ${migratedCount} rows.`);
}

/**
 * Write debug information to a "Debug" sheet
 */
function writeDebugLog(newReceipt, duplicate, result) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let debugSheet = ss.getSheetByName('Debug');

    // Create Debug sheet if it doesn't exist
    if (!debugSheet) {
      debugSheet = ss.insertSheet('Debug');
      debugSheet.appendRow(['Timestamp', 'Result', 'Inc Merchant', 'Inc Date', 'Inc Total', 'Sheet Row 2 Col J (RawDate)', 'Sheet Row 2 Col K (RawTotal)', 'Sheet Row 2 Col C (Merchant)']);
      debugSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#ff9800').setFontColor('#ffffff');
    }

    // Check if header row is missing (if first row doesn't have "Timestamp")
    if (debugSheet.getLastRow() === 0 || debugSheet.getRange(1, 1).getValue() !== 'Timestamp') {
      debugSheet.insertRowBefore(1);
      debugSheet.getRange(1, 1, 1, 8).setValues([['Timestamp', 'Result', 'Inc Merchant', 'Inc Date', 'Inc Total', 'Sheet Row 2 Col J (RawDate)', 'Sheet Row 2 Col K (RawTotal)', 'Sheet Row 2 Col C (Merchant)']]);
      debugSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#ff9800').setFontColor('#ffffff');
    }

    // Get row count from main sheet for debugging
    const mainSheet = ss.getActiveSheet();
    const rowCount = mainSheet.getLastRow();

    // Get the actual raw values from row 2 that we're comparing against
    let sheetRawDate = '';
    let sheetRawTotal = '';
    let sheetMerchant = '';

    if (mainSheet.getLastRow() > 1) {
      const row2 = mainSheet.getRange(2, 1, 1, 11).getValues()[0];
      sheetMerchant = row2[2] || '';  // Column C
      sheetRawDate = row2[9] || '';   // Column J
      sheetRawTotal = row2[10] || ''; // Column K
    }

    // Write debug row showing exactly what we're comparing
    debugSheet.appendRow([
      new Date().toISOString(),
      result,
      newReceipt.merchantName || '',
      newReceipt.date || '',
      newReceipt.total || '',
      sheetRawDate || '(empty)',
      sheetRawTotal || '(empty)',
      sheetMerchant || '(empty)'
    ]);

    debugSheet.autoResizeColumns(1, 8);
  } catch (error) {
    console.log('Debug logging failed: ' + error);
  }
}
