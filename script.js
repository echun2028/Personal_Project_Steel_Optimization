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

    getMinUsableLength() {
        const thresholdInput = document.getElementById('usableThreshold');
        return thresholdInput ? parseFloat(thresholdInput.value) * 1000 : 100; // Convert m to mm
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
                <input type="number" class="length-input" placeholder="Length (m)" min="0.1" max="8" step="0.1" required>
            </td>
            <td>
                <input type="number" class="quantity-input" placeholder="Quantity" min="1" required>
            </td>
            <td>
                <button type="button" class="remove-row-btn" onclick="steelOptimizer.removeRow(this)">Remove</button>
            </td>
        `;

        tbody.appendChild(row);
        this.rowCount++;
        this.updateOptimizeButton();
        
        // Add tooltips to the new row elements
        this.addTooltipsToRow(row);
    }

    addTooltipsToRow(row) {
        const tooltips = {
            'width-select': 'Select the width of the steel bar from standard sizes',
            'length-input': 'Enter the required length in meters (max 8.0m)',
            'quantity-input': 'Enter the number of pieces needed'
        };

        Object.keys(tooltips).forEach(selector => {
            const element = row.querySelector('.' + selector);
            if (element) {
                element.title = tooltips[selector];
            }
        });
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

        let totalDemand = 0;
        const warnings = [];

        for (const row of rows) {
            const width = row.querySelector('.width-select').value;
            const length = row.querySelector('.length-input').value;
            const quantity = row.querySelector('.quantity-input').value;

            if (!width || !length || !quantity) return false;
            
            const lengthInMm = parseFloat(length) * 1000; // Convert meters to mm
            const quantityNum = parseInt(quantity);
            
            // Basic validation
            if (lengthInMm <= 0 || lengthInMm > this.baseLength) return false;
            if (quantityNum <= 0) return false;
            
            // Sanity checks
            totalDemand += quantityNum;
            
            // Warn if single piece equals base length (causes many single-piece bars)
            if (lengthInMm === this.baseLength) {
                warnings.push(`Piece ${width}mm x ${length}m equals full bar length - will create single-piece bars`);
            }
            
            // Warn if quantity is very large
            if (quantityNum > 1000) {
                warnings.push(`Large quantity (${quantityNum}) for ${width}mm x ${length}m - consider breaking into smaller batches`);
            }
        }

        // Show warnings if any
        if (warnings.length > 0) {
            console.warn('Validation warnings:', warnings);
            // Could show these to user in a non-blocking way
        }

        // Warn if total demand is very high
        if (totalDemand > 10000) {
            console.warn(`Very high total demand (${totalDemand} pieces) - optimization may take longer`);
        }

        return true;
    }

    getInputData() {
        const orders = [];
        const rows = document.querySelectorAll('#inputTableBody tr');

        for (const row of rows) {
            const width = parseInt(row.querySelector('.width-select').value);
            const lengthInMeters = parseFloat(row.querySelector('.length-input').value);
            const quantity = parseInt(row.querySelector('.quantity-input').value);

            if (width && lengthInMeters && quantity) {
                const lengthInMm = Math.round(lengthInMeters * 1000); // Convert meters to mm
                orders.push({ width, length: lengthInMm, quantity });
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

        const results = this.advancedOptimization(pieces);
        this.displayResults(results);
    }

    // Advanced optimization using best-fit decreasing with subset-sum optimization
    advancedOptimization(pieces) {
        const bars = [];
        const remainders = [];
        let totalWaste = 0;
        let totalUsed = 0;
        
        // Load existing remainders as virtual inventory
        const virtualInventory = this.loadVirtualInventory();
        
        // Group pieces by width for width-specific optimization
        const piecesByWidth = {};
        pieces.forEach(piece => {
            if (!piecesByWidth[piece.width]) {
                piecesByWidth[piece.width] = [];
            }
            piecesByWidth[piece.width].push(piece);
        });

        // Process each width group separately, considering virtual inventory
        Object.keys(piecesByWidth).forEach(width => {
            const widthPieces = piecesByWidth[width];
            const widthVirtualInventory = virtualInventory[width] || [];
            const widthBars = this.optimizeWidthGroupWithInventory(parseInt(width), widthPieces, widthVirtualInventory);
            bars.push(...widthBars);
        });

        // Calculate remainders and waste, and save to virtual inventory
        const newRemainders = [];
        bars.forEach(bar => {
            if (bar.remaining > 0) {
                const remainder = {
                    barNumber: bar.barNumber,
                    width: bar.width,
                    remainderLength: bar.remaining,
                    usable: bar.remaining >= this.getMinUsableLength()
                };
                remainders.push(remainder);
                newRemainders.push(remainder);
                totalWaste += bar.remaining;
            }
            totalUsed += bar.totalUsed;
        });

        // Save new remainders to virtual inventory for future use
        this.updateVirtualInventoryWithNewRemainders(newRemainders);

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

    // Optimize pieces of the same width using subset-sum approach
    optimizeWidthGroup(width, pieces) {
        const bars = [];
        let remainingPieces = [...pieces];
        let barNumber = 1;

        while (remainingPieces.length > 0) {
            // Use subset-sum to find optimal combination for this bar
            const { selectedPieces, remainingLength } = this.findOptimalSubset(remainingPieces, this.baseLength);
            
            if (selectedPieces.length === 0) {
                // Fallback: place the largest remaining piece
                const largestPiece = remainingPieces.reduce((max, piece) => 
                    piece.length > max.length ? piece : max
                );
                selectedPieces.push(largestPiece);
            }

            // Create new bar with selected pieces
            const newBar = {
                barNumber: barNumber++,
                pieces: selectedPieces,
                remaining: this.baseLength - selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                totalUsed: selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                width: width
            };
            bars.push(newBar);

            // Remove used pieces from remaining list
            selectedPieces.forEach(usedPiece => {
                const index = remainingPieces.findIndex(piece => piece === usedPiece);
                if (index !== -1) {
                    remainingPieces.splice(index, 1);
                }
            });
        }

        return bars;
    }

    // Find optimal subset using dynamic programming approach
    findOptimalSubset(pieces, maxLength) {
        const n = pieces.length;
        const dp = Array(n + 1).fill(null).map(() => Array(maxLength + 1).fill(false));
        const parent = Array(n + 1).fill(null).map(() => Array(maxLength + 1).fill(-1));
        
        dp[0][0] = true;
        
        // Fill DP table
        for (let i = 1; i <= n; i++) {
            const pieceLength = pieces[i - 1].length;
            for (let j = 0; j <= maxLength; j++) {
                dp[i][j] = dp[i - 1][j];
                if (j >= pieceLength && dp[i - 1][j - pieceLength]) {
                    dp[i][j] = true;
                    parent[i][j] = j - pieceLength;
                }
            }
        }
        
        // Find the best achievable length
        let bestLength = 0;
        for (let j = maxLength; j >= 0; j--) {
            if (dp[n][j]) {
                bestLength = j;
                break;
            }
        }
        
        // Reconstruct selected pieces
        const selectedPieces = [];
        let currentLength = bestLength;
        for (let i = n; i > 0 && currentLength > 0; i--) {
            if (parent[i][currentLength] !== -1) {
                selectedPieces.push(pieces[i - 1]);
                currentLength = parent[i][currentLength];
            }
        }
        
        return {
            selectedPieces,
            remainingLength: maxLength - bestLength
        };
    }

    // Load virtual inventory from localStorage
    loadVirtualInventory() {
        const savedInventory = localStorage.getItem('steelOptimizerVirtualInventory');
        if (savedInventory) {
            try {
                return JSON.parse(savedInventory);
            } catch (e) {
                console.error('Error loading virtual inventory:', e);
            }
        }
        return {};
    }

    // Save virtual inventory to localStorage
    saveVirtualInventory(inventory) {
        localStorage.setItem('steelOptimizerVirtualInventory', JSON.stringify(inventory));
    }

    // Optimize pieces of the same width considering virtual inventory
    optimizeWidthGroupWithInventory(width, pieces, virtualInventory) {
        const bars = [];
        let remainingPieces = [...pieces];
        let barNumber = 1;
        let usedVirtualInventory = [];

        // First, try to use virtual inventory (remainders from previous runs)
        virtualInventory.forEach(remainder => {
            if (remainder.usable && remainder.width === width) {
                // Try to find pieces that fit in this remainder
                const fittingPieces = remainingPieces.filter(piece => piece.length <= remainder.remainderLength);
                if (fittingPieces.length > 0) {
                    // Use subset-sum to optimize this remainder
                    const { selectedPieces } = this.findOptimalSubset(fittingPieces, remainder.remainderLength);
                    
                    if (selectedPieces.length > 0) {
                        // Create bar using this remainder
                        const newBar = {
                            barNumber: barNumber++,
                            pieces: selectedPieces,
                            remaining: remainder.remainderLength - selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                            totalUsed: selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                            width: width,
                            fromVirtualInventory: true
                        };
                        bars.push(newBar);

                        // Remove used pieces
                        selectedPieces.forEach(usedPiece => {
                            const index = remainingPieces.findIndex(piece => piece === usedPiece);
                            if (index !== -1) {
                                remainingPieces.splice(index, 1);
                            }
                        });

                        usedVirtualInventory.push(remainder);
                    }
                }
            }
        });

        // Process remaining pieces with new bars
        while (remainingPieces.length > 0) {
            const { selectedPieces } = this.findOptimalSubset(remainingPieces, this.baseLength);
            
            if (selectedPieces.length === 0) {
                // Fallback: place the largest remaining piece
                const largestPiece = remainingPieces.reduce((max, piece) => 
                    piece.length > max.length ? piece : max
                );
                selectedPieces.push(largestPiece);
            }

            // Create new bar with selected pieces
            const newBar = {
                barNumber: barNumber++,
                pieces: selectedPieces,
                remaining: this.baseLength - selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                totalUsed: selectedPieces.reduce((sum, piece) => sum + piece.length, 0),
                width: width,
                fromVirtualInventory: false
            };
            bars.push(newBar);

            // Remove used pieces from remaining list
            selectedPieces.forEach(usedPiece => {
                const index = remainingPieces.findIndex(piece => piece === usedPiece);
                if (index !== -1) {
                    remainingPieces.splice(index, 1);
                }
            });
        }

        // Update virtual inventory by removing used remainders
        const updatedVirtualInventory = virtualInventory.filter(remainder => 
            !usedVirtualInventory.includes(remainder)
        );
        
        // Save updated virtual inventory
        const allVirtualInventory = this.loadVirtualInventory();
        allVirtualInventory[width] = updatedVirtualInventory;
        this.saveVirtualInventory(allVirtualInventory);

        return bars;
    }

    // Update virtual inventory with new remainders
    updateVirtualInventoryWithNewRemainders(newRemainders) {
        const currentInventory = this.loadVirtualInventory();
        
        newRemainders.forEach(remainder => {
            if (remainder.usable) {
                if (!currentInventory[remainder.width]) {
                    currentInventory[remainder.width] = [];
                }
                currentInventory[remainder.width].push(remainder);
            }
        });
        
        this.saveVirtualInventory(currentInventory);
    }

    greedyOptimization(pieces) {
        const bars = [];
        const remainders = [];
        let totalWaste = 0;
        let totalUsed = 0;

        for (const piece of pieces) {
            let placed = false;

            // Try to place in existing bars of the same width
            for (let i = 0; i < bars.length; i++) {
                const bar = bars[i];
                // CRITICAL FIX: Only place pieces in bars of the same width
                if (bar.width === piece.width && bar.remaining >= piece.length) {
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
        document.getElementById('totalRemainder').textContent = (results.totalRemainder / 1000).toFixed(2) + ' m';
    }

    populateCutsTable(bars) {
        const tbody = document.getElementById('cutsTableBody');
        tbody.innerHTML = '';

        // Show each bar's composition
        bars.forEach(bar => {
            // Group pieces by type within this bar
            const pieceGroups = {};
            bar.pieces.forEach(piece => {
                const key = `${piece.width}x${piece.length}`;
                if (!pieceGroups[key]) {
                    pieceGroups[key] = {
                        width: piece.width,
                        length: piece.length,
                        count: 0
                    };
                }
                pieceGroups[key].count++;
            });

            // Create rows for each piece type in this bar
            Object.values(pieceGroups).forEach(group => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>Bar ${bar.barNumber}</td>
                    <td>${group.width} mm</td>
                    <td>${(group.length / 1000).toFixed(2)} m</td>
                    <td>${group.count}</td>
                    <td>${(bar.totalUsed / 1000).toFixed(2)} m</td>
                    <td>${(bar.remaining / 1000).toFixed(2)} m</td>
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
                <td>${(remainder.remainderLength / 1000).toFixed(2)} m</td>
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
        const printWindow = window.open('', '_blank');
        
        // Get only the tables content, not the entire results section
        const cutsTable = document.getElementById('cutsTable').outerHTML;
        const remaindersTable = document.getElementById('remaindersTable').outerHTML;
        
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
                        h2 { color: #333; margin-top: 30px; }
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
                    
                    <h2>Optimized Cuts</h2>
                    ${cutsTable}
                    
                    <h2>Remainders</h2>
                    ${remaindersTable}
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
        'length-input': 'Enter the required length in meters (max 8.0m)',
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
                // Clear existing rows completely
                document.getElementById('inputTableBody').innerHTML = '';
                steelOptimizer.rowCount = 0;
                
                // Add saved orders
                orders.forEach((order, index) => {
                    steelOptimizer.addRow();
                    const rows = document.querySelectorAll('#inputTableBody tr');
                    const currentRow = rows[rows.length - 1];
                    
                    currentRow.querySelector('.width-select').value = order.width;
                    currentRow.querySelector('.length-input').value = (order.length / 1000).toFixed(1); // Convert mm to m
                    currentRow.querySelector('.quantity-input').value = order.quantity;
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
