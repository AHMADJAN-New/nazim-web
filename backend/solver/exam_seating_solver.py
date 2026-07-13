#!/usr/bin/env python3
"""Deterministic exam seating solver using OR-Tools CP-SAT.

Reads a versioned JSON contract from stdin and writes JSON to stdout.
Designed for invocation by Laravel Process (no database access).
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from typing import Any

from ortools.sat.python import cp_model

CONTRACT_VERSION = "1.0"
SUPPORTED_VERSIONS = {CONTRACT_VERSION}


@dataclass(frozen=True)
class SeatCell:
    row: int
    col: int
    seat_number: int
    is_disabled: bool
    locked: bool
    exam_student_id: str | None


@dataclass(frozen=True)
class StudentRecord:
    exam_student_id: str
    exam_class_id: str


@dataclass
class ParsedInput:
    rows: int
    cols: int
    seats: list[SeatCell]
    students: list[StudentRecord]
    strict_mode: bool
    seed: int
    timeout_seconds: float


def _error(message: str) -> dict[str, Any]:
    return {
        "contract_version": CONTRACT_VERSION,
        "status": "error",
        "message": message,
        "assignments": [],
        "conflict_pairs": [],
        "conflicts_count": 0,
    }


def _parse_input(raw: dict[str, Any]) -> ParsedInput | dict[str, Any]:
    version = raw.get("contract_version")
    if version is None:
        return _error("Missing contract_version")
    if version not in SUPPORTED_VERSIONS:
        return _error(f"Unsupported contract_version: {version}")

    try:
        map_info = raw["map"]
        rows = int(map_info["rows"])
        cols = int(map_info["cols"])
        if rows < 1 or cols < 1:
            return _error("map.rows and map.cols must be positive integers")
    except (KeyError, TypeError, ValueError):
        return _error("Invalid map dimensions")

    seats: list[SeatCell] = []
    try:
        for item in raw["seats"]:
            seats.append(
                SeatCell(
                    row=int(item["row"]),
                    col=int(item["col"]),
                    seat_number=int(item["seat_number"]),
                    is_disabled=bool(item.get("is_disabled", False)),
                    locked=bool(item.get("locked", False)),
                    exam_student_id=item.get("exam_student_id"),
                )
            )
    except (KeyError, TypeError, ValueError):
        return _error("Invalid seats payload")

    students: list[StudentRecord] = []
    try:
        for item in raw["students"]:
            students.append(
                StudentRecord(
                    exam_student_id=str(item["exam_student_id"]),
                    exam_class_id=str(item["exam_class_id"]),
                )
            )
    except (KeyError, TypeError, ValueError):
        return _error("Invalid students payload")

    try:
        strict_mode = bool(raw["strict_mode"])
        seed = int(raw["seed"])
        timeout_seconds = float(raw["timeout_seconds"])
        if timeout_seconds <= 0:
            return _error("timeout_seconds must be positive")
    except (KeyError, TypeError, ValueError):
        return _error("Invalid solver options")

    return ParsedInput(
        rows=rows,
        cols=cols,
        seats=seats,
        students=students,
        strict_mode=strict_mode,
        seed=seed,
        timeout_seconds=timeout_seconds,
    )


def _seat_key(seat: SeatCell) -> tuple[int, int]:
    return (seat.row, seat.col)


def _build_adjacency(
    seat_index_by_key: dict[tuple[int, int], int],
    rows: int,
    cols: int,
) -> list[tuple[int, int]]:
    pairs: list[tuple[int, int]] = []
    for r in range(rows):
        for c in range(cols):
            key = (r, c)
            if key not in seat_index_by_key:
                continue
            i = seat_index_by_key[key]
            for dr, dc in ((1, 0), (0, 1)):
                nr, nc = r + dr, c + dc
                neighbor = (nr, nc)
                if neighbor in seat_index_by_key:
                    j = seat_index_by_key[neighbor]
                    if i < j:
                        pairs.append((i, j))
    return pairs


def _prepare_problem(parsed: ParsedInput) -> dict[str, Any] | tuple[
    list[StudentRecord],
    list[SeatCell],
    list[tuple[int, int]],
    dict[str, str],
    list[dict[str, Any]],
]:
    """Validate seat/student data and derive movable assignment problem."""
    student_by_id = {s.exam_student_id: s for s in parsed.students}
    if len(student_by_id) != len(parsed.students):
        return _error("Duplicate exam_student_id in students list")

    seat_by_key: dict[tuple[int, int], SeatCell] = {}
    for seat in parsed.seats:
        key = _seat_key(seat)
        if key in seat_by_key:
            return _error(f"Duplicate seat coordinates: row={seat.row}, col={seat.col}")
        if not (0 <= seat.row < parsed.rows and 0 <= seat.col < parsed.cols):
            return _error(
                f"Seat out of bounds: row={seat.row}, col={seat.col}"
            )
        seat_by_key[key] = seat

    locked_assignments: list[dict[str, Any]] = []
    locked_student_ids: set[str] = set()

    for seat in parsed.seats:
        if seat.is_disabled and seat.locked:
            return _error("Seat cannot be both disabled and locked")
        if seat.exam_student_id and seat.is_disabled:
            return _error("Disabled seat cannot reference exam_student_id")
        if seat.locked and seat.exam_student_id is None:
            # Locked empty seat — unavailable for assignment.
            continue
        if seat.exam_student_id:
            if seat.exam_student_id not in student_by_id:
                return _error(
                    f"Seat references unknown exam_student_id: {seat.exam_student_id}"
                )
            if seat.exam_student_id in locked_student_ids:
                return _error(
                    f"Duplicate locked exam_student_id: {seat.exam_student_id}"
                )
            locked_student_ids.add(seat.exam_student_id)
            student = student_by_id[seat.exam_student_id]
            locked_assignments.append(
                {
                    "exam_student_id": student.exam_student_id,
                    "exam_class_id": student.exam_class_id,
                    "row": seat.row,
                    "col": seat.col,
                    "seat_number": seat.seat_number,
                }
            )
            if not seat.locked:
                return _error(
                    "Seat with exam_student_id must set locked=true"
                )

    movable_students = [
        s for s in parsed.students if s.exam_student_id not in locked_student_ids
    ]

    assignable_seats: list[SeatCell] = []
    for seat in parsed.seats:
        if seat.is_disabled:
            continue
        if seat.locked:
            continue
        assignable_seats.append(seat)

    if len(movable_students) > len(assignable_seats):
        return {
            "contract_version": CONTRACT_VERSION,
            "status": "infeasible",
            "strict_mode": parsed.strict_mode,
            "mode_used": "none",
            "message": "Not enough usable seats for all students",
            "assignments": [],
            "conflict_pairs": [],
            "conflicts_count": 0,
        }

    seat_index_by_key = {_seat_key(seat): idx for idx, seat in enumerate(parsed.seats)}
    all_seat_indices = list(range(len(parsed.seats)))
    adjacency = _build_adjacency(seat_index_by_key, parsed.rows, parsed.cols)

    class_by_student = {s.exam_student_id: s.exam_class_id for s in parsed.students}

    return (
        movable_students,
        assignable_seats,
        adjacency,
        class_by_student,
        locked_assignments,
        all_seat_indices,
        parsed.seats,
    )


def _class_at_seat_index(
    seat_idx: int,
    assignment_by_seat: dict[int, str],
    class_by_student: dict[str, str],
    locked_by_seat: dict[int, str],
) -> str | None:
    # locked_by_seat maps seat index -> exam_student_id
    if seat_idx in locked_by_seat:
        return class_by_student.get(locked_by_seat[seat_idx])
    student_id = assignment_by_seat.get(seat_idx)
    if student_id is None:
        return None
    return class_by_student[student_id]


def _find_conflicts(
    assignment_by_seat: dict[int, str],
    adjacency: list[tuple[int, int]],
    all_seats: list[SeatCell],
    class_by_student: dict[str, str],
    locked_by_seat: dict[int, str],
) -> tuple[int, list[dict[str, Any]]]:
    conflicts: list[dict[str, Any]] = []
    for i, j in adjacency:
        class_i = _class_at_seat_index(i, assignment_by_seat, class_by_student, locked_by_seat)
        class_j = _class_at_seat_index(j, assignment_by_seat, class_by_student, locked_by_seat)
        if class_i is None or class_j is None:
            continue
        if class_i == class_j:
            seat_a = all_seats[i]
            seat_b = all_seats[j]
            conflicts.append(
                {
                    "exam_class_id": class_i,
                    "seat_a": {
                        "row": seat_a.row,
                        "col": seat_a.col,
                        "seat_number": seat_a.seat_number,
                    },
                    "seat_b": {
                        "row": seat_b.row,
                        "col": seat_b.col,
                        "seat_number": seat_b.seat_number,
                    },
                }
            )
    return len(conflicts), conflicts


def _solve_assignment(
    movable_students: list[StudentRecord],
    assignable_seats: list[SeatCell],
    adjacency: list[tuple[int, int]],
    class_by_student: dict[str, str],
    locked_assignments: list[dict[str, Any]],
    all_seats: list[SeatCell],
    all_seat_indices: list[int],
    *,
    strict: bool,
    seed: int,
    timeout_seconds: float,
) -> dict[str, Any]:
    if not movable_students:
        locked_by_seat = {
            next(
                idx
                for idx, seat in enumerate(all_seats)
                if seat.row == item["row"] and seat.col == item["col"]
            ): item["exam_student_id"]
            for item in locked_assignments
        }
        conflict_count, conflict_pairs = _find_conflicts(
            {},
            adjacency,
            all_seats,
            class_by_student,
            locked_by_seat,
        )
        status = "optimal" if conflict_count == 0 else "feasible"
        mode = "strict" if strict and conflict_count == 0 else "fallback"
        if strict and conflict_count > 0:
            return {
                "contract_version": CONTRACT_VERSION,
                "status": "infeasible",
                "strict_mode": True,
                "mode_used": "strict",
                "message": "Locked placements create class adjacency conflicts",
                "assignments": locked_assignments,
                "conflict_pairs": conflict_pairs,
                "conflicts_count": conflict_count,
            }
        return {
            "contract_version": CONTRACT_VERSION,
            "status": status,
            "strict_mode": strict,
            "mode_used": mode,
            "assignments": locked_assignments,
            "conflict_pairs": conflict_pairs,
            "conflicts_count": conflict_count,
        }

    seat_index_by_key = {_seat_key(seat): idx for idx, seat in enumerate(all_seats)}
    assignable_indices = [seat_index_by_key[_seat_key(seat)] for seat in assignable_seats]
    pos_by_global = {global_idx: pos for pos, global_idx in enumerate(assignable_indices)}

    locked_by_seat: dict[int, str] = {}
    for item in locked_assignments:
        idx = next(
            i
            for i, seat in enumerate(all_seats)
            if seat.row == item["row"] and seat.col == item["col"]
        )
        locked_by_seat[idx] = item["exam_student_id"]

    # IntVar formulation scales to ~1000 students.
    # Old bool matrix x[student][seat] + O(n^2) adjacency pairs timed out for large exams.
    model = cp_model.CpModel()
    num_students = len(movable_students)
    num_seats = len(assignable_seats)

    class_ids = sorted(
        {
            *(student.exam_class_id for student in movable_students),
            *(
                class_by_student[student_id]
                for student_id in locked_by_seat.values()
                if student_id in class_by_student
            ),
        }
    )
    class_to_code = {class_id: index + 1 for index, class_id in enumerate(class_ids)}
    num_classes = len(class_to_code)

    # class_at[pos] = 0 (empty) or class code of occupant
    class_at = [
        model.new_int_var(0, num_classes, f"class_at_{pos}") for pos in range(num_seats)
    ]

    # seat_of[student] + dummy empties cover every assignable seat exactly once
    seat_of: list[cp_model.IntVar] = []
    for s_idx, student in enumerate(movable_students):
        seat_var = model.new_int_var(0, num_seats - 1, f"seat_of_{s_idx}")
        seat_of.append(seat_var)
        model.add_element(seat_var, class_at, class_to_code[student.exam_class_id])

    all_cover_vars = list(seat_of)
    for dummy_idx in range(num_seats - num_students):
        empty_var = model.new_int_var(0, num_seats - 1, f"empty_seat_{dummy_idx}")
        all_cover_vars.append(empty_var)
        model.add_element(empty_var, class_at, 0)

    model.add_all_different(all_cover_vars)

    conflict_vars: list[cp_model.IntVar] = []

    def _add_same_class_edge(pos_a: int, pos_b: int, edge_key: str) -> cp_model.IntVar:
        a_empty = model.new_bool_var(f"a_empty_{edge_key}")
        b_empty = model.new_bool_var(f"b_empty_{edge_key}")
        different = model.new_bool_var(f"diff_{edge_key}")
        conflict = model.new_bool_var(f"conflict_{edge_key}")

        model.add(class_at[pos_a] == 0).only_enforce_if(a_empty)
        model.add(class_at[pos_a] != 0).only_enforce_if(a_empty.negated())
        model.add(class_at[pos_b] == 0).only_enforce_if(b_empty)
        model.add(class_at[pos_b] != 0).only_enforce_if(b_empty.negated())
        model.add(class_at[pos_a] != class_at[pos_b]).only_enforce_if(different)
        model.add(class_at[pos_a] == class_at[pos_b]).only_enforce_if(different.negated())

        # conflict <=> both occupied and same class
        model.add_bool_and(
            [a_empty.negated(), b_empty.negated(), different.negated()]
        ).only_enforce_if(conflict)
        model.add_bool_or([a_empty, b_empty, different]).only_enforce_if(
            conflict.negated()
        )
        return conflict

    for adj_a, adj_b in adjacency:
        a_assign = adj_a in pos_by_global
        b_assign = adj_b in pos_by_global
        if not a_assign and not b_assign:
            continue

        if a_assign and b_assign:
            pos_a = pos_by_global[adj_a]
            pos_b = pos_by_global[adj_b]
            conflict = _add_same_class_edge(pos_a, pos_b, f"{adj_a}_{adj_b}")
            if strict:
                model.add(conflict == 0)
            else:
                conflict_vars.append(conflict)
            continue

        # One seat locked, one assignable: forbid matching the locked class.
        if a_assign:
            locked_student_id = locked_by_seat.get(adj_b)
            assignable_pos = pos_by_global[adj_a]
        else:
            locked_student_id = locked_by_seat.get(adj_a)
            assignable_pos = pos_by_global[adj_b]

        if locked_student_id is None:
            continue
        locked_class_id = class_by_student.get(locked_student_id)
        if locked_class_id is None or locked_class_id not in class_to_code:
            continue
        locked_code = class_to_code[locked_class_id]
        match_locked = model.new_bool_var(f"match_locked_{adj_a}_{adj_b}")
        model.add(class_at[assignable_pos] == locked_code).only_enforce_if(match_locked)
        model.add(class_at[assignable_pos] != locked_code).only_enforce_if(
            match_locked.negated()
        )
        if strict:
            model.add(match_locked == 0)
        else:
            conflict_vars.append(match_locked)

    if not strict and conflict_vars:
        model.minimize(sum(conflict_vars))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.random_seed = seed
    # Parallel search helps large maps; keep deterministic-ish via random_seed.
    solver.parameters.num_search_workers = 8 if num_students >= 200 else 1

    status_code = solver.solve(model)

    if status_code == cp_model.INFEASIBLE:
        return {
            "contract_version": CONTRACT_VERSION,
            "status": "infeasible",
            "strict_mode": strict,
            "mode_used": "strict" if strict else "fallback",
            "message": "No assignment satisfies constraints",
            "assignments": locked_assignments,
            "conflict_pairs": [],
            "conflicts_count": 0,
        }

    if status_code == cp_model.UNKNOWN:
        return {
            "contract_version": CONTRACT_VERSION,
            "status": "timeout",
            "strict_mode": strict,
            "mode_used": "strict" if strict else "fallback",
            "message": "Solver timed out before finding a complete assignment",
            "assignments": locked_assignments,
            "conflict_pairs": [],
            "conflicts_count": 0,
        }

    cp_status = "optimal" if status_code == cp_model.OPTIMAL else "feasible"

    assignment_by_seat: dict[int, str] = {}
    result_assignments = list(locked_assignments)

    for s_idx, student in enumerate(movable_students):
        seat_pos = int(solver.value(seat_of[s_idx]))
        seat_global_idx = assignable_indices[seat_pos]
        seat = all_seats[seat_global_idx]
        assignment_by_seat[seat_global_idx] = student.exam_student_id
        result_assignments.append(
            {
                "exam_student_id": student.exam_student_id,
                "exam_class_id": student.exam_class_id,
                "row": seat.row,
                "col": seat.col,
                "seat_number": seat.seat_number,
            }
        )

    conflict_count, conflict_pairs = _find_conflicts(
        assignment_by_seat,
        adjacency,
        all_seats,
        class_by_student,
        locked_by_seat,
    )

    return {
        "contract_version": CONTRACT_VERSION,
        "status": cp_status,
        "strict_mode": strict,
        "mode_used": "strict" if strict else "fallback",
        "assignments": result_assignments,
        "conflict_pairs": conflict_pairs,
        "conflicts_count": conflict_count,
    }


def _neighbor_globals(
    adjacency: list[tuple[int, int]],
) -> dict[int, list[int]]:
    neighbors: dict[int, list[int]] = {}
    for a, b in adjacency:
        neighbors.setdefault(a, []).append(b)
        neighbors.setdefault(b, []).append(a)
    return neighbors


def _constructive_assign(
    movable_students: list[StudentRecord],
    assignable_seats: list[SeatCell],
    adjacency: list[tuple[int, int]],
    class_by_student: dict[str, str],
    locked_assignments: list[dict[str, Any]],
    all_seats: list[SeatCell],
    *,
    seed: int,
    prefer_zero_conflicts: bool,
) -> dict[str, Any]:
    """Fast deterministic seating for large exams (seconds, not minutes)."""
    seat_index_by_key = {_seat_key(seat): idx for idx, seat in enumerate(all_seats)}
    assignable_indices = [seat_index_by_key[_seat_key(seat)] for seat in assignable_seats]
    neighbors = _neighbor_globals(adjacency)

    locked_by_seat: dict[int, str] = {}
    occupied_class: dict[int, str] = {}
    for item in locked_assignments:
        idx = seat_index_by_key[(item["row"], item["col"])]
        locked_by_seat[idx] = item["exam_student_id"]
        occupied_class[idx] = item["exam_class_id"]

    # Round-robin by class keeps same-class students spaced when prefer_zero_conflicts.
    by_class: dict[str, list[StudentRecord]] = {}
    for student in movable_students:
        by_class.setdefault(student.exam_class_id, []).append(student)

    class_order = sorted(by_class.keys())
    # Stable shuffle of class order from seed for variety without randomness drift.
    rotated = class_order[seed % len(class_order) :] + class_order[: seed % len(class_order)]
    interleaved: list[StudentRecord] = []
    queues = {cid: list(by_class[cid]) for cid in rotated}
    while any(queues.values()):
        for cid in rotated:
            if queues[cid]:
                interleaved.append(queues[cid].pop(0))

    # Prefer checkerboard-like seat order (odd then even seat numbers).
    ordered_positions = sorted(
        range(len(assignable_indices)),
        key=lambda pos: (
            assignable_seats[pos].seat_number % 2,
            assignable_seats[pos].row,
            assignable_seats[pos].col,
            assignable_seats[pos].seat_number,
        ),
    )

    assignment_by_seat: dict[int, str] = {}
    used_positions: set[int] = set()

    def seat_conflicts(global_idx: int, class_id: str) -> bool:
        for neighbor in neighbors.get(global_idx, []):
            if occupied_class.get(neighbor) == class_id:
                return True
        return False

    for student in interleaved:
        chosen_pos: int | None = None
        if prefer_zero_conflicts:
            for pos in ordered_positions:
                if pos in used_positions:
                    continue
                global_idx = assignable_indices[pos]
                if not seat_conflicts(global_idx, student.exam_class_id):
                    chosen_pos = pos
                    break
        if chosen_pos is None:
            for pos in ordered_positions:
                if pos not in used_positions:
                    chosen_pos = pos
                    break
        if chosen_pos is None:
            return {
                "contract_version": CONTRACT_VERSION,
                "status": "infeasible",
                "strict_mode": prefer_zero_conflicts,
                "mode_used": "constructive",
                "message": "Not enough usable seats for all students",
                "assignments": locked_assignments,
                "conflict_pairs": [],
                "conflicts_count": 0,
            }

        global_idx = assignable_indices[chosen_pos]
        used_positions.add(chosen_pos)
        assignment_by_seat[global_idx] = student.exam_student_id
        occupied_class[global_idx] = student.exam_class_id

    result_assignments = list(locked_assignments)
    for global_idx, student_id in assignment_by_seat.items():
        seat = all_seats[global_idx]
        result_assignments.append(
            {
                "exam_student_id": student_id,
                "exam_class_id": class_by_student[student_id],
                "row": seat.row,
                "col": seat.col,
                "seat_number": seat.seat_number,
            }
        )

    conflict_count, conflict_pairs = _find_conflicts(
        assignment_by_seat,
        adjacency,
        all_seats,
        class_by_student,
        locked_by_seat,
    )

    status = "optimal" if conflict_count == 0 else "feasible"
    return {
        "contract_version": CONTRACT_VERSION,
        "status": status,
        "strict_mode": prefer_zero_conflicts,
        "mode_used": "constructive" if conflict_count == 0 else "constructive_fallback",
        "assignments": result_assignments,
        "conflict_pairs": conflict_pairs,
        "conflicts_count": conflict_count,
        "message": None
        if conflict_count == 0
        else "Assigned with minimized adjacent same-class conflicts using constructive placement",
    }


def solve(raw: dict[str, Any]) -> dict[str, Any]:
    parsed = _parse_input(raw)
    if isinstance(parsed, dict):
        return parsed

    prepared = _prepare_problem(parsed)
    if isinstance(prepared, dict):
        return prepared

    (
        movable_students,
        assignable_seats,
        adjacency,
        class_by_student,
        locked_assignments,
        all_seat_indices,
        all_seats,
    ) = prepared

    # Large exams: constructive placement finishes in seconds.
    # Full CP-SAT adjacency models can exceed process timeouts above ~250 students.
    large_exam = len(movable_students) >= 250

    if large_exam:
        constructive = _constructive_assign(
            movable_students,
            assignable_seats,
            adjacency,
            class_by_student,
            locked_assignments,
            all_seats,
            seed=parsed.seed,
            prefer_zero_conflicts=True,
        )
        constructive["strict_mode"] = parsed.strict_mode
        if constructive["status"] == "infeasible":
            return constructive
        if constructive["conflicts_count"] == 0:
            constructive["mode_used"] = "constructive"
            constructive["status"] = "optimal"
        else:
            constructive["mode_used"] = "constructive_fallback"
            constructive["status"] = "feasible"
            constructive["message"] = (
                constructive.get("message")
                or "Assigned with some adjacent same-class seats (large-exam constructive mode)"
            )
        return constructive

    if parsed.strict_mode:
        strict_result = _solve_assignment(
            movable_students,
            assignable_seats,
            adjacency,
            class_by_student,
            locked_assignments,
            all_seats,
            all_seat_indices,
            strict=True,
            seed=parsed.seed,
            timeout_seconds=parsed.timeout_seconds,
        )

        if strict_result["status"] in {"optimal", "feasible"} and strict_result[
            "conflicts_count"
        ] == 0:
            strict_result["mode_used"] = "strict"
            return strict_result

        if strict_result["status"] in {"infeasible", "timeout"}:
            fallback = _solve_assignment(
                movable_students,
                assignable_seats,
                adjacency,
                class_by_student,
                locked_assignments,
                all_seats,
                all_seat_indices,
                strict=False,
                seed=parsed.seed,
                timeout_seconds=parsed.timeout_seconds,
            )
            if fallback["status"] in {"optimal", "feasible"}:
                fallback["strict_mode"] = True
                fallback["mode_used"] = "fallback"
                return fallback

            constructive = _constructive_assign(
                movable_students,
                assignable_seats,
                adjacency,
                class_by_student,
                locked_assignments,
                all_seats,
                seed=parsed.seed,
                prefer_zero_conflicts=True,
            )
            constructive["strict_mode"] = True
            if constructive["status"] == "infeasible":
                return constructive
            constructive["mode_used"] = (
                "constructive"
                if constructive["conflicts_count"] == 0
                else "constructive_fallback"
            )
            if strict_result["status"] == "timeout":
                constructive["message"] = (
                    "CP-SAT timed out; used constructive seating assignment"
                )
            return constructive

        fallback = _solve_assignment(
            movable_students,
            assignable_seats,
            adjacency,
            class_by_student,
            locked_assignments,
            all_seats,
            all_seat_indices,
            strict=False,
            seed=parsed.seed,
            timeout_seconds=parsed.timeout_seconds,
        )
        fallback["strict_mode"] = True
        fallback["mode_used"] = "fallback"
        if fallback["status"] in {"timeout", "infeasible", "error"}:
            constructive = _constructive_assign(
                movable_students,
                assignable_seats,
                adjacency,
                class_by_student,
                locked_assignments,
                all_seats,
                seed=parsed.seed,
                prefer_zero_conflicts=False,
            )
            constructive["strict_mode"] = True
            constructive["mode_used"] = "constructive_fallback"
            return constructive
        return fallback

    return _solve_assignment(
        movable_students,
        assignable_seats,
        adjacency,
        class_by_student,
        locked_assignments,
        all_seats,
        all_seat_indices,
        strict=False,
        seed=parsed.seed,
        timeout_seconds=parsed.timeout_seconds,
    )


def main() -> None:
    try:
        raw = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        result = _error(f"Invalid JSON input: {exc}")
    else:
        result = solve(raw)

    json.dump(result, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
