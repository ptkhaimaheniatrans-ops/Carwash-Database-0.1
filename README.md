# Carwash-Database-0.1

Mobile-first web + Google Sheets backup.

## Files to upload
- index.html
- style.css
- script.js
- manifest.json
- service-worker.js
- assets/sounds/*.mp3 (klik,error,success,welcome,logout)
- assets/icons/*

## Setup
1. Paste `Code.gs` to Apps Script and run `runNoError()` once.
2. Deploy as Web App (Execute as: Me, Who has access: Anyone).
3. Upload frontend files to GitHub repo and enable GitHub Pages.
4. Visit site on mobile.

## Notes
- Login codes: Admin `Bungas03` (Input+Database), Viewer `Khai2020` (Database only)
- Date shown in UI and spreadsheet as `1 Oct 2025`.
- Database grouped by date (groupview) and totals per month shown.
- Delete operations show confirmation modal (Yes/No).
