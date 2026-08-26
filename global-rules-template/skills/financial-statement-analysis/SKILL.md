---
name: financial-statement-analysis
description: >-
  Use when the user provides or pastes a financial statement (P&L/income
  statement, balance sheet) and asks for analysis, wants results compared
  against KPIs or targets, or asks about a business's profitability,
  liquidity, leverage, or efficiency. Applies a real financial-analysis
  framework instead of impressionistic commentary.
---

# Financial Analysis Skill

Sourced from CFA Institute's published curriculum (developer-equivalent of
a real industry standard, not invented methodology):
- **Financial Analysis Techniques** — cfainstitute.org/insights/professional-learning/refresher-readings/2026/financial-analysis-techniques
- **Analyzing Income Statements** — cfainstitute.org/insights/professional-learning/refresher-readings/2025/analyzing-income-statements

## Use this skill when
- The user pastes or describes a P&L, income statement, or balance sheet
  and wants it analyzed
- The user wants financial results compared against KPIs, targets, or
  prior periods
- The user asks about profitability, liquidity, leverage/solvency, or
  efficiency of a business

## Do not use this skill when
- It's simple personal budgeting with no real statement involved
- The question is tax or legal/compliance-specific (different expertise)
- The user wants investment/stock-picking advice (different domain, and
  carries its own regulatory considerations this skill doesn't cover)

## Critical rule: don't compute what the data can't support

**A P&L (income statement) alone does not contain balance-sheet data.**
Liquidity ratios (current ratio, quick ratio) and leverage ratios
(debt-to-equity, debt-to-assets) require the balance sheet — they cannot
be computed from a P&L alone. If the user only provides a P&L:
- Compute and discuss profitability ratios (see below) — that data is
  present.
- **Explicitly say liquidity/leverage can't be assessed without the
  balance sheet, and ask for it if that's part of what's needed** — don't
  estimate, assume, or fabricate numbers for statements not provided. This
  is the single most likely cause of an analysis going off-track: filling
  a data gap with a plausible-sounding but invented number instead of
  naming the gap.

## Method

1. **Common-size first.** Convert every income-statement line to a
   percentage of revenue (vertical common-size analysis) before comparing
   anything across time periods or against a KPI/benchmark of different
   scale. Raw dollar comparisons across periods of different size are
   misleading on their own.
2. **Use the real ratio categories, not an ad hoc pick:**
   - *Profitability*: gross margin, operating margin, net margin, ROA, ROE
   - *Liquidity* (needs balance sheet): current ratio, quick ratio
   - *Leverage/solvency* (needs balance sheet): debt-to-equity,
     debt-to-assets, interest coverage
   - *Efficiency*: turnover ratios relevant to the business's actual
     operations (inventory turnover for a product business, etc.)
3. **Compare against something real** — a prior period (trend), a target
   the user actually stated, or a benchmark the user actually provided.
   Never invent an "industry average" number to compare against. If no
   real comparison point exists, say so and present the numbers on their
   own rather than manufacturing a comparison.
4. **State the number and its meaning together.** "Gross margin fell from
   42% to 36%, driven by [specific line item that moved]" — not "margins
   declined" on its own, and not a percentage with no plain-language
   meaning attached.
5. **Name what the data can't explain.** A ratio moving is a fact; *why*
   it moved (one-time expense vs. a structural change) often isn't knowable
   from the statement alone. Say what would be needed to know for sure
   rather than guessing at a cause.

## What NOT to do
- Don't compute liquidity/leverage ratios from a P&L alone — ask for the
  balance sheet instead.
- Don't invent a benchmark or industry-average figure to compare against.
- Don't present a ratio without saying what it means in plain terms.
- Don't guess at *why* a number moved when the data doesn't show it —
  name the gap instead.
