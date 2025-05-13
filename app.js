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
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');
                
                // Extract transactions from the text
                const pageTransactions = extractTransactions(text);
                transactions.push(...pageTransactions);
            }
        }
        
        // Sort transactions by date
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Generate and download QIF file
        const qifContent = generateQIF(transactions);
        downloadQIF(qifContent);
        
    } catch (error) {
        console.error('Error processing PDFs:', error);
        alert('An error occurred while processing the PDFs. Please try again.');
    } finally {
        processButton.disabled = false;
        processButton.textContent = 'Process Statements';
    }
});

// Extract transactions from PDF text
function extractTransactions(text) {
    const transactions = [];
    
    // Regular expression to match transaction lines
    // Format: MM/DD/YY Description Amount
    const transactionPattern = /(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z0-9\s\-\.]+?)\s+([-+]?\$[\d,]+\.\d{2})/g;
    
    let match;
    while ((match = transactionPattern.exec(text)) !== null) {
        const [_, date, description, amount] = match;
        
        // Skip if this looks like a header or summary line
        if (description.toLowerCase().includes('daily cash') || 
            description.toLowerCase().includes('payment') ||
            description.toLowerCase().includes('balance')) {
            continue;
        }
        
        transactions.push({
            date: formatDate(date),
            description: description.trim(),
            amount: parseAmount(amount)
        });
    }
    
    return transactions;
}

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