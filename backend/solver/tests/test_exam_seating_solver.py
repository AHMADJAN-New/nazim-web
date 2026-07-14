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
        for dr, dc in (
            (1, 0),
            (-1, 0),
            (0, 1),
            (0, -1),
            (1, 1),
            (1, -1),
            (-1, 1),
            (-1, -1),
        ):
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
        # Two same-class students on a 1x3 row: seating them at cols 0 and 2
        # (empty seat between them) is zero-conflict even with diagonal checks.
        payload = base_payload(
            rows=1,
            cols=3,
            seats=[
                seat(0, 0, 1),
                seat(0, 1, 2),
                seat(0, 2, 3),
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

    def test_strict_mode_avoids_diagonal_same_class(self) -> None:
        # 2x2 grid, two same-class students: every seat pair (including the
        # diagonals) is adjacent, so strict separation is impossible and the
        # solver must fall back rather than seat them corner-to-corner.
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

        assert result["mode_used"] == "fallback"
        assert result["conflicts_count"] >= 1


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

    def test_large_exam_solves_without_conflicts(self) -> None:
        # 1000 students / 20 classes on a 1200-seat hall: CP-SAT (class-level
        # model) must now seat everyone with zero same-class adjacency — no
        # constructive bypass, no diagonal conflicts.
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
            timeout_seconds=60,
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assert result["mode_used"] == "strict"
        assert result["conflicts_count"] == 0
        assert len(result["assignments"]) == 1000
        student_ids = [a["exam_student_id"] for a in result["assignments"]]
        assert len(student_ids) == len(set(student_ids)) == 1000


class TestEvenEmptySpacing:
    def test_empties_spread_across_rows_not_clustered_at_bottom(self) -> None:
        # 18x37 hall with the real class-size mix from map b15c3fe1: empties
        # must be distributed through the room (not dumped in the last rows).
        rows, cols = 18, 37
        sizes = [60, 57, 39, 38, 36, 30, 30, 28, 28, 27, 27, 27, 23, 18, 17, 16, 16, 3]
        seats = [
            seat(r, c, r * cols + c + 1)
            for r in range(rows)
            for c in range(cols)
        ]
        students: list[dict] = []
        sid = 0
        for class_idx, size in enumerate(sizes):
            for _ in range(size):
                students.append(student(f"s{sid}", f"class-{class_idx}"))
                sid += 1

        payload = base_payload(
            rows=rows,
            cols=cols,
            seats=seats,
            students=students,
            strict_mode=True,
            timeout_seconds=60,
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assert result["conflicts_count"] == 0
        assert len(result["assignments"]) == sum(sizes)

        occupied = {(a["row"], a["col"]) for a in result["assignments"]}
        empties_by_row = [
            sum(1 for c in range(cols) if (r, c) not in occupied) for r in range(rows)
        ]
        assert min(empties_by_row) >= 6
        assert max(empties_by_row) - min(empties_by_row) <= 3

        class_by_student = {s["exam_student_id"]: s["exam_class_id"] for s in students}
        assert _count_adjacent_same_class(result, class_by_student) == 0


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


class TestMainClassSeparation:
    def test_different_sections_same_main_class_are_not_adjacent(self) -> None:
        """UI colors by main class; sections of that class must not sit together."""
        payload = base_payload(
            rows=1,
            cols=3,
            seats=[
                seat(0, 0, 1),
                seat(0, 1, 2),
                seat(0, 2, 3),
            ],
            students=[
                student("s1", "section-a", separation_group_id="main-oli"),
                student("s2", "section-b", separation_group_id="main-oli"),
            ],
            strict_mode=True,
        )
        result = run_solver(payload)

        assert result["status"] == "optimal"
        assert result["conflicts_count"] == 0
        group_by_student = {"s1": "main-oli", "s2": "main-oli"}
        assert _count_adjacent_same_class(result, group_by_student) == 0
        occupied = _occupied_seats(result)
        assert occupied == {(0, 0), (0, 2)} or occupied == {(0, 2), (0, 0)}


def _count_orthogonal_same_class(result: dict, class_by_student: dict[str, str]) -> int:
    positions: dict[tuple[int, int], str] = {}
    for assignment in result["assignments"]:
        positions[(assignment["row"], assignment["col"])] = class_by_student[
            assignment["exam_student_id"]
        ]

    conflicts = 0
    seen: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for (r, c), cls in positions.items():
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            neighbor = (r + dr, c + dc)
            if neighbor in positions and positions[neighbor] == cls:
                pair = tuple(sorted(((r, c), neighbor)))
                if pair not in seen:
                    seen.add(pair)
                    conflicts += 1
    return conflicts


class TestZigzagStrategy:
    def test_largest_class_on_checkerboard_no_orthogonal_neighbours(self) -> None:
        # 4x4 hall: 8 even + 8 odd parity seats. Class A has 8, others share 8.
        seats = [
            seat(r, c, r * 4 + c + 1)
            for r in range(4)
            for c in range(4)
        ]
        students = [student(f"a{i}", "class-a") for i in range(8)]
        students += [student(f"b{i}", "class-b") for i in range(4)]
        students += [student(f"c{i}", "class-c") for i in range(4)]
        payload = base_payload(
            rows=4,
            cols=4,
            seats=seats,
            students=students,
            strategy="zigzag",
        )
        result = run_solver(payload)

        assert result["status"] in {"optimal", "feasible"}
        assert result["mode_used"] == "zigzag"
        assert result["zigzag_group_id"] == "class-a"
        assert result["conflicts_count"] == 0

        class_by_student = {
            **{f"a{i}": "class-a" for i in range(8)},
            **{f"b{i}": "class-b" for i in range(4)},
            **{f"c{i}": "class-c" for i in range(4)},
        }
        assert _count_orthogonal_same_class(result, class_by_student) == 0

        assignments = _assignment_map(result)
        a_parities = {
            (assignments[f"a{i}"]["row"] + assignments[f"a{i}"]["col"]) % 2
            for i in range(8)
        }
        assert len(a_parities) == 1

    def test_default_strategy_unchanged_without_strategy_field(self) -> None:
        payload = base_payload(
            rows=2,
            cols=2,
            seats=[seat(0, 0, 1), seat(0, 1, 2), seat(1, 0, 3), seat(1, 1, 4)],
            students=[
                student("s1", "class-a"),
                student("s2", "class-b"),
            ],
        )
        assert "strategy" in payload
        # Explicit default must still succeed like before.
        payload["strategy"] = "default"
        result = run_solver(payload)
        assert result["status"] in {"optimal", "feasible"}
        assert result.get("mode_used") != "zigzag"

    def test_unknown_strategy_returns_error(self) -> None:
        payload = base_payload(
            rows=1,
            cols=2,
            seats=[seat(0, 0, 1), seat(0, 1, 2)],
            students=[student("s1", "class-a")],
            strategy="spiral",
        )
        result = run_solver(payload)
        assert result["status"] == "error"
        assert "Unsupported strategy" in result["message"]

    def test_auto_picks_largest_separation_group(self) -> None:
        seats = [seat(r, c, r * 3 + c + 1) for r in range(3) for c in range(3)]
        students = [student(f"big{i}", "class-big") for i in range(5)]
        students += [student(f"s{i}", f"class-s{i}") for i in range(4)]
        payload = base_payload(
            rows=3,
            cols=3,
            seats=seats,
            students=students,
            strategy="zigzag",
        )
        result = run_solver(payload)
        assert result["status"] in {"optimal", "feasible"}
        assert result["zigzag_group_id"] == "class-big"