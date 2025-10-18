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
                // More precise conversion to avoid floating point errors
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

        // Show loading indicator
        this.showLoadingIndicator();

        // Use setTimeout to allow UI to update before heavy computation
        setTimeout(() => {
            try {
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

                // Check if we should use simplified algorithm for large datasets
                const totalPieces = pieces.length;
                let results;

                if (totalPieces > 1000) { // Increased threshold to use advanced algorithm more often
                    // Use faster greedy algorithm for large datasets
                    console.log(`Large dataset detected (${totalPieces} pieces), using fast algorithm`);
                    results = this.greedyOptimization(pieces);
                } else {
                    // Use advanced algorithm for smaller datasets
                    results = this.advancedOptimization(pieces);
                }

                // Validate results for abnormal efficiency
                this.validateOptimizationResults(pieces, results);

                this.displayResults(results);
            } catch (error) {
                console.error('Optimization error:', error);
                alert('An error occurred during optimization. Please try again.');
            } finally {
                this.hideLoadingIndicator();
            }
        }, 100); // Small delay to allow UI update
    }

    showLoadingIndicator() {
        const optimizeBtn = document.getElementById('optimizeBtn');
        const originalText = optimizeBtn.textContent;
        optimizeBtn.dataset.originalText = originalText;
        optimizeBtn.textContent = 'Optimizing...';
        optimizeBtn.disabled = true;

        // Add spinner if not exists
        if (!optimizeBtn.querySelector('.spinner')) {
            const spinner = document.createElement('span');
            spinner.className = 'spinner';
            spinner.innerHTML = ' ⏳';
            optimizeBtn.appendChild(spinner);
        }

        // Hide previous results
        this.hideResults();
    }

    hideLoadingIndicator() {
        const optimizeBtn = document.getElementById('optimizeBtn');
        const originalText = optimizeBtn.dataset.originalText || 'Optimize Cuts';
        optimizeBtn.textContent = originalText;
        optimizeBtn.disabled = false;

        // Remove spinner
        const spinner = optimizeBtn.querySelector('.spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // Advanced optimization using unified approach for all pieces
    advancedOptimization(pieces) {
        const bars = [];
        const remainders = [];
        let totalUsed = 0;

        // Use unified optimization that considers all pieces together
        const optimizedBars = this.unifiedOptimization(pieces);
        bars.push(...optimizedBars);

        // Calculate remainders and waste, and save to virtual inventory
        const newRemainders = [];
        let actualWaste = 0; // Only count unusable remainders as waste
        let totalRemainder = 0; // Total remainder including usable pieces

        bars.forEach(bar => {
            // Use small tolerance to handle floating point precision errors
            const tolerance = 1; // 1mm tolerance
            const adjustedRemaining = bar.remaining < tolerance ? 0 : bar.remaining;

            if (adjustedRemaining > 0) {
                const remainder = {
                    barNumber: bar.barNumber,
                    width: bar.width,
                    remainderLength: adjustedRemaining,
                    usable: adjustedRemaining >= this.getMinUsableLength()
                };
                remainders.push(remainder);
                newRemainders.push(remainder);

                totalRemainder += adjustedRemaining;

                // Only count unusable remainders as actual waste
                if (!remainder.usable) {
                    actualWaste += adjustedRemaining;
                }
            }
            totalUsed += bar.totalUsed;
        });

        // Save new remainders to virtual inventory for future use
        this.updateVirtualInventoryWithNewRemainders(newRemainders);

        // Calculate waste percentage based on actual waste (unusable remainders only)
        const wastePercentage = ((actualWaste / (bars.length * this.baseLength)) * 100).toFixed(2);

        return {
            bars,
            remainders,
            totalBars: bars.length,
            totalWaste: parseFloat(wastePercentage), // Only unusable remainders
            totalRemainder: totalRemainder, // All remainders including usable ones
            actualWaste: actualWaste, // Unusable remainders in mm
            totalUsed
        };
    }

    // Validate optimization results for abnormal efficiency
    validateOptimizationResults(pieces, results) {
        const totalPieceLength = pieces.reduce((sum, piece) => sum + piece.length, 0);
        const totalBarLength = results.totalBars * this.baseLength;
        const theoreticalEfficiency = (totalPieceLength / totalBarLength) * 100;

        console.log(`Optimization Validation:
        - Total pieces: ${pieces.length}
        - Total piece length: ${totalPieceLength}mm (${(totalPieceLength/1000).toFixed(1)}m)
        - Total bars used: ${results.totalBars}
        - Total bar length: ${totalBarLength}mm (${(totalBarLength/1000).toFixed(1)}m)
        - Theoretical efficiency: ${theoreticalEfficiency.toFixed(1)}%
        - Actual waste: ${results.totalWaste}%`);

        // Check for same-length pieces efficiency
        this.validateSameLengthPieces(pieces, results);

        // Alert if efficiency is suspiciously low
        if (theoreticalEfficiency < 50) {
            console.warn('⚠️ Very low efficiency detected! This might indicate a problem with the optimization algorithm.');
        }
    }

    // Validate efficiency for same-length pieces
    validateSameLengthPieces(pieces, results) {
        const piecesByLength = {};
        pieces.forEach(piece => {
            if (!piecesByLength[piece.length]) {
                piecesByLength[piece.length] = 0;
            }
            piecesByLength[piece.length]++;
        });

        Object.keys(piecesByLength).forEach(lengthStr => {
            const length = parseInt(lengthStr);
            const count = piecesByLength[lengthStr];

            if (count >= 5) { // Only check if we have 5+ pieces of same length
                const maxPiecesPerBar = Math.floor(this.baseLength / length);
                const theoreticalBars = Math.ceil(count / maxPiecesPerBar);
                const theoreticalEfficiency = ((count * length) / (theoreticalBars * this.baseLength)) * 100;

                console.log(`Same-length validation for ${length}mm pieces:
                - Count: ${count} pieces
                - Max per bar: ${maxPiecesPerBar}
                - Theoretical bars needed: ${theoreticalBars}
                - Theoretical efficiency: ${theoreticalEfficiency.toFixed(1)}%`);

                if (theoreticalEfficiency > 80 && results.totalWaste > 20) {
                    console.warn(`⚠️ Inefficient packing detected for ${length}mm pieces!
                    Expected efficiency: ${theoreticalEfficiency.toFixed(1)}%
                    Actual waste: ${results.totalWaste}%`);
                }
            }
        });
    }

    // Unified optimization that considers all pieces together regardless of width
    unifiedOptimization(pieces) {
        const bars = [];
        let remainingPieces = [...pieces];
        let barNumber = 1;

        // Continue until all pieces are placed
        while (remainingPieces.length > 0) {
            // Find the best combination for one 8m bar
            const { selectedPieces } = this.findBestCombinationForBar(remainingPieces, this.baseLength);

            if (selectedPieces.length === 0) {
                // Fallback: place the largest remaining piece
                const largestPiece = remainingPieces.reduce((max, piece) =>
                    piece.length > max.length ? piece : max
                );
                selectedPieces.push(largestPiece);
            }

            // Create new bar with selected pieces
            const totalUsedInBar = selectedPieces.reduce((sum, piece) => sum + piece.length, 0);
            const remainingLength = this.baseLength - totalUsedInBar;

            const newBar = {
                barNumber: barNumber++,
                pieces: selectedPieces,
                remaining: Math.max(0, remainingLength), // Ensure no negative remainders
                totalUsed: totalUsedInBar,
                width: 'mixed' // Indicate this bar has mixed widths
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

    // Find the best combination of pieces that fit in one 8m bar (regardless of width)
    findBestCombinationForBar(pieces, maxLength) {
        let bestCombination = [];
        let bestUsedLength = 0;

        // Group pieces by length for pattern recognition
        const piecesByLength = {};
        pieces.forEach(piece => {
            if (!piecesByLength[piece.length]) {
                piecesByLength[piece.length] = [];
            }
            piecesByLength[piece.length].push(piece);
        });

        // Try pattern-based optimization first
        const patternResult = this.findPatternBasedCombination(piecesByLength, maxLength);
        if (patternResult.selectedPieces.length > 0) {
            bestCombination = patternResult.selectedPieces;
            bestUsedLength = patternResult.usedLength;
        }

        // Always try mixed approach to maximize bar usage
        const mixedResult = this.findMixedCombination(pieces, maxLength);
        if (mixedResult.usedLength > bestUsedLength) {
            bestCombination = mixedResult.selectedPieces;
            bestUsedLength = mixedResult.usedLength;
        }

        return {
            selectedPieces: bestCombination,
            remainingLength: maxLength - bestUsedLength
        };
    }

    // Pattern-based combination: prioritize same-length pieces
    findPatternBasedCombination(piecesByLength, maxLength) {
        let bestCombination = [];
        let bestUsedLength = 0;

        // Try each length pattern
        Object.keys(piecesByLength).forEach(lengthStr => {
            const length = parseInt(lengthStr);
            const piecesOfThisLength = piecesByLength[lengthStr];
            const maxFit = Math.floor(maxLength / length);
            const actualFit = Math.min(maxFit, piecesOfThisLength.length);

            if (actualFit > 0) {
                const usedLength = actualFit * length;
                if (usedLength > bestUsedLength) {
                    bestCombination = piecesOfThisLength.slice(0, actualFit);
                    bestUsedLength = usedLength;
                }
            }
        });

        // Try to fill remaining space with other pieces
        const remainingSpace = maxLength - bestUsedLength;
        if (remainingSpace > 0 && bestCombination.length > 0) {
            const usedPieces = new Set(bestCombination);
            const remainingPieces = [];

            Object.values(piecesByLength).forEach(pieces => {
                pieces.forEach(piece => {
                    if (!usedPieces.has(piece) && piece.length <= remainingSpace) {
                        remainingPieces.push(piece);
                    }
                });
            });

            // Sort remaining pieces by length (descending)
            remainingPieces.sort((a, b) => b.length - a.length);

            let currentSpace = remainingSpace;
            for (const piece of remainingPieces) {
                if (piece.length <= currentSpace) {
                    bestCombination.push(piece);
                    bestUsedLength += piece.length;
                    currentSpace -= piece.length;
                }
            }
        }

        return {
            selectedPieces: bestCombination,
            usedLength: bestUsedLength
        };
    }

    // Mixed combination: try different piece combinations
    findMixedCombination(pieces, maxLength) {
        let bestCombination = [];
        let bestUsedLength = 0;

        // Consider all pieces for mixed greedy approaches
        const piecesToConsider = pieces; // pieces are pre-sorted descending by length

        // Greedy selection (descending order)
        let currentCombination = [];
        let currentUsedLength = 0;
        for (const piece of piecesToConsider) {
            if (currentUsedLength + piece.length <= maxLength) {
                currentCombination.push(piece);
                currentUsedLength += piece.length;
            }
        }
        bestCombination = [...currentCombination];
        bestUsedLength = currentUsedLength;

        // Greedy selection (ascending order) to catch mixed-length perfect fits
        currentCombination = [];
        currentUsedLength = 0;
        for (const piece of [...piecesToConsider].reverse()) {
            if (currentUsedLength + piece.length <= maxLength) {
                currentCombination.push(piece);
                currentUsedLength += piece.length;
            }
        }
        if (currentUsedLength > bestUsedLength) {
            bestCombination = [...currentCombination];
            bestUsedLength = currentUsedLength;
        }

        return {
            selectedPieces: bestCombination,
            usedLength: bestUsedLength
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

    // Find optimal subset using optimized approach
    findOptimalSubset(pieces, maxLength) {
        // For performance, limit the number of pieces to consider
        const maxPiecesToConsider = 20;
        const piecesToUse = pieces.length > maxPiecesToConsider ?
            pieces.slice(0, maxPiecesToConsider) : pieces;

        // Use greedy approach with backtracking for better performance
        return this.greedySubsetSelection(piecesToUse, maxLength);
    }

    // Faster greedy approach with limited backtracking
    greedySubsetSelection(pieces, maxLength) {
        let bestCombination = [];
        let bestUsedLength = 0;

        // Try greedy approach first (fastest)
        let currentCombination = [];
        let currentUsedLength = 0;

        for (const piece of pieces) {
            if (currentUsedLength + piece.length <= maxLength) {
                currentCombination.push(piece);
                currentUsedLength += piece.length;
            }
        }

        bestCombination = currentCombination;
        bestUsedLength = currentUsedLength;

        // If we have time and few pieces, try some optimizations
        if (pieces.length <= 10) {
            // Try removing smallest piece and adding largest possible
            for (let i = currentCombination.length - 1; i >= 0; i--) {
                const testCombination = [...currentCombination];
                const removedPiece = testCombination.splice(i, 1)[0];
                let testUsedLength = currentUsedLength - removedPiece.length;

                // Try to add a larger piece
                for (const piece of pieces) {
                    if (!testCombination.includes(piece) &&
                        testUsedLength + piece.length <= maxLength &&
                        piece.length > removedPiece.length) {
                        testCombination.push(piece);
                        testUsedLength += piece.length;

                        if (testUsedLength > bestUsedLength) {
                            bestCombination = [...testCombination];
                            bestUsedLength = testUsedLength;
                        }
                        break;
                    }
                }
            }
        }

        return {
            selectedPieces: bestCombination,
            remainingLength: maxLength - bestUsedLength
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
        let totalUsed = 0;

        for (const piece of pieces) {
            let placed = false;

            // Try to place in existing bars (regardless of width)
            for (let i = 0; i < bars.length; i++) {
                const bar = bars[i];
                // Place piece if there's enough remaining space
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
                const remainingLength = this.baseLength - piece.length;
                const newBar = {
                    barNumber: bars.length + 1,
                    pieces: [piece],
                    remaining: Math.max(0, remainingLength), // Ensure no negative remainders
                    totalUsed: piece.length,
                    width: 'mixed' // Can contain mixed widths
                };
                bars.push(newBar);
            }
        }

        // Calculate remainders and waste
        let actualWaste = 0; // Only count unusable remainders as waste
        let totalRemainder = 0; // Total remainder including usable pieces

        bars.forEach(bar => {
            // Use small tolerance to handle floating point precision errors
            const tolerance = 1; // 1mm tolerance
            const adjustedRemaining = bar.remaining < tolerance ? 0 : bar.remaining;

            if (adjustedRemaining > 0) {
                const remainder = {
                    barNumber: bar.barNumber,
                    width: bar.width,
                    remainderLength: adjustedRemaining,
                    usable: adjustedRemaining >= this.getMinUsableLength()
                };
                remainders.push(remainder);

                totalRemainder += adjustedRemaining;

                // Only count unusable remainders as actual waste
                if (!remainder.usable) {
                    actualWaste += adjustedRemaining;
                }
            }
            totalUsed += bar.totalUsed;
        });

        const wastePercentage = ((actualWaste / (bars.length * this.baseLength)) * 100).toFixed(2);

        return {
            bars,
            remainders,
            totalBars: bars.length,
            totalWaste: parseFloat(wastePercentage), // Only unusable remainders
            totalRemainder: totalRemainder, // All remainders including usable ones
            actualWaste: actualWaste, // Unusable remainders in mm
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

        // Group all pieces by order type (width x length) across all bars
        const orderSummary = {};

        bars.forEach(bar => {
            bar.pieces.forEach(piece => {
                const orderKey = `${piece.width}x${piece.length}`;
                if (!orderSummary[orderKey]) {
                    orderSummary[orderKey] = {
                        width: piece.width,
                        length: piece.length,
                        totalQuantity: 0,
                        barsUsed: new Set()
                    };
                }
                orderSummary[orderKey].totalQuantity++;
                orderSummary[orderKey].barsUsed.add(bar.barNumber);
            });
        });

        // Create simplified summary rows
        Object.values(orderSummary).forEach(order => {
            const barsCount = order.barsUsed.size;
            const totalUsedLength = (order.totalQuantity * order.length) / 1000; // Convert to meters
            const efficiency = ((order.totalQuantity * order.length) / (barsCount * 8000) * 100).toFixed(1);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.width}mm × ${(order.length / 1000).toFixed(1)}m</td>
                <td>${order.totalQuantity} pieces</td>
                <td>${barsCount} bars</td>
                <td>${totalUsedLength.toFixed(1)}m total</td>
                <td>${efficiency}% efficiency</td>
            `;
            tbody.appendChild(row);
        });
    }

    populateRemaindersTable(remainders) {
        const tbody = document.getElementById('remaindersTableBody');
        tbody.innerHTML = '';

        if (remainders.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="4" style="text-align: center; color: #28a745;">✅ No remainders - Perfect optimization!</td>`;
            tbody.appendChild(row);
            return;
        }

        // Group remainders by usability and width
        const usableRemainders = remainders.filter(r => r.usable);
        const wasteRemainders = remainders.filter(r => !r.usable);

        // Show usable remainders summary first
        if (usableRemainders.length > 0) {
            const usableByWidth = {};
            usableRemainders.forEach(r => {
                const widthKey = r.width === 'mixed' ? 'mixed' : `${r.width}mm`;
                if (!usableByWidth[widthKey]) {
                    usableByWidth[widthKey] = { count: 0, totalLength: 0 };
                }
                usableByWidth[widthKey].count++;
                usableByWidth[widthKey].totalLength += r.remainderLength;
            });

            Object.keys(usableByWidth).forEach(widthKey => {
                const summary = usableByWidth[widthKey];
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td style="color: #28a745;">♻️ Reusable</td>
                    <td>${widthKey === 'mixed' ? 'Mixed widths' : widthKey + ' width'}</td>
                    <td>${summary.count} pieces</td>
                    <td>${(summary.totalLength / 1000).toFixed(1)}m total</td>
                `;
                tbody.appendChild(row);
            });
        }

        // Show waste summary
        if (wasteRemainders.length > 0) {
            const totalWasteLength = wasteRemainders.reduce((sum, r) => sum + r.remainderLength, 0);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="color: #dc3545;">🗑️ Waste</td>
                <td>Mixed widths</td>
                <td>${wasteRemainders.length} pieces</td>
                <td>${(totalWasteLength / 1000).toFixed(1)}m total</td>
            `;
            tbody.appendChild(row);
        }
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
                orders.forEach((order) => {
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
