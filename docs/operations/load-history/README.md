# Load History - Overview

## Purpose

Track every completed load with full details for:
- **Margin tracking** - Know your profit on each load
- **Pricing reference** - Use historical data to price new quotes
- **Business intelligence** - Analyze trends, carrier performance, lane profitability

---

## Business Value

### For Quoting
When you get a new quote request:
1. Search for similar past loads (same lane, similar cargo)
2. See what you charged and what it cost
3. Price competitively with confidence

### For Analysis
- Which lanes are most profitable?
- Which carriers give the best rates?
- How are margins trending over time?
- What equipment types are used most?

---

## Data Captured

### Route Information
- Origin: City, State, ZIP
- Destination: City, State, ZIP
- Total miles

### Cargo Details
- Description
- Dimensions (L × W × H)
- Weight
- Number of pieces
- Oversize/overweight flags
- Equipment type used

### Financial Data
- **Customer Rate** - What you charged the customer
- **Carrier Rate** - What you paid the carrier
- **Margin** - Your profit (customer - carrier)
- **Margin %** - Profit percentage
- **Rate per Mile** - For both customer and carrier

### Carrier Assignment
- Which carrier handled the load
- Which driver
- Which truck

### Dates
- Quote date
- Booked date
- Pickup date
- Delivery date
- Invoice date
- Paid date

### Link to Quotes
- Can link to original Load Planner quote
- Can link to original Inland quote

---

## Features

### 1. Record Completed Loads
- Manual entry form
- Pre-fill from completed quote
- Calculate margins automatically

### 2. Search & Filter
- Search by route, customer, carrier
- Filter by date range
- Filter by equipment type
- Filter by margin range
- Filter by carrier

### 3. Analytics
- Summary stats (total loads, revenue, margin)
- Lane profitability
- Carrier performance
- Margin trends

### 4. Similar Loads Lookup
- When quoting, search for similar loads
- Match by dimensions and route
- See historical pricing

---

## Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/load-history` | Load History | View all completed loads |

---

## Related Documents

- [Database Schema](./database-schema.md) - Complete table definition
- [API Reference](./api-reference.md) - tRPC endpoints
- [UI Specifications](./ui-specifications.md) - Page layout
- [Implementation Guide](./implementation.md) - Step-by-step tasks

---

## Key Metrics

### Calculated Fields

```typescript
// Margin in cents
margin_cents = customer_rate_cents - carrier_rate_cents

// Margin percentage
margin_percentage = (margin_cents / customer_rate_cents) * 100

// Rate per mile (customer)
rate_per_mile_customer_cents = customer_rate_cents / total_miles

// Rate per mile (carrier)
rate_per_mile_carrier_cents = carrier_rate_cents / total_miles
```

### Margin Health Indicators

| Margin % | Status | Color |
|----------|--------|-------|
| > 25% | Excellent | Green |
| 15-25% | Good | Yellow |
| 10-15% | Low | Orange |
| < 10% | Critical | Red |

---

## Integration Points

### From Load Planner
When a Load Planner quote is accepted and completed:
1. Click "Record as Load" action
2. Pre-fills route, cargo, pricing from quote
3. Add carrier assignment and actual dates
4. Save to load history

### From Carriers
On carrier detail page, see:
- All loads that carrier handled
- Total revenue from that carrier
- Average margin with that carrier

### To Quoting
When creating new quote:
- "Find Similar Loads" feature
- Shows matching historical loads
- Provides pricing guidance
