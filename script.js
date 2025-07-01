/**
 * script.js - Front-end logic for e-Hadir QR scanner dan penghantaran data
 */

// Gantikan dengan URL Web App Google Apps Script anda
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwEhxdqNAr8EbhrG1vHMJawSrW6AH-UMRPAdIfq0BWewKkdZ_PKdvhxCyDITYyL39s6Yw/exec';

// Inisialisasi pembaca QR
const qrReader = new Html5Qrcode("qr-reader");
const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

// Elemen DOM
const formContainer = document.getElementById("form-container");
const icInput = document.getElementById("ic-input");
const submitButton = document.getElementById("submit-button");
const spinner = document.getElementById("spinner");
const messageDiv = document.getElementById("message");

// Mula pengimbas QR
function startScanner() {
  formContainer.style.display = "none";
  messageDiv.textContent = "";
  document.getElementById("qr-reader").style.display = "block";
  qrReader.start(
    { facingMode: "environment" },
    qrConfig,
    onScanSuccess,
    onScanFailure
  );
}

// Callback apabila QR berjaya diimbas
function onScanSuccess(decodedText, decodedResult) {
  qrReader.stop().then(() => {
    document.getElementById("qr-reader").style.display = "none";
    formContainer.style.display = "block";
    icInput.value = decodedText; // Automatik isi IC dari kod QR
  }).catch(err => console.error("Gagal hentikan scanner:", err));
}

// Callback apabila QR gagal diimbas (boleh diabaikan)
function onScanFailure(error) {
  // console.warn(`Scan error: ${error}`);
}

// Hantar data apabila butang klik
submitButton.addEventListener("click", () => {
  const ic = icInput.value.trim();
  if (!/^\d{4}$/.test(ic)) {
    messageDiv.textContent = "Sila masukkan nombor IC 4 digit yang sah";
    return;
  }
  spinner.style.display = "block";
  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ic })
  })
  .then(response => response.json())
  .then(data => {
    spinner.style.display = "none";
    messageDiv.textContent = data.message;
    setTimeout(startScanner, 2000); // Ulang imbas selepas 2 saat
  })
  .catch(error => {
    spinner.style.display = "none";
    messageDiv.textContent = "Gagal menghantar data";
    console.error("Fetch error:", error);
  });
});

// Pastikan scanner bermula apabila halaman siap
document.addEventListener("DOMContentLoaded", startScanner);
