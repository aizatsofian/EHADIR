/*
=================================================================
 Kod Penuh Google Apps Script (Versi Akhir)
 Nama fail: Code.gs
=================================================================
*/

// --- KONFIGURASI UTAMA ---
// Pastikan ID dan nama tab ini 100% sama dengan fail Google Sheets anda.
const SENARAI_STAF_SHEET_ID = '1LkwHTjoZrL8RFsD2zyRfb328V8CYE112iaDinUvrjng';
const REKOD_KEHADIRAN_SHEET_ID = '1V8-15QtMkTlDjwLlO2khkoIQB0YtngyyXw0sePV0tU4';

// PENTING: Pastikan nama tab ini betul-betul sama (termasuk huruf besar/kecil dan jarak)
const NAMA_SHEET_STAF = 'SenaraiStaf';
const NAMA_SHEET_REKOD = 'RekodKehadiran';
// PENAMBAHAN: Nama tab untuk menyimpan log proses
const NAMA_SHEET_LOG = 'LogAplikasi';


/**
 * Fungsi bantuan untuk menulis log ke dalam tab 'LogAplikasi'.
 * @param {string} message - Mesej log yang hendak ditulis.
 */
function logToSheet(message) {
  try {
    const logSheet = SpreadsheetApp.openById(REKOD_KEHADIRAN_SHEET_ID).getSheetByName(NAMA_SHEET_LOG);
    const timestamp = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "yyyy-MM-dd HH:mm:ss");
    
    if (!logSheet) {
      // Jika tab log tidak wujud, cipta yang baharu dan tambah tajuk
      const newSheet = SpreadsheetApp.openById(REKOD_KEHADIRAN_SHEET_ID).insertSheet(NAMA_SHEET_LOG);
      newSheet.appendRow(['Timestamp', 'Log Message']);
      newSheet.appendRow([timestamp, message]);
    } else {
      logSheet.appendRow([timestamp, message]);
    }
  } catch (e) {
    Logger.log(`Gagal menulis ke sheet log: ${e.toString()}`);
  }
}


/**
 * Fungsi ini bertindak sebagai API untuk menerima permintaan POST dari luar.
 * Ia akan dipanggil oleh fail script.js anda.
 * @param {Event} e - Objek event yang mengandungi data JSON yang dihantar.
 * @returns {ContentService.TextOutput} - Respon dalam format JSON.
 */
function doPost(e) {
  try {
    logToSheet("Permintaan POST diterima.");
    // Dapatkan data JSON yang dihantar dari frontend
    const requestData = JSON.parse(e.postData.contents);
    const fourDigitIC = requestData.ic;
    logToSheet(`Data diterima: IC = ${fourDigitIC}`);

    // Panggil fungsi logik utama untuk memproses kehadiran
    const result = processAttendance(fourDigitIC);

    logToSheet(`Menghantar respon: ${JSON.stringify(result)}`);
    // Hantar balik mesej kejayaan/ralat sebagai JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logToSheet(`RALAT BESAR dalam doPost: ${error.toString()}`);
    const errorResult = { 
      success: false, 
      message: `Ralat pada server: ${error.toString()}` 
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Fungsi utama yang memproses logik kehadiran.
 * @param {string} fourDigitIC - 4 digit terakhir IC dari pengguna.
 * @returns {object} - Objek yang mengandungi status kejayaan dan mesej.
 */
function processAttendance(fourDigitIC) {
  try {
    const staffSpreadsheet = SpreadsheetApp.openById(SENARAI_STAF_SHEET_ID);
    const staffSheet = staffSpreadsheet.getSheetByName(NAMA_SHEET_STAF);

    if (!staffSheet) {
      throw new Error(`Tab dengan nama "${NAMA_SHEET_STAF}" tidak ditemui.`);
    }

    const attendanceSpreadsheet = SpreadsheetApp.openById(REKOD_KEHADIRAN_SHEET_ID);
    const attendanceSheet = attendanceSpreadsheet.getSheetByName(NAMA_SHEET_REKOD);

    if (!attendanceSheet) {
      throw new Error(`Tab dengan nama "${NAMA_SHEET_REKOD}" tidak ditemui.`);
    }
    
    logToSheet(`Mencari staf dengan IC akhir: ${fourDigitIC}`);
    const staffData = findStaff(staffSheet, fourDigitIC);

    if (!staffData) {
      logToSheet(`Staf tidak ditemui.`);
      return { success: false, message: 'Ralat: Nombor IC tidak ditemui. Sila pastikan anda memasukkan 4 digit yang betul.' };
    }
    
    logToSheet(`Staf ditemui: ${staffData.name} (ID: ${staffData.id})`);
    const today = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yyyy");
    const attendanceRecord = findAttendanceRecord(attendanceSheet, staffData.id, today);

    if (!attendanceRecord) {
      logToSheet(`Tiada rekod untuk hari ini. Merekod Masa Masuk...`);
      const timeIn = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "h:mm a");
      attendanceSheet.appendRow([new Date().getTime(), staffData.id, staffData.name, today, timeIn, '']);
      logToSheet(`Masa Masuk berjaya direkodkan pada ${timeIn}.`);
      return { success: true, message: `Terima kasih, ${staffData.name}. Kehadiran masuk pada ${timeIn} telah direkodkan.` };
    
    } else if (attendanceRecord.timeOut === '') {
      logToSheet(`Rekod masuk ditemui. Merekod Masa Keluar...`);
      const timeOut = Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "h:mm a");
      attendanceSheet.getRange(attendanceRecord.row, 6).setValue(timeOut);
      logToSheet(`Masa Keluar berjaya direkodkan pada ${timeOut}.`);
      return { success: true, message: `Selamat pulang, ${staffData.name}. Kehadiran keluar pada ${timeOut} telah direkodkan.` };
    
    } else {
      logToSheet(`Staf telah merekodkan masuk dan keluar untuk hari ini.`);
      return { success: false, message: `Perhatian, ${staffData.name}. Anda telah pun merekodkan kehadiran masuk dan keluar untuk hari ini.` };
    }

  } catch (error) {
    logToSheet(`RALAT dalam processAttendance: ${error.toString()}`);
    Logger.log(error.toString());
    return { success: false, message: `Ralat teknikal pada server: ${error.toString()}` };
  }
}


/**
 * Fungsi bantuan untuk mencari staf dalam sheet 'SenaraiStaf'.
 * @param {Sheet} sheet - Objek sheet 'SenaraiStaf'.
 * @param {string} ic - 4 digit terakhir IC.
 * @returns {object|null} - Objek dengan maklumat staf atau null jika tidak ditemui.
 */
function findStaff(sheet, ic) {
  if (sheet.getLastRow() < 2) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][3].toString().trim() === ic.toString().trim()) {
      return {
        id: data[i][0],
        name: data[i][1]
      };
    }
  }
  return null;
}


/**
 * Fungsi bantuan untuk mencari rekod kehadiran dalam sheet 'RekodKehadiran'.
 * @param {Sheet} sheet - Objek sheet 'RekodKehadiran'.
 * @param {string} staffId - ID unik staf.
 * @param {string} date - Tarikh hari ini dalam format 'dd/MM/yyyy'.
 * @returns {object|null} - Objek dengan maklumat kehadiran atau null jika tidak ditemui.
 */
function findAttendanceRecord(sheet, staffId, date) {
  if (sheet.getLastRow() < 2) return null;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][3]) {
      const recordDate = Utilities.formatDate(new Date(data[i][3]), "Asia/Kuala_Lumpur", "dd/MM/yyyy");
      if (data[i][1].toString().trim() === staffId.toString().trim() && recordDate === date) {
        return {
          row: i + 2,
          timeOut: data[i][5]
        };
      }
    }
  }
  return null;
}
