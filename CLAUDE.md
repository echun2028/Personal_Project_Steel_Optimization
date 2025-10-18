# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Steel Optimization MVP** - a static web application that calculates optimal ways to cut 8m steel bars into specified orders to minimize waste and demonstrate cost/environmental savings. The project is built as a pure client-side application using HTML5, CSS3, and Vanilla JavaScript with no build process or dependencies.

## Development Commands

This is a static web application with no build process or server requirements.

```bash
# Simply open index.html directly in any browser
# No server or build commands needed

# For local development testing (optional):
# python3 -m http.server 8000 (if CORS issues occur)
```

## Project Architecture

### File Structure
```
/
├── index.html          # Home page - explains business value and impact
├── howto.html          # Tutorial page - step-by-step usage guide
├── calculator.html     # Main tool - input form and optimization results
├── style.css           # Steel-tone theme (white/grey/black) with responsive design
├── script.js           # Core optimization algorithm and DOM manipulation
├── README.md           # Comprehensive project documentation
└── PRD.md              # Product requirements document
```

### Core Architecture

**SteelOptimizer Class** (`script.js:4-400+`):
- Main application class handling all functionality
- Implements greedy algorithm for steel cutting optimization
- Manages DOM interactions, form validation, and results display
- Key properties: `baseLength: 8000mm`, `supportedWidths: [10,13,16,19,22,25,29,32]`, `maxRows: 10`

**Algorithm Flow**:
1. Input validation for width/length/quantity combinations
2. Order expansion into individual pieces
3. Greedy optimization: sort by length descending, fit pieces into bars with sufficient remaining space
4. Waste calculation and results display in tables

**Navigation**: Three-page SPA-style navigation via top tabs (Home | How To | Calculator)

### Key Constraints
- **Performance**: Must process ≤10 input rows in <1 second
- **Accuracy**: ≥97% optimization compared to manual planning
- **Input limits**: 10 rows max, widths from preset list, lengths ≤8000mm
- **Steel widths**: Fixed set [10, 13, 16, 19, 22, 25, 29, 32] mm only

### Data Storage
- Uses `localStorage` for temporary data persistence
- No backend or database - purely client-side

## Development Notes

- **No package.json or build tools** - this is intentionally a simple static site
- **Mobile-first responsive design** implemented in `style.css`
- **Keyboard shortcuts**: Ctrl+Enter to optimize, Ctrl+N to add row
- **Business focus**: Emphasizes cost savings (15-20% waste reduction) and CO₂ impact reduction
- **Future enhancement**: PDF export using jsPDF library (currently placeholder)

## Current Calculation Methods (Mathematical Explanation)

### Step 1: Order Processing
**Input**: Orders with width, length, and quantity
**Process**: Create individual pieces from each order
- If you order 5 pieces of 10mm × 2000mm → Creates 5 separate pieces of 10mm × 2000mm
- All pieces are then sorted from longest to shortest (e.g., 3000mm, 2500mm, 2000mm, 1500mm...)

### Step 2: Steel Bar Optimization (First-Fit Algorithm)
**Goal**: Place each piece into 8000mm steel bars to minimize waste
**Process**:
1. Take the longest remaining piece
2. Check all existing bars in order to see if it fits
3. Place it in the first bar where: `Remaining Space ≥ Piece Length`
4. If no existing bar has enough space, create a new 8000mm bar. If there are not enough spaces but some still left, those are the "WASTE". 
5. Repeat until all pieces are placed

**Example**:
- Bar 1: 3000mm piece → Remaining: 8000 - 3000 = 5000mm
- Next piece 2000mm → Fits in Bar 1 → Remaining: 5000 - 2000 = 3000mm
- Next piece 4000mm → Doesn't fit in Bar 1 → Create Bar 2
- This only works if the orders have both 2000mm and 3000mm. Furthermore, cutting the steel should be consistent all throughout. This means that the pattern shuold be consistent. 

### Step 3: Waste Calculation
**Total Waste (mm)** = Sum of all remaining spaces in all bars
**Waste Percentage** = (Total Waste ÷ Total Steel Purchased) × 100

**Mathematical Formula**:
```
Waste % = (Sum of All Remainders) ÷ (Number of Bars × 8000mm) × 100
==> This is wrong because this is the flow: If there are not enough spaces but some steel are left, those are the "WASTE". 


Example:
- Bar 1 remainder: 1000mm
- Bar 2 remainder: 500mm
- Bar 3 remainder: 300mm
- Total bars used: 3
- Waste % = (1000 + 500 + 300) ÷ (3 × 8000) × 100 = 1800 ÷ 24000 × 100 = 7.5%
```

### Step 4: Remainder Classification
**Usable Remainder**: Any leftover piece ≥ 100mm
- Remainders < 100mm = Considered waste (too small to use)
- Remainders ≥ 100mm = Marked as potentially reusable

### Step 5: Final Results
- **Total Steel Bars Needed**: Count of 8000mm bars used
- **Total Waste Percentage**: Calculated as above
- **Total Waste Length**: Sum of all remainder lengths in millimeters
- **Cost Efficiency**: Lower waste percentage = better optimization
Instead of writing down every line of the process, just summarize it into one single line by counting all the quantities for each order in one row. This means that if there were 4 inputs, the line of outputs should also be 4. 

## Code Style
- Uses ES6+ class syntax and modern JavaScript features
- Vanilla DOM manipulation (no frameworks)
- CSS Grid and Flexbox for responsive layouts
- Steel industry theme with professional color palette