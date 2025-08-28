from typing import Optional
import sqlglot as sg
import sqlfluff

def transpile_sql(sql: str, source: str, target: str) -> str:
    """Transpile SQL between dialects (e.g., snowflake → bigquery)."""
    result = sg.transpile(sql, read=source, write=target)
    return result[0] if result else ""

def lint_sql(sql: str, dialect: str) -> str:
    """Return lint report; if autofix helps, include fixed SQL."""
    violations = sqlfluff.lint(sql, dialect=dialect)
    fixed = sqlfluff.fix(sql, dialect=dialect)

    if not violations:
        return "No lint issues found.\n\n" + fixed

    lines = ["Lint issues:"]
    # sqlfluff 3.x returns list[dict] with keys: line_no, line_pos, rule_code, description
    # Some versions return objects; handle both gracefully.
    for v in violations:
        try:
            line_no = v.get("line_no") if isinstance(v, dict) else getattr(v, "line_no", None)
            line_pos = v.get("line_pos") if isinstance(v, dict) else getattr(v, "line_pos", None)
            rule_code = v.get("rule_code") if isinstance(v, dict) else getattr(v, "rule_code", "?")
            description = v.get("description") if isinstance(v, dict) else getattr(v, "description", "")
        except Exception:
            line_no = getattr(v, "line_no", None)
            line_pos = getattr(v, "line_pos", None)
            rule_code = getattr(v, "rule_code", "?")
            description = getattr(v, "description", "")
        lines.append(f"L{line_no}:C{line_pos} {rule_code} - {description}")
    return "\n".join(lines) + "\n\nSuggested fix:\n" + fixed
