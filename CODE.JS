/*
=================================================================
 FAIL INI SEPATUTNYA BERADA DI PROJEK GOOGLE APPS SCRIPT ANDA
 Nama fail: Code.gs
=================================================================
*/

// KONFIGURASI SPREADSHEET (Sudah betul)
const SENARAI_STAF_SHEET_ID = '1LkwHTjoZrL8RFsD2zyRfb328V8CYE112iaDinUvrjng';
const REKOD_KEHADIRAN_SHEET_ID = '1V8-15QtMkTlDjwLlO2khkoIQB0YtngyyXw0sePV0tU4';
const NAMA_SHEET_STAF = 'SenaraiStaf';
const NAMA_SHEET_REKOD = 'RekodKehadiran';

/**
 * Fungsi ini bertindak sebagai API untuk menerima data POST dari luar.
 * @param {Event} e - Objek event yang mengandungi data JSON.
 * @returns {ContentService.TextOutput} - Respon dalam format JSON.
 */
function doPost(e) {
  try {
    // Dapatkan data JSON yang dihantar dari fail script.js anda
    const requestData = JSON.parse(e.postData.contents);
    const fourDigitIC = requestData.ic;

    // Panggil fungsi logik utama untuk memproses kehadiran
    const result = processAttendance(fourDigitIC);

    // Hantar balik mesej kejayaan/ralat sebagai JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Tangani sebarang ralat yang tidak dijangka
    const errorResult = { success: false, message: `Ralat pada server: ${error.toString()}` };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =================================================================
// FUNGSI-FUNGSI BANTUAN DI BAWAH INI TIDAK PERLU DIUBAH
// =================================================================

function processAttendance(fourDigitIC) {
  try {
    const staffSheet = SpreadsheetApp.openById(SENARAI_STAF_SHEET_ID).getSheetByName(NAMA_SHEET_STAF);
    const attendanceSheet = SpreadsheetApp.openById(REKOD_KEHADIRAN_SHEET_ID).getSheetByName(NAMA_SHEET_REKOD);
    const staffData = findStaff(staffSheet, fourDigitIC);

    if (!staffData) {
      return { success: false, message: 'Ralat: Nombor IC tidak ditemui. Sila pastikan anda memasukkan 4 digit yang betul.' };
    }

    const today = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yyyy");
    const attendanceRecord = findAttendanceRecord(attendanceSheet, staffData.id, today);

    if (!attendanceRecord) {
      const timeIn = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "h:mm a");
      attendanceSheet.appendRow([new Date().getTime(), staffData.id, staffData.name, today, timeIn, '']);
      return { success: true, message: `Terima kasih, ${staffData.name}. Kehadiran masuk pada ${timeIn} telah direkodkan.` };
    } else if (attendanceRecord.timeOut === '') {
      const timeOut = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "h:mm a");
      attendanceSheet.getRange(attendanceRecord.row, 6).setValue(timeOut);
      return { success: true, message: `Selamat pulang, ${staffData.name}. Kehadiran keluar pada ${timeOut} telah direkodkan.` };
    } else {
      return { success: false, message: `Perhatian, ${staffData.name}. Anda telah pun merekodkan kehadiran masuk dan keluar untuk hari ini.` };
    }
  } catch (error) {
    Logger.log(error.toString());
    return { success: false, message: `Ralat teknikal pada server: ${error.toString()}` };
  }
}

function findStaff(sheet, ic) {
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][3].toString() === ic) {
      return { id: data[i][0], name: data[i][1] };
    }
  }
  return null;
}

function findAttendanceRecord(sheet, staffId, date) {
  if (sheet.getLastRow() < 2) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (let i = 0; i < data.length; i++) {
    const recordDate = Utilities.formatDate(new Date(data[i][3]), "Asia/Kuala_Lumpur", "dd/MM/yyyy");
    if (data[i][1].toString() === staffId.toString() && recordDate === date) {
      return { row: i + 2, timeOut: data[i][5] };
    }
  }
  return null;
}