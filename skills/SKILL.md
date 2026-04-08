---
name: gmap-contact-info
description: 'Search Google Maps for business leads and export to CSV.'
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
metadata:
  author: boyuan
  version: "1.0.0"
  triggers:
    - "search Google Maps for business leads"
    - "export leads to CSV"
    - "find businesses in a specific location"
    - "filter businesses by rating"
    - "generate leads report"
---


# gmaps-leads

Search Google Maps for business leads and export to CSV.

## Usage

```
/gmaps-leads <location>, <business type>, <star range>
```

## Examples

```
/gmaps-leads New York, hotel, 3~5
/gmaps-leads 上海, 餐厅, 4~5
/gmaps-leads London, law firm, 3.5~5
```

## Instructions

When this skill is invoked, extract three parameters from the args:
1. **location** - city or area name
2. **business type** - type of business to search for
3. **star range** - rating range in format `min~max` (e.g. `3~5`, `4~5`, `3.5~5`)

Then run the Python script at `~/.claude/skills/gmaps-leads/search.py` with those parameters:

```bash
python3 ~/.claude/skills/gmaps-leads/search.py "<location>" "<business type>" <min_stars> <max_stars>
```

The script will:
- Search Google Maps via the Places API
- Fetch up to 300 results (paginated)
- Filter by the star rating range
- Export results to a CSV file in the current working directory named `leads_<location>_<business_type>_<timestamp>.csv`

After running, report to the user:
- How many results were found
- The output CSV file path
- Any errors encountered
