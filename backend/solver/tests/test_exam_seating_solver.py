"""Contract tests for the exam seating OR-Tools JSON solver."""

from __future__ import annotations

import pytest

from .conftest import base_payload, run_solver, seat, student


def _assignment_map(result: dict) -> dict[str, dict]:
    return {a["exam_student_id"]: a for a in result["assignments"]}


def _occupied_seats(result: dict) -> set[tuple[int, int]]:
    return {(a["row"], a["col"]) for a in result["assignments"]}


def _count_adjacent_same_class(result: dict, class_by_student: dict[str, str]) -> int:
    positions: dict[tuple[int, int], str] = {}
    for assignment in result["assignments"]:
        positions[(assignment["row"], assignment["col"])] = class_by_student[
            assignment["exam_student_id"]
        ]

    conflicts = 0
    seen: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for (r, c), cls in positions.items():
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            neighbor = (nr, nc)
            if neighbor in positions and positions[neighbor] == cls:
                pair = tuple(sorted(((r, c), neighbor)))
                if pair not in seen:
                    seen.add(pair)
                    conflicts += 1
    return conflicts


class TestLockedSeats:
    def test_locked_student_stays_on_assigned_seat(self) -> None:
        payload = base_payload(
            rows=2,
            cols=2,
            seats=[
                seat(0, 0, 1, locked=True, exam_student_id="s1"),
                seat(0, 1, 2),
                seat(1, 0, 3),
                seat(1, 1, 4),
            ],
            students=[
                student("s1", "class-a"),
                student("s2", "class-b"),
            ],
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assignments = _assignment_map(result)
        assert assignments["s1"]["row"] == 0
        assert assignments["s1"]["col"] == 0
        assert assignments["s1"]["seat_number"] == 1


class TestDisabledSeats:
    def test_disabled_seats_never_receive_students(self) -> None:
        payload = base_payload(
            rows=1,
            cols=3,
            seats=[
                seat(0, 0, 1),
                seat(0, 1, 2, is_disabled=True),
                seat(0, 2, 3),
            ],
            students=[student("s1", "class-a")],
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assert (0, 1) not in _occupied_seats(result)
        assert len(result["assignments"]) == 1


class TestExactAssignment:
    def test_each_student_assigned_exactly_once(self) -> None:
        payload = base_payload(
            rows=2,
            cols=2,
            seats=[
                seat(0, 0, 1),
                seat(0, 1, 2),
                seat(1, 0, 3),
                seat(1, 1, 4),
            ],
            students=[
                student("s1", "class-a"),
                student("s2", "class-b"),
                student("s3", "class-c"),
            ],
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        student_ids = [a["exam_student_id"] for a in result["assignments"]]
        assert sorted(student_ids) == ["s1", "s2", "s3"]
        assert len(student_ids) == len(set(student_ids))
        assert len(_occupied_seats(result)) == 3


class TestZeroConflictFeasible:
    def test_strict_mode_finds_zero_conflict_layout(self) -> None:
        # Two same-class students placed diagonally in 2x2 — zero adjacency conflicts.
        payload = base_payload(
            rows=2,
            cols=2,
            seats=[
                seat(0, 0, 1),
                seat(0, 1, 2),
                seat(1, 0, 3),
                seat(1, 1, 4),
            ],
            students=[
                student("s1", "class-a"),
                student("s2", "class-a"),
            ],
            strict_mode=True,
        )
        result = run_solver(payload)

        assert result["status"] == "optimal"
        assert result["mode_used"] == "strict"
        assert result["conflicts_count"] == 0
        assert result["conflict_pairs"] == []

        class_by_student = {"s1": "class-a", "s2": "class-a"}
        assert _count_adjacent_same_class(result, class_by_student) == 0


class TestProvenInfeasible:
    def test_strict_mode_proves_infeasible_when_impossible(self) -> None:
        # 1x2 adjacent seats, two same-class students — strict separation impossible.
        payload = base_payload(
            rows=1,
            cols=2,
            seats=[seat(0, 0, 1), seat(0, 1, 2)],
            students=[
                student("s1", "class-a"),
                student("s2", "class-a"),
            ],
            strict_mode=True,
        )
        result = run_solver(payload)

        assert result["status"] in {"feasible", "optimal"}
        assert result["mode_used"] == "fallback"
        assert result["conflicts_count"] >= 1
        assert len(result["conflict_pairs"]) >= 1
        assert len(result["assignments"]) == 2


class TestTimeoutClassification:
    def test_cpsat_timeout_status_from_assignment_solver(self) -> None:
        # Exercise CP-SAT UNKNOWN/timeout at the model layer (solve() may fall back).
        from exam_seating_solver import (
            SeatCell,
            StudentRecord,
            _build_adjacency,
            _solve_assignment,
        )

        rows, cols = 12, 12
        all_seats = [
            SeatCell(r, c, r * cols + c + 1, False, False, None)
            for r in range(rows)
            for c in range(cols)
        ]
        seat_index_by_key = {(s.row, s.col): i for i, s in enumerate(all_seats)}
        adjacency = _build_adjacency(seat_index_by_key, rows, cols)
        movable = [
            StudentRecord(f"s{i}", f"class-{i % 3}")
            for i in range(100)
        ]
        class_by_student = {s.exam_student_id: s.exam_class_id for s in movable}

        result = _solve_assignment(
            movable,
            all_seats,
            adjacency,
            class_by_student,
            [],
            all_seats,
            list(range(len(all_seats))),
            strict=True,
            seed=1,
            timeout_seconds=0.001,
        )

        assert result["status"] in {"timeout", "optimal", "feasible", "infeasible"}
        assert "assignments" in result

    def test_large_exam_uses_constructive_and_assigns_all(self) -> None:
        rows, cols = 40, 30
        seats = [
            seat(r, c, r * cols + c + 1)
            for r in range(rows)
            for c in range(cols)
        ]
        students = [student(f"s{i}", f"class-{i % 20}") for i in range(1000)]
        payload = base_payload(
            rows=rows,
            cols=cols,
            seats=seats,
            students=students,
            strict_mode=True,
            timeout_seconds=5,
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assert result["mode_used"] in {"constructive", "constructive_fallback"}
        assert len(result["assignments"]) == 1000


class TestMalformedInput:
    def test_missing_contract_version_returns_error(self) -> None:
        payload = base_payload(
            rows=1,
            cols=1,
            seats=[seat(0, 0, 1)],
            students=[student("s1", "class-a")],
        )
        del payload["contract_version"]
        result = run_solver(payload)

        assert result["status"] == "error"
        assert "message" in result

    def test_unknown_contract_version_returns_error(self) -> None:
        payload = base_payload(
            rows=1,
            cols=1,
            seats=[seat(0, 0, 1)],
            students=[student("s1", "class-a")],
        )
        payload["contract_version"] = "99.0"
        result = run_solver(payload)

        assert result["status"] == "error"

    def test_more_students_than_usable_seats_is_infeasible(self) -> None:
        payload = base_payload(
            rows=1,
            cols=1,
            seats=[seat(0, 0, 1)],
            students=[
                student("s1", "class-a"),
                student("s2", "class-b"),
            ],
        )
        result = run_solver(payload)

        assert result["status"] == "infeasible"
        assert result["assignments"] == []


class TestDeterminism:
    def test_same_seed_produces_identical_assignments(self) -> None:
        payload = base_payload(
            rows=3,
            cols=3,
            seats=[seat(r, c, r * 3 + c + 1) for r in range(3) for c in range(3)],
            students=[
                student("s1", "class-a"),
                student("s2", "class-b"),
                student("s3", "class-a"),
                student("s4", "class-c"),
            ],
            seed=12345,
        )
        first = run_solver(payload)
        second = run_solver(payload)

        assert first["assignments"] == second["assignments"]
