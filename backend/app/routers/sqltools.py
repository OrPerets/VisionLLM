from __future__ import annotations

from fastapi import APIRouter
from ..schemas import SQLTranspileRequest, SQLTranspileResponse, SQLLintRequest, SQLLintResponse

# Reuse existing implementations with flexible import for local/dev and docker
try:
    from tools.sql_tools import transpile_sql, lint_sql  # type: ignore
except Exception:  # pragma: no cover - fallback path for local runs
    import os
    import sys

    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    if repo_root not in sys.path:
        sys.path.append(repo_root)
    try:
        from tools.sql_tools import transpile_sql, lint_sql  # type: ignore
    except Exception:
        # As a last resort try direct module import from tools directory
        tools_dir = os.path.join(repo_root, "tools")
        if tools_dir not in sys.path:
            sys.path.append(tools_dir)
        from sql_tools import transpile_sql, lint_sql  # type: ignore


router = APIRouter(prefix="/sql", tags=["sql"])


@router.post("/transpile", response_model=SQLTranspileResponse)
def sql_transpile(payload: SQLTranspileRequest) -> SQLTranspileResponse:
    result = transpile_sql(payload.sql, payload.source, payload.target)
    return SQLTranspileResponse(result=result)


@router.post("/lint", response_model=SQLLintResponse)
def sql_lint(payload: SQLLintRequest) -> SQLLintResponse:
    report = lint_sql(payload.sql, payload.dialect)
    fixed = report.split("\n\nSuggested fix:\n")[-1] if "Suggested fix:" in report else payload.sql
    return SQLLintResponse(report=report, fixed=fixed)


