from __future__ import annotations

from fastapi import APIRouter
from ..schemas import SQLTranspileRequest, SQLTranspileResponse, SQLLintRequest, SQLLintResponse

# Reuse existing implementations
from ...tools.sql_tools import transpile_sql, lint_sql


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


