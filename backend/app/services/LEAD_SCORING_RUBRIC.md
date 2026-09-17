# Lead Scoring Engine Rubric

Overall score is calculated on a 0-100 scale:

```text
overall = sum(dimension_score * dimension_weight) * penalty_multiplier
```

## Dimensions

| Dimension | Weight | Main Positive Signals |
| --- | ---: | --- |
| Museum Fit | 15% | Cultural category, art/history/heritage text, visitor count, children/traveling programs |
| Gift Shop | 20% | Physical store page, online store, Shopify/WooCommerce/ecommerce signals, merchandise keywords |
| Wholesale Potential | 15% | Wholesale page, vendor application, supplier/procurement/bulk-order language |
| Cultural / Asian / Chinese Heritage Fit | 20% | Asian/Chinese/global culture flags, landmark themes, relevant collection keywords |
| Corporate Gift / Tourism Fit | 15% | High visitor count, Fortune 500 rank, large employee count, tourism/events/corporate gift text |
| Partnership Probability | 15% | Direct email, decision-maker title, LinkedIn, procurement/partnership language |

## Critical Blockers

The score is degraded when the lead has major commercial blockers:

- No gift shop, ecommerce store, event program, or corporate gifting signal.
- No contact path available for outreach.
- Existing status is `disqualified`, `duplicate`, or `archived`.

Penalty multiplier:

```text
0 blockers = 1.00
1 blocker  = 0.85
2 blockers = 0.70
3+ blockers = 0.55 minimum
```

## Recommended Actions

| Final Score | Action |
| ---: | --- |
| 80-100 | High priority: prepare personalized draft |
| 65-79 | Qualified: enrich contacts and add to outreach queue |
| 45-64 | Nurture: review fit and missing data |
| 0-44 | Low priority or manual research if blockers exist |
