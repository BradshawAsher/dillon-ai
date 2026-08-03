Yes — test the six quantitative steps on one real project that has finished synthesis and has confirmed financial facts. Use decimals for rates: 0.25 = 25%, 0.05 = 5%.
A good controlled test set is:
Confirmed revenue: $1,000,000
Confirmed EBITDA/SDE: $200,000
Purchase price: $800,000
Fees: $20,000
Working capital: $30,000
Tax rate: 0.25
Maintenance capex: $20,000
Hold period: 5
Exit multiple: 4
Exit costs: $20,000
That should make expected results easy to recognize.
Documented facts and employee extraction
Upload/process a document containing revenue, EBITDA/SDE, and ideally headcount. Once the document and synthesis finish:
Expect confirmed facts to appear with source/provenance information.
Employee count should appear only if the workflow found evidence—never as 0 when missing.
If a figure is uncertain, mismatched, or uncited, it should not be silently used in calculations.
Deterministic math checks
In the document-level analysis/diligence view, look for the calculated financial checks.
Revenue minus COGS should produce gross profit.
EBITDA margin should equal EBITDA ÷ revenue.
Assets minus liabilities should produce net assets.
Balance-sheet inconsistencies should show as a warning rather than being “fixed” by AI.
Revenue per employee should appear only if the employee count and revenue use compatible periods.
Saved Deal Model inputs
Enter the transaction/assumption values in the Returns, Growth, Deal Structure, and Valuation input areas. Then:
Switch to another workspace tab and back.
Refresh the browser.
Open a different project and return.
Expected: values remain associated with that project, rather than resetting or appearing on another project.
All-cash Returns
Open Returns and enter the controlled test values above.
Expected approximate results:
Initial investment: $850,000
(800k + 20k + 30k)
Annual operating cash flow: $130,000
(200k × (1 − 0.25) − 20k)
Simple annual ROI: about 15.3%
Payback: about 6.5 years
With a 4.0x exit multiple, net exit proceeds: $780,000
(200k × 4 − 20k)
Total MOIC and IRR should populate once hold period and exit inputs are present.
Financed Returns
Still in Returns, enter for example:
Equity contribution: 0.30
Interest rate: 0.10
Amortization: 10
Seller note: $0
Expected:
Equity at close, annual debt service, cash after debt service, cash-on-cash return, DSCR, debt balance at exit, levered MOIC, and levered IRR.
If DSCR falls below 1.25x, expect a visible downside warning.
Increase the interest rate or lower equity contribution to verify debt service rises and returns/DSCR worsen.
Growth scenarios and Valuation
In Growth, set:
Bear: 0% revenue growth, 15% margin, 3x exit
Base: 5% revenue growth, 20% margin, 4x exit
Bull: 10% revenue growth, 25% margin, 5x exit
Expected:
Bear/base/bull each show annual operating cash flow, operating payback, exit value, MOIC, and IRR.
Bull should exceed base; bear should be lowest.
In Valuation, set a revenue multiple, EBITDA multiple, and asset haircut if confirmed assets/liabilities exist.
Expect method cards, blended value, asking-price comparison, and the 3×3 sensitivity grids. The middle Base grid should use 5% growth, 20% margin, and 4.0x exit multiple.
If any number does not populate, first check whether the underlying document fact is marked confirmed and that the required assumption field is filled.
