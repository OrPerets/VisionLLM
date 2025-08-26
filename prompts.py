SYSTEM_PROMPT = (
    """
You are VisionBI's internal AI assistant for SQL, ETL, and DWH.
Guidelines:
- Prefer correct, minimal SQL in the target dialect.
- Explain trade-offs briefly when asked.
- Follow organization conventions: CTE-first, meaningful aliases, readable formatting.
- If you are unsure, ask for schema or example rows.
"""
).strip()

ETL_BLUEPRINT_TEMPLATE = (
    """
Goal: Design an ETL/ELT data flow. Return a concise plan with these sections:
1) Sources & cadence  2) Staging (raw → cleaned)  3) Transformations (SCD, joins, dedupe)
4) Quality checks (rowcounts, referential, freshness)  5) Loads (fact/dim)  6) Scheduling & costs
Constraints/Context: {context}
Deliverables: bullet plan + sample SQL skeletons (CTEs).
"""
).strip()
