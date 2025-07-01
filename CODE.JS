/**
 * Code.gs - Google Apps Script untuk Sistem e-Hadir Staf
 * Mengendalikan permintaan fetch dari front-end,
 * merekodkan masa masuk/keluar, dan menambah header CORS.
 */

const TIMEZONE = 'Asia/Kuala_Lumpur';
const SHEET_NAME = 'Attendance';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Sistem e-Hadir')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ic = data.ic;
    // Buka spreadsheet (jika bound script, guna getActiveSpreadsheet)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var staffSheet = ss.getSheetByName('Staff');
    var staffData = staffSheet.getDataRange().getValues();
    // Cari nama penuh staf berdasarkan IC
    var staffRow = staffData.find(function(row) {
      return row[1] === ic; // indeks 1 = IC
    });
    if (!staffRow) {
      return createResponse({ status: 'error', message: 'Staf tidak dijumpai' });
    }
    var fullName = staffRow[2]; // indeks 2 = Nama
    var attendanceSheet = ss.getSheetByName(SHEET_NAME);
    var attendanceData = attendanceSheet.getDataRange().getValues();
    // Format tarikh dan masa sekarang
    var today = Utilities.formatDate(new Date(), TIMEZONE, 'dd/MM/yyyy');
    var timeNow = Utilities.formatDate(new Date(), TIMEZONE, 'HH:mm:ss');
    // Cari rekod hadir hari ini
    var recordRow = null;
    for (var i = 1; i < attendanceData.length; i++) {
      if (attendanceData[i][1] === fullName && attendanceData[i][3] === today) {
        recordRow = i + 1; // baris sebenar dalam sheet
        break;
      }
    }
    if (recordRow) {
      // Jika sudah ada, kemaskini masa keluar (kolum E = 5)
      attendanceSheet.getRange(recordRow, 5).setValue(timeNow);
      return createResponse({ status: 'success', message: 'Keluar direkodkan' });
    } else {
      // Rekod baru: kolum A=timestamp, B=nama, C=IC, D=tarikh, E=masa masuk
      attendanceSheet.appendRow([new Date(), fullName, ic, today, timeNow]);
      return createResponse({ status: 'success', message: 'Masuk direkodkan' });
    }
  } catch (err) {
    return createResponse({ status: 'error', message: err.message });
  }
}

// Helper: bina respon JSON dengan header CORS ------------------------------------------------
function createResponse(obj) {
  var output = ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  // Tambah header CORS supaya fetch() dari domain lain tidak diblok
  var headers = output.getHeaders();
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type';
  output.setHeaders(headers);
  return output;
}

// OPTIONAL: handle preflight OPTIONS request untuk CORS ----------------------------------------
function doOptions(e) {
  return createResponse({ status: 'ok' });
}
