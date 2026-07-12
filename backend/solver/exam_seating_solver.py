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
    if seat_idx in locked_by_seat:
        return locked_by_seat[seat_idx]
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

    locked_by_seat: dict[int, str] = {}
    for item in locked_assignments:
        idx = next(
            i
            for i, seat in enumerate(all_seats)
            if seat.row == item["row"] and seat.col == item["col"]
        )
        locked_by_seat[idx] = item["exam_student_id"]

    model = cp_model.CpModel()
    num_students = len(movable_students)
    num_seats = len(assignable_seats)

    x: dict[tuple[int, int], cp_model.IntVar] = {}
    for s_idx in range(num_students):
        for seat_pos in range(num_seats):
            x[(s_idx, seat_pos)] = model.new_bool_var(f"x_{s_idx}_{seat_pos}")

    for s_idx in range(num_students):
        model.add_exactly_one(x[(s_idx, seat_pos)] for seat_pos in range(num_seats))

    for seat_pos in range(num_seats):
        model.add_at_most_one(x[(s_idx, seat_pos)] for s_idx in range(num_students))

    # Adjacency constraints involving assignable seats.
    for adj_a, adj_b in adjacency:
        class_a_locked = locked_by_seat.get(adj_a)
        class_b_locked = locked_by_seat.get(adj_b)

        assignable_a = adj_a in assignable_indices
        assignable_b = adj_b in assignable_indices

        if not assignable_a and not assignable_b:
            continue

        pos_a = assignable_indices.index(adj_a) if assignable_a else None
        pos_b = assignable_indices.index(adj_b) if assignable_b else None

        for s_idx, student in enumerate(movable_students):
            student_class = student.exam_class_id

            if strict:
                if assignable_a and class_b_locked == student_class:
                    model.add(x[(s_idx, pos_a)] == 0)

                if assignable_b and class_a_locked == student_class:
                    model.add(x[(s_idx, pos_b)] == 0)

                if assignable_a and assignable_b:
                    for other_idx, other in enumerate(movable_students):
                        if other_idx == s_idx:
                            continue
                        if other.exam_class_id != student_class:
                            continue
                        model.add(x[(s_idx, pos_a)] + x[(other_idx, pos_b)] <= 1)
                        model.add(x[(s_idx, pos_b)] + x[(other_idx, pos_a)] <= 1)

    conflict_vars: list[cp_model.IntVar] = []
    if not strict:
        for adj_a, adj_b in adjacency:
            conflict = model.new_bool_var(f"conflict_{adj_a}_{adj_b}")
            conflict_vars.append(conflict)

            terms_same_class: list[cp_model.IntVar] = []

            class_a_locked = locked_by_seat.get(adj_a)
            class_b_locked = locked_by_seat.get(adj_b)

            if class_a_locked is not None and class_b_locked is not None:
                if class_a_locked == class_b_locked:
                    model.add(conflict == 1)
                else:
                    model.add(conflict == 0)
                continue

            assignable_a = adj_a in assignable_indices
            assignable_b = adj_b in assignable_indices
            pos_a = assignable_indices.index(adj_a) if assignable_a else None
            pos_b = assignable_indices.index(adj_b) if assignable_b else None

            if assignable_a and class_b_locked is not None:
                locked_class = class_by_student[class_b_locked]
                for s_idx, student in enumerate(movable_students):
                    if student.exam_class_id == locked_class:
                        terms_same_class.append(x[(s_idx, pos_a)])

            if assignable_b and class_a_locked is not None:
                locked_class = class_by_student[class_a_locked]
                for s_idx, student in enumerate(movable_students):
                    if student.exam_class_id == locked_class:
                        terms_same_class.append(x[(s_idx, pos_b)])

            if assignable_a and assignable_b:
                for s_idx, student in enumerate(movable_students):
                    for other_idx, other in enumerate(movable_students):
                        if student.exam_class_id != other.exam_class_id:
                            continue
                        both = model.new_bool_var(
                            f"pair_{adj_a}_{adj_b}_{s_idx}_{other_idx}"
                        )
                        model.add(both <= x[(s_idx, pos_a)])
                        model.add(both <= x[(other_idx, pos_b)])
                        model.add(
                            both >= x[(s_idx, pos_a)] + x[(other_idx, pos_b)] - 1
                        )
                        terms_same_class.append(both)

            if terms_same_class:
                model.add(sum(terms_same_class) >= 1).only_enforce_if(conflict)
                model.add(sum(terms_same_class) == 0).only_enforce_if(conflict.negated())
            else:
                model.add(conflict == 0)

        model.minimize(sum(conflict_vars))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.random_seed = seed
    solver.parameters.num_search_workers = 1

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
        for seat_pos, seat_global_idx in enumerate(assignable_indices):
            if solver.boolean_value(x[(s_idx, seat_pos)]):
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
                break

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

        if strict_result["status"] == "timeout":
            return strict_result

        if strict_result["status"] == "infeasible":
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
            if fallback["status"] == "infeasible":
                fallback["status"] = "feasible"
                fallback["message"] = strict_result.get(
                    "message", "Strict separation infeasible; fallback could not assign all students"
                )
            return fallback

        if strict_result["conflicts_count"] == 0:
            strict_result["mode_used"] = "strict"
            return strict_result

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
        if fallback["status"] == "infeasible":
            fallback["status"] = "feasible"
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
