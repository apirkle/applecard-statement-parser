// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const processButton = document.getElementById('processButton');

// Store selected files
let selectedFiles = new Map();

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Handle file selection
function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type === 'application/pdf') {
            selectedFiles.set(file.name, file);
            updateFileList();
        }
    });
    processButton.disabled = selectedFiles.size === 0;
}

// Update the file list display
function updateFileList() {
    fileList.innerHTML = '';
    selectedFiles.forEach((file, name) => {
        const fileElement = document.createElement('div');
        fileElement.className = 'flex items-center justify-between p-3 bg-white rounded-lg shadow-sm mb-2';
        fileElement.innerHTML = `
            <span class="text-gray-700">${name}</span>
            <button class="text-red-500 hover:text-red-700" onclick="removeFile('${name}')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        `;
        fileList.appendChild(fileElement);
    });
}

// Remove a file from the list
function removeFile(fileName) {
    selectedFiles.delete(fileName);
    updateFileList();
    processButton.disabled = selectedFiles.size === 0;
}

// Process button click handler
processButton.addEventListener('click', async () => {
    processButton.disabled = true;
    processButton.textContent = 'Processing...';
    
    try {
        const transactions = [];
        
        for (const [fileName, file] of selectedFiles) {
            console.log(`Processing file: ${fileName}`);
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                console.log(`Processing page ${i}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');
                
                // Look for transaction sections by cardholder
                const sections = text.split(/Transactions by (?:Adam|Brie) Pirkle/);
                
                for (const section of sections) {
                    if (!section.includes('Date   Description   Daily Cash   Amount')) continue;
                    
                    // Split into lines and filter out empty lines
                    const lines = section.split(/\s{2,}/).filter(line => line.trim());
                    
                    // Process transactions in groups of 5 lines
                    for (let i = 0; i < lines.length - 4; i++) {
                        const date = lines[i];
                        const description = lines[i + 1];
                        const dailyCashPercent = lines[i + 2];
                        const dailyCashAmount = lines[i + 3];
                        const amount = lines[i + 4];
                        
                        // Skip if any of these lines are headers or totals
                        if (date.includes('Date') || 
                            description.includes('Description') || 
                            dailyCashPercent.includes('Daily Cash') || 
                            amount.includes('Total')) {
                            continue;
                        }
                        
                        // Match date format MM/DD/YYYY
                        if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            console.log('Found transaction:', { date, description, amount });
                            transactions.push({
                                date: formatDate(date),
                                description: description.trim(),
                                amount: parseAmount(amount)
                            });
                        }
                    }
                }
            }
        }
        
        console.log('All transactions found:', transactions);
        
        // Sort transactions by date
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Generate and download QIF file
        const qifContent = generateQIF(transactions);
        console.log('Generated QIF content:', qifContent);
        downloadQIF(qifContent);
        
    } catch (error) {
        console.error('Error processing PDFs:', error);
        alert('An error occurred while processing the PDFs. Please try again.');
    } finally {
        processButton.disabled = false;
        processButton.textContent = 'Process Statements';
    }
});

// Format date for QIF (YYYYMMDD)
function formatDate(dateStr) {
    const [month, day, year] = dateStr.split('/');
    return `20${year}${month}${day}`;
}

// Parse amount string to number
function parseAmount(amountStr) {
    return parseFloat(amountStr.replace(/[$,]/g, ''));
}

// Generate QIF content
function generateQIF(transactions) {
    let qif = '!Type:Bank\n';
    
    transactions.forEach(transaction => {
        qif += `D${transaction.date}\n`;
        qif += `T${transaction.amount}\n`;
        qif += `P${transaction.description}\n`;
        qif += '^\n';
    });
    
    return qif;
}

// Download QIF file
function downloadQIF(content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'apple_card_transactions.qif';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 