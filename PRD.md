Steel Optimization MVP – PRD
1. Objective

A static web app (HTML, CSS, JS) that calculates the optimal way to cut 8m steel bars into specified orders to minimize waste and show cost/environmental savings.

2. Target Users

Steel industry workers optimizing material use

Students learning industrial optimization

General users exploring cost/CO₂ efficiency

3. Core Features
A. Input Form

User inputs: width (10, 13, 16, 19, 22, 25, 29, 32 (mm)), length (mm), quantity (EA)

Add/remove rows dynamically

8 m steel bar fixed as base length

B. Optimization Logic

Greedy/iterative JS algorithm groups orders summing ≤ 8 m

Outputs optimized sets + leftovers + loss %

Accuracy goal: ≥ 97% vs. manual cuts

C. Results Display

Tables for optimized cuts, remainders, and loss %

D. Informational Pages

Home: why optimization matters (cost + CO₂)

How To: simple step guide

Calculator: main tool page

4. UI / UX

Steel-tone theme (white / grey / black)

Top nav tabs: Home | How To | Calculator

Mobile-friendly layout; tooltips for guidance

Success metric: 90% navigation clarity in tests

5. Tech Specs
Item	Description
Stack	HTML + CSS + JS (Static)
Hosting	Local / GitHub Pages
Libraries	jsPDF (optional)
Storage	LocalStorage (temporary)
Inputs Limit	≤ 10 rows per run
Performance	< 1 s for 10 inputs

6. Success Criteria
Area	Goal
Optimization	≥ 97% accuracy
Usability	≥ 90% clear navigation
Aesthetics	≥ 80% positive feedback
Business Value	≥ 80% understand cost / CO₂ impact

7. Deliverables

index.html, howto.html, calculator.html

style.css, script.js, README.md