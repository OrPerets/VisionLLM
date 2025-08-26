from __future__ import annotations

from app.routers.sqltools import sql_transpile, sql_lint
from app.schemas import SQLTranspileRequest, SQLLintRequest


def test_transpile_basic():
    req = SQLTranspileRequest(sql="SELECT 1", source="snowflake", target="bigquery")
    res = sql_transpile(req)
    assert "SELECT 1" in res.result.upper()


def test_lint_basic():
    req = SQLLintRequest(sql="select 1", dialect="snowflake")
    res = sql_lint(req)
    assert "Suggested fix" in res.report or res.fixed


