// Steel Optimization Calculator - JavaScript
// Implements greedy algorithm for steel cutting optimization

class SteelOptimizer {
    constructor() {
        this.baseLength = 8000; // 8 meters in mm
        this.supportedWidths = [10, 13, 16, 19, 22, 25, 29, 32];
        this.maxRows = 10;
        this.rowCount = 0;
        
        this.initializeEventListeners();
        this.addInitialRow();
    }

    initializeEventListeners() {
        document.getElementById('addRowBtn').addEventListener('click', () => this.addRow());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('optimizeBtn').addEventListener('click', () => this.optimize());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToPDF());
    }

    addInitialRow() {
        this.addRow();
    }

    addRow() {
        if (this.rowCount >= this.maxRows) {
            alert(`Maximum ${this.maxRows} rows allowed`);
            return;
        }

        const tbody = document.getElementById('inputTableBody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <select class="width-select" required>
                    <option value="">Select Width</option>
                    ${this.supportedWidths.map(width => `<option value="${width}">${width}</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="number" class="length-input" placeholder="Length (mm)" min="1" max="8000" required>
            </td>
            <td>
                <input type="number" class="quantity-input" placeholder="Quantity" min="1" max="100" required>
            </td>
            <td>
                <button type="button" class="remove-row-btn" onclick="steelOptimizer.removeRow(this)">Remove</button>
            </td>
        `;

        tbody.appendChild(row);
        this.rowCount++;
        this.updateOptimizeButton();
    }

    removeRow(button) {
        if (this.rowCount <= 1) {
            alert('At least one row is required');
            return;
        }

        button.closest('tr').remove();
        this.rowCount--;
        this.updateOptimizeButton();
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all rows?')) {
            document.getElementById('inputTableBody').innerHTML = '';
            this.rowCount = 0;
            this.addInitialRow();
            this.hideResults();
        }
    }

    updateOptimizeButton() {
        const optimizeBtn = document.getElementById('optimizeBtn');
        const isValid = this.validateInputs();
        optimizeBtn.disabled = !isValid;
    }

    validateInputs() {
        const rows = document.querySelectorAll('#inputTableBody tr');
        if (rows.length === 0) return false;

        for (const row of rows) {
            const width = row.querySelector('.width-select').value;
            const length = row.querySelector('.length-input').value;
            const quantity = row.querySelector('.quantity-input').value;

            if (!width || !length || !quantity) return false;
            if (parseInt(length) <= 0 || parseInt(length) > this.baseLength) return false;
            if (parseInt(quantity) <= 0) return false;
        }

        return true;
    }

    getInputData() {
        const orders = [];
        const rows = document.querySelectorAll('#inputTableBody tr');

        for (const row of rows) {
            const width = parseInt(row.querySelector('.width-select').value);
            const length = parseInt(row.querySelector('.length-input').value);
            const quantity = parseInt(row.querySelector('.quantity-input').value);

            if (width && length && quantity) {
                orders.push({ width, length, quantity });
            }
        }

        return orders;
    }

    optimize() {
        const orders = this.getInputData();
        if (orders.length === 0) {
            alert('Please enter valid order data');
            return;
        }

        // Expand orders into individual pieces
        const pieces = [];
        orders.forEach(order => {
            for (let i = 0; i < order.quantity; i++) {
                pieces.push({
                    width: order.width,
                    length: order.length,
                    originalOrder: order
                });
            }
        });

        // Sort pieces by length (descending) for better optimization
        pieces.sort((a, b) => b.length - a.length);

        const results = this.greedyOptimization(pieces);
        this.displayResults(results);
    }

    greedyOptimization(pieces) {
        const bars = [];
        const remainders = [];
        let totalWaste = 0;
        let totalUsed = 0;

        for (const piece of pieces) {
            let placed = false;

            // Try to place in existing bars
            for (let i = 0; i < bars.length; i++) {
                const bar = bars[i];
                if (bar.remaining >= piece.length) {
                    bar.pieces.push(piece);
                    bar.remaining -= piece.length;
                    bar.totalUsed += piece.length;
                    placed = true;
                    break;
                }
            }

            // If couldn't place in existing bars, create new bar
            if (!placed) {
                const newBar = {
                    barNumber: bars.length + 1,
                    pieces: [piece],
                    remaining: this.baseLength - piece.length,
                    totalUsed: piece.length,
                    width: piece.width
                };
                bars.push(newBar);
            }
        }

        // Calculate remainders and waste
        bars.forEach(bar => {
            if (bar.remaining > 0) {
                remainders.push({
                    barNumber: bar.barNumber,
                    width: bar.width,
                    remainderLength: bar.remaining,
                    usable: bar.remaining >= 100 // Consider usable if >= 100mm
                });
                totalWaste += bar.remaining;
            }
            totalUsed += bar.totalUsed;
        });

        const wastePercentage = ((totalWaste / (bars.length * this.baseLength)) * 100).toFixed(2);

        return {
            bars,
            remainders,
            totalBars: bars.length,
            totalWaste: parseFloat(wastePercentage),
            totalRemainder: totalWaste,
            totalUsed
        };
    }

    displayResults(results) {
        this.populateSummaryCards(results);
        this.populateCutsTable(results.bars);
        this.populateRemaindersTable(results.remainders);
        this.showResults();
    }

    populateSummaryCards(results) {
        document.getElementById('totalBars').textContent = results.totalBars;
        document.getElementById('totalWaste').textContent = results.totalWaste + '%';
        document.getElementById('totalRemainder').textContent = Math.round(results.totalRemainder) + ' mm';
    }

    populateCutsTable(bars) {
        const tbody = document.getElementById('cutsTableBody');
        tbody.innerHTML = '';

        bars.forEach(bar => {
            bar.pieces.forEach((piece, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${bar.barNumber}</td>
                    <td>${piece.width} mm</td>
                    <td>${piece.length} mm</td>
                    <td>1</td>
                    <td>${bar.totalUsed} mm</td>
                    <td>${bar.remaining} mm</td>
                `;
                tbody.appendChild(row);
            });
        });
    }

    populateRemaindersTable(remainders) {
        const tbody = document.getElementById('remaindersTableBody');
        tbody.innerHTML = '';

        remainders.forEach(remainder => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${remainder.barNumber}</td>
                <td>${remainder.width} mm</td>
                <td>${remainder.remainderLength} mm</td>
                <td>${remainder.usable ? 'Yes' : 'No'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    showResults() {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
    }

    hideResults() {
        document.getElementById('resultsSection').style.display = 'none';
    }

    exportToPDF() {
        // Simple PDF export using browser's print functionality
        // In a real implementation, you might use jsPDF library
        const resultsSection = document.getElementById('resultsSection');
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Steel Optimization Results</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .summary { display: flex; justify-content: space-around; margin-bottom: 20px; }
                        .summary-item { text-align: center; }
                        .summary-number { font-size: 24px; font-weight: bold; color: #e74c3c; }
                        .summary-label { color: #666; }
                    </style>
                </head>
                <body>
                    <h1>Steel Optimization Results</h1>
                    <div class="summary">
                        <div class="summary-item">
                            <div class="summary-number">${document.getElementById('totalBars').textContent}</div>
                            <div class="summary-label">Steel Bars Used</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number">${document.getElementById('totalWaste').textContent}</div>
                            <div class="summary-label">Waste Percentage</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-number">${document.getElementById('totalRemainder').textContent}</div>
                            <div class="summary-label">Total Remainder</div>
                        </div>
                    </div>
                    ${resultsSection.innerHTML}
                </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.print();
    }
}

// Initialize the optimizer when the page loads
let steelOptimizer;

document.addEventListener('DOMContentLoaded', function() {
    steelOptimizer = new SteelOptimizer();
    
    // Add input validation listeners
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('width-select') || 
            e.target.classList.contains('length-input') || 
            e.target.classList.contains('quantity-input')) {
            steelOptimizer.updateOptimizeButton();
        }
    });
});

// Add tooltip functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add tooltips to form elements
    const tooltips = {
        'width-select': 'Select the width of the steel bar from standard sizes',
        'length-input': 'Enter the required length in millimeters (max 8000mm)',
        'quantity-input': 'Enter the number of pieces needed'
    };

    Object.keys(tooltips).forEach(selector => {
        const elements = document.querySelectorAll('.' + selector);
        elements.forEach(element => {
            element.title = tooltips[selector];
        });
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter to optimize
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const optimizeBtn = document.getElementById('optimizeBtn');
        if (!optimizeBtn.disabled) {
            optimizeBtn.click();
        }
    }
    
    // Ctrl/Cmd + N to add new row
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        steelOptimizer.addRow();
    }
});

// Add data persistence using localStorage
class DataPersistence {
    static saveData() {
        const orders = steelOptimizer.getInputData();
        localStorage.setItem('steelOptimizerData', JSON.stringify(orders));
    }

    static loadData() {
        const savedData = localStorage.getItem('steelOptimizerData');
        if (savedData) {
            try {
                const orders = JSON.parse(savedData);
                // Clear existing rows
                steelOptimizer.clearAll();
                
                // Add saved orders
                orders.forEach(order => {
                    steelOptimizer.addRow();
                    const rows = document.querySelectorAll('#inputTableBody tr');
                    const lastRow = rows[rows.length - 1];
                    
                    lastRow.querySelector('.width-select').value = order.width;
                    lastRow.querySelector('.length-input').value = order.length;
                    lastRow.querySelector('.quantity-input').value = order.quantity;
                });
                
                steelOptimizer.updateOptimizeButton();
            } catch (e) {
                console.error('Error loading saved data:', e);
            }
        }
    }
}

// Auto-save functionality
document.addEventListener('input', function(e) {
    if (e.target.classList.contains('width-select') || 
        e.target.classList.contains('length-input') || 
        e.target.classList.contains('quantity-input')) {
        setTimeout(() => DataPersistence.saveData(), 1000);
    }
});

// Load saved data on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => DataPersistence.loadData(), 500);
});
