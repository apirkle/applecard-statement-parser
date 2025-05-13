# Apple Card Statement to QIF Converter

A simple web application that converts Apple Card PDF statements into QIF format for easy import into financial software.

## Features

- Drag and drop interface for PDF statements
- Processes multiple statements at once
- Client-side processing (no server required)
- Generates QIF format compatible with most financial software
- Modern, clean UI

## Usage

1. Open `index.html` in a modern web browser
2. Drag and drop your Apple Card PDF statements onto the drop zone
   - You can also click the drop zone to select files
   - Multiple files can be added at once
3. Click the "Process Statements" button
4. A QIF file will be automatically downloaded
5. Import the QIF file into your financial software

## Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- PDF statements from Apple Card

## Notes

- The application processes all files locally in your browser
- No data is sent to any server
- Transactions are sorted by date in the output file
- The QIF format is compatible with most financial software including:
  - Quicken
  - Microsoft Money
  - GnuCash
  - And many others

## Technical Details

The application uses:
- PDF.js for PDF parsing
- Modern JavaScript (ES6+)
- Tailwind CSS for styling
- No external dependencies beyond the PDF.js library 