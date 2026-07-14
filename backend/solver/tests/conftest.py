"""Shared helpers for exam seating solver contract tests."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

SOLVER_PATH = Path(__file__).resolve().parents[1] / "exam_seating_solver.py"


def run_solver(payload: dict[str, Any]) -> dict[str, Any]:
    """Invoke the solver subprocess with JSON on stdin; parse JSON stdout."""
    proc = subprocess.run(
        [sys.executable, str(SOLVER_PATH)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        raise RuntimeError(
            f"Solver exited {proc.returncode}\nstderr:\n{proc.stderr}\nstdout:\n{proc.stdout}"
        )
    return json.loads(proc.stdout)


def seat(
    row: int,
    col: int,
    seat_number: int,
    *,
    is_disabled: bool = False,
    locked: bool = False,
    exam_student_id: str | None = None,
) -> dict[str, Any]:
    return {
        "row": row,
        "col": col,
        "seat_number": seat_number,
        "is_disabled": is_disabled,
        "locked": locked,
        "exam_student_id": exam_student_id,
    }


def student(
    exam_student_id: str,
    exam_class_id: str,
    *,
    separation_group_id: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "exam_student_id": exam_student_id,
        "exam_class_id": exam_class_id,
    }
    if separation_group_id is not None:
        payload["separation_group_id"] = separation_group_id
    return payload


def base_payload(
    rows: int,
    cols: int,
    seats: list[dict[str, Any]],
    students: list[dict[str, Any]],
    *,
    strict_mode: bool = True,
    seed: int = 42,
    timeout_seconds: float = 10.0,
    strategy: str = "default",
) -> dict[str, Any]:
    return {
        "contract_version": "1.0",
        "map": {"rows": rows, "cols": cols},
        "seats": seats,
        "students": students,
        "strict_mode": strict_mode,
        "seed": seed,
        "timeout_seconds": timeout_seconds,
        "strategy": strategy,
    }
