In an M&A post-LOI (Letter of Intent) environment, you are transitioning from "courtship" to "forensic audit." Your agent needs to handle a hierarchy of documents. Building your test sets requires understanding that the quality of data is inversely proportional to how easy it is to get.
Here is the breakdown of document types to structure your model’s input requirements.
1. The "Must-Haves" (The Core Data Set)
These are the files you will receive in almost every deal. If these aren't provided, the deal usually stalls.
P&L (Income Statements) - 3-5 Years: The standard report. Your Agent Strategy: This is your baseline. Your agent must validate the arithmetic here first (Sum of months/quarters = Yearly total).
Balance Sheet: Crucial for spotting off-balance-sheet liabilities.
Customer/Revenue Concentration Schedule: This is your primary risk metric. Your Agent Strategy: Build test sets with randomized concentration percentages. If 30% of revenue comes from one customer, your agent should automatically flag a RED risk.
Fixed Asset Register: Essential for capital expenditure analysis.
2. The "Hard-to-Get" (The Negotiation Levers)
These are rarely handed over early. You usually have to fight or ask multiple times.
Detailed Payroll/Headcount Data: Sellers often hide "ghost" employees or family members on payroll who don't actually work. Your Agent Strategy: Your model needs to cross-reference this against the organizational chart.
Contractual "Change of Control" Clauses: Found in supplier or lease agreements. Your Agent Strategy: Your agent should perform Keyword Extraction for "Assignment," "Termination," and "Price Adjustment."
Customer Contracts/Master Service Agreements: Sellers hate sharing these because they show pricing secrets.
3. The "Rare/Secret" (The "Silver Bullets")
These documents are often the "smoking gun" that kills a deal or slashes the price.
IT System/Cybersecurity Logs: Rarely shared, but critical for tech acquisitions.
Pending Litigation/Legal Correspondence: Usually kept in a separate, highly locked-down data room.
Internal Emails/Communication: You almost never get these unless there is a formal investigation or significant due diligence concern.