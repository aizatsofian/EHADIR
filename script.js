/*
=================================================================
 FAIL 1: script.js (Untuk diletakkan di folder komputer anda)
=================================================================
- PERUBAHAN UTAMA: Menggunakan fetch() dan bukan lagi google.script.run
*/

// script.js (Versi diubah suai)

document.addEventListener('DOMContentLoaded', () => {

    // Rujukan kepada elemen HTML (tiada perubahan di sini)
    const scannerContainer = document.getElementById('scanner-container');
    const formContainer = document.getElementById('form-container');
    const resultContainer = document.getElementById('result-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const icInput = document.getElementById('ic-input');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');

    // !!! PENTING: ANDA PERLU MASUKKAN URL WEB APP ANDA DI SINI SELEPAS DEPLOY !!!
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwEhxdqNAr8EbhrG1vHMJawSrW6AH-UMRPAdIfq0BWewKkdZ_PKdvhxCyDITYyL39s6Yw/exec'; 

    let html5QrCode;

    function startScanner() {
        html5QrCode = new Html5Qrcode("qr-reader");
        const qrCodeSuccessCallback = (decodedText, decodedResult) => {
            console.log(`Kod diimbas: ${decodedText}`);
            html5QrCode.stop().then(() => {
                scannerContainer.classList.add('d-none');
                formContainer.classList.remove('d-none');
                icInput.focus();
            }).catch(err => console.error("Gagal menghentikan pengimbas.", err));
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback)
            .catch(err => {
                console.error("Tidak dapat memulakan pengimbas QR", err);
                showMessage("Gagal memulakan kamera. Sila beri kebenaran akses kamera.", false);
                scannerContainer.innerText = "Ralat: Sila pastikan anda memberi kebenaran untuk menggunakan kamera dan muat semula halaman.";
            });
    }

    function showLoading(isLoading) {
        if (isLoading) {
            formContainer.classList.add('d-none');
            loadingSpinner.classList.remove('d-none');
            submitBtn.disabled = true;
        } else {
            loadingSpinner.classList.add('d-none');
            formContainer.classList.remove('d-none');
            submitBtn.disabled = false;
        }
    }

    function showMessage(message, isSuccess) {
        statusMessage.textContent = message;
        statusMessage.className = 'fw-bold';
        if (isSuccess) {
            statusMessage.classList.add('success-message');
        } else {
            statusMessage.classList.add('error-message');
        }
        formContainer.classList.add('d-none');
        resultContainer.classList.remove('d-none');
    }

    function resetUI() {
        setTimeout(() => {
            icInput.value = '';
            resultContainer.classList.add('d-none');
            statusMessage.textContent = '';
            statusMessage.className = 'fw-bold';
            scannerContainer.classList.remove('d-none');
            startScanner();
        }, 4000);
    }

    // Tambah event listener pada butang 'Hantar'
    submitBtn.addEventListener('click', () => {
        const icValue = icInput.value;
        if (!/^\d{4}$/.test(icValue)) {
            alert("Sila masukkan 4 digit nombor sahaja.");
            return;
        }

        if (WEB_APP_URL === 'PASTIKAN_URL_WEB_APP_ANDA_DI_SINI') {
            alert('Ralat: Sila masukkan URL Web App dalam fail script.js');
            return;
        }

        showLoading(true);

        // --- INI BAHAGIAN YANG DIUBAH SUAI ---
        // Menggunakan fetch untuk menghantar data ke Google Apps Script
        fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'cors', // Penting untuk permintaan rentas domain
            cache: 'no-cache',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ic: icValue }), // Hantar data sebagai JSON
        })
        .then(response => response.json()) // Tukar respon kepada JSON
        .then(data => {
            // 'data' adalah objek yang dihantar balik dari doPost
            console.log("Respon dari server:", data);
            showLoading(false);
            showMessage(data.message, data.success);
            resetUI();
        })
        .catch(error => {
            console.error("Ralat komunikasi dengan server:", error);
            showLoading(false);
            showMessage("Ralat: Gagal menghubungi server. Sila semak sambungan internet atau URL Web App.", false);
            resetUI();
        });
        // --- TAMAT BAHAGIAN YANG DIUBAH SUAI ---
    });

    startScanner();
});

/*
=================================================================
 FAIL 2: Code.gs (Untuk diletakkan di projek Google Apps Script)
=================================================================
- PERUBAHAN UTAMA: Menggunakan doPost() untuk bertindak sebagai API.
- doGet() tidak lagi digunakan untuk memaparkan HTML.
*/

// Code.gs (Versi diubah suai)

const SENARAI_STAF_SHEET_ID = '1LkwHTjoZrL8RFsD2zyRfb328V8CYE112iaDinUvrjng';
const REKOD_KEHADIRAN_SHEET_ID = '1V8-15QtMkTlDjwLlO2khkoIQB0YtngyyXw0sePV0tU4';
const NAMA_SHEET_STAF = 'SenaraiStaf';
const NAMA_SHEET_REKOD = 'RekodKehadiran';

/**
 * Fungsi ini mengendalikan permintaan POST dari frontend.
 * Ia bertindak sebagai endpoint API.
 * @param {Event} e - Objek event yang mengandungi data yang dihantar.
 * @returns {ContentService.TextOutput} - Respon dalam format JSON.
 */
function doPost(e) {
  try {
    // Dapatkan data JSON yang dihantar dari frontend
    const requestData = JSON.parse(e.postData.contents);
    const fourDigitIC = requestData.ic;

    // Panggil fungsi logik utama
    const result = processAttendance(fourDigitIC);

    // Hantar balik respon sebagai JSON
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResult = { success: false, message: `Ralat pada server: ${error.toString()}` };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi processAttendance, findStaff, dan findAttendanceRecord
// TIDAK PERLU DIUBAH. Kodnya sama seperti sebelum ini.
// Pastikan fungsi-fungsi ini wujud di bawah fungsi doPost.

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