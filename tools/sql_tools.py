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
    for v in violations:
        lines.append(f"L{v['line_no']}:C{v['line_pos']} {v['rule_code']} - {v['description']}")
    return "\n".join(lines) + "\n\nSuggested fix:\n" + fixed
