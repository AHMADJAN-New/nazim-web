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
STRATEGY_DEFAULT = "default"
STRATEGY_ZIGZAG = "zigzag"
SUPPORTED_STRATEGIES = {STRATEGY_DEFAULT, STRATEGY_ZIGZAG}


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
    # Main class (or other grouping key) used for adjacency separation.
    # Sections of the same main class share this id so they are not seated
    # next to each other. Falls back to exam_class_id when omitted.
    separation_group_id: str = ""

    def __post_init__(self) -> None:
        if not self.separation_group_id:
            object.__setattr__(self, "separation_group_id", self.exam_class_id)


@dataclass
class ParsedInput:
    rows: int
    cols: int
    seats: list[SeatCell]
    students: list[StudentRecord]
    strict_mode: bool
    seed: int
    timeout_seconds: float
    strategy: str = STRATEGY_DEFAULT


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
            exam_class_id = str(item["exam_class_id"])
            separation_raw = item.get("separation_group_id")
            separation_group_id = (
                str(separation_raw).strip()
                if separation_raw is not None and str(separation_raw).strip() != ""
                else exam_class_id
            )
            students.append(
                StudentRecord(
                    exam_student_id=str(item["exam_student_id"]),
                    exam_class_id=exam_class_id,
                    separation_group_id=separation_group_id,
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

    strategy_raw = raw.get("strategy", STRATEGY_DEFAULT)
    if strategy_raw is None or strategy_raw == "":
        strategy = STRATEGY_DEFAULT
    elif not isinstance(strategy_raw, str):
        return _error("Invalid strategy")
    else:
        strategy = strategy_raw.strip().lower()
    if strategy not in SUPPORTED_STRATEGIES:
        return _error(
            f"Unsupported strategy: {strategy_raw}. "
            f"Use one of: {', '.join(sorted(SUPPORTED_STRATEGIES))}"
        )

    return ParsedInput(
        rows=rows,
        cols=cols,
        seats=seats,
        students=students,
        strict_mode=strict_mode,
        seed=seed,
        timeout_seconds=timeout_seconds,
        strategy=strategy,
    )


def _seat_key(seat: SeatCell) -> tuple[int, int]:
    return (seat.row, seat.col)


def _build_adjacency(
    seat_index_by_key: dict[tuple[int, int], int],
    rows: int,
    cols: int,
    *,
    include_diagonals: bool = True,
) -> list[tuple[int, int]]:
    # Default 8-directional: a diagonal neighbour can still see another student's
    # paper, so it counts as adjacent. Zigzag mode uses orthogonal-only (4-dir)
    # because the checkerboard lattice places same-class students on diagonals
    # by design. Scanning only "forward" offsets yields each pair once.
    pairs: set[tuple[int, int]] = set()
    offsets = (
        ((0, 1), (1, -1), (1, 0), (1, 1))
        if include_diagonals
        else ((0, 1), (1, 0))
    )
    for r in range(rows):
        for c in range(cols):
            key = (r, c)
            if key not in seat_index_by_key:
                continue
            i = seat_index_by_key[key]
            for dr, dc in offsets:
                nr, nc = r + dr, c + dc
                neighbor = (nr, nc)
                if neighbor in seat_index_by_key:
                    j = seat_index_by_key[neighbor]
                    pairs.add((i, j) if i < j else (j, i))
    return sorted(pairs)


def _select_evenly_spaced_seats(
    assignable_seats: list[SeatCell],
    needed: int,
    seed: int,
) -> list[SeatCell]:
    """Pick `needed` seats spread evenly across the hall.

    When seats > students, using every seat and leaving leftovers wherever
    CP-SAT finds convenient packs the top densely and dumps empties at the
    bottom. Index-stride selection keeps skips consistent through the room.
    """
    if needed <= 0:
        return []
    if needed >= len(assignable_seats):
        return list(assignable_seats)

    ordered = sorted(
        assignable_seats,
        key=lambda seat: (seat.row, seat.col, seat.seat_number),
    )
    n = len(ordered)
    # Phase from seed so re-solves with different seeds shift the lattice.
    phase = seed % n
    rotated = ordered[phase:] + ordered[:phase]

    selected: list[SeatCell] = []
    used: set[int] = set()
    for i in range(needed):
        # Evenly spaced indices in [0, n).
        idx = int(round(i * (n - 1) / (needed - 1))) if needed > 1 else 0
        if idx in used:
            # Resolve rare rounding collisions by walking forward.
            for delta in range(1, n):
                cand = (idx + delta) % n
                if cand not in used:
                    idx = cand
                    break
        used.add(idx)
        selected.append(rotated[idx])

    return selected


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

    # Leave empties evenly across the hall instead of packing students into a
    # dense block and dumping leftover seats at one end.
    # Zigzag keeps the full seat lattice so the checkerboard pattern is intact.
    if (
        parsed.strategy != STRATEGY_ZIGZAG
        and len(movable_students) < len(assignable_seats)
    ):
        assignable_seats = _select_evenly_spaced_seats(
            assignable_seats,
            len(movable_students),
            parsed.seed,
        )

    seat_index_by_key = {_seat_key(seat): idx for idx, seat in enumerate(parsed.seats)}
    all_seat_indices = list(range(len(parsed.seats)))
    adjacency = _build_adjacency(
        seat_index_by_key,
        parsed.rows,
        parsed.cols,
        include_diagonals=parsed.strategy != STRATEGY_ZIGZAG,
    )

    # Adjacency uses separation_group_id (main class), not exam section id.
    class_by_student = {
        s.exam_student_id: s.separation_group_id for s in parsed.students
    }

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
    num_students = len(movable_students)
    num_seats = len(assignable_seats)

    locked_by_seat: dict[int, str] = {}
    for item in locked_assignments:
        idx = next(
            i
            for i, seat in enumerate(all_seats)
            if seat.row == item["row"] and seat.col == item["col"]
        )
        locked_by_seat[idx] = item["exam_student_id"]

    # Lightweight class-level model. Students within a class are interchangeable
    # for adjacency, so we only decide *which class* (if any) occupies each
    # assignable seat: y[pos, code] == 1  ⇔  seat `pos` holds a student of class
    # `code`. This keeps the model small (seats × classes booleans) and solves
    # 1000+ seat halls to proven-optimal in seconds — the previous per-student
    # add_element / add_all_different formulation timed out above ~250 students.
    model = cp_model.CpModel()

    class_ids = sorted(
        {
            *(student.separation_group_id for student in movable_students),
            *(
                class_by_student[student_id]
                for student_id in locked_by_seat.values()
                if student_id in class_by_student
            ),
        }
    )
    class_to_code = {class_id: index + 1 for index, class_id in enumerate(class_ids)}
    codes = list(class_to_code.values())

    movable_count: dict[int, int] = {}
    for student in movable_students:
        code = class_to_code[student.separation_group_id]
        movable_count[code] = movable_count.get(code, 0) + 1

    y: dict[tuple[int, int], cp_model.IntVar] = {}
    for pos in range(num_seats):
        for code in codes:
            y[(pos, code)] = model.new_bool_var(f"y_{pos}_{code}")
        # Each seat holds at most one class (empty seats allowed when seats > students).
        model.add(sum(y[(pos, code)] for code in codes) <= 1)

    # Each class occupies exactly as many assignable seats as it has movable students.
    for code, count in movable_count.items():
        model.add(sum(y[(pos, code)] for pos in range(num_seats)) == count)

    conflict_vars: list[cp_model.IntVar] = []

    for adj_a, adj_b in adjacency:
        a_assign = adj_a in pos_by_global
        b_assign = adj_b in pos_by_global
        if not a_assign and not b_assign:
            continue

        if a_assign and b_assign:
            pos_a = pos_by_global[adj_a]
            pos_b = pos_by_global[adj_b]
            if strict:
                # Two adjacent seats may not share any class.
                for code in codes:
                    model.add(y[(pos_a, code)] + y[(pos_b, code)] <= 1)
            else:
                conflict = model.new_bool_var(f"conflict_{adj_a}_{adj_b}")
                for code in codes:
                    # conflict is forced to 1 iff both seats hold the same class.
                    model.add(conflict >= y[(pos_a, code)] + y[(pos_b, code)] - 1)
                conflict_vars.append(conflict)
            continue

        # One seat locked, one assignable: keep the assignable seat off the
        # locked neighbour's class.
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
        if strict:
            model.add(y[(assignable_pos, locked_code)] == 0)
        else:
            conflict_vars.append(y[(assignable_pos, locked_code)])

    if not strict and conflict_vars:
        model.minimize(sum(conflict_vars))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout_seconds
    solver.parameters.random_seed = seed
    # Parallel search helps large maps; small maps stay single-worker so output
    # is reproducible for the same seed.
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

    # Recover which class landed in each assignable seat.
    code_at_pos: dict[int, int] = {}
    for pos in range(num_seats):
        for code in codes:
            if solver.value(y[(pos, code)]) == 1:
                code_at_pos[pos] = code
                break

    positions_by_code: dict[int, list[int]] = {}
    for pos, code in code_at_pos.items():
        positions_by_code.setdefault(code, []).append(pos)
    # Stable seat order per class so roll numbers flow naturally across the hall.
    for code in positions_by_code:
        positions_by_code[code].sort(key=lambda pos: assignable_seats[pos].seat_number)

    students_by_code: dict[int, list[StudentRecord]] = {}
    for student in movable_students:
        students_by_code.setdefault(
            class_to_code[student.separation_group_id], []
        ).append(student)

    assignment_by_seat: dict[int, str] = {}
    result_assignments = list(locked_assignments)

    for code, students_in_class in students_by_code.items():
        seats_for_code = positions_by_code.get(code, [])
        for student, pos in zip(students_in_class, seats_for_code):
            seat_global_idx = assignable_indices[pos]
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
        student_id = item["exam_student_id"]
        locked_by_seat[idx] = student_id
        occupied_class[idx] = class_by_student.get(
            student_id, str(item.get("exam_class_id", ""))
        )

    # Round-robin by separation group keeps same main-class students spaced.
    by_class: dict[str, list[StudentRecord]] = {}
    for student in movable_students:
        by_class.setdefault(student.separation_group_id, []).append(student)

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
                if not seat_conflicts(global_idx, student.separation_group_id):
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
        occupied_class[global_idx] = student.separation_group_id

    exam_class_by_student = {
        s.exam_student_id: s.exam_class_id for s in movable_students
    }
    result_assignments = list(locked_assignments)
    for global_idx, student_id in assignment_by_seat.items():
        seat = all_seats[global_idx]
        result_assignments.append(
            {
                "exam_student_id": student_id,
                "exam_class_id": exam_class_by_student[student_id],
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


def _interleave_students_by_class(
    students: list[StudentRecord],
    seed: int,
) -> list[StudentRecord]:
    by_class: dict[str, list[StudentRecord]] = {}
    for student in students:
        by_class.setdefault(student.separation_group_id, []).append(student)

    if not by_class:
        return []

    class_order = sorted(by_class.keys())
    rotate = seed % len(class_order)
    rotated = class_order[rotate:] + class_order[:rotate]
    queues = {cid: list(by_class[cid]) for cid in rotated}
    interleaved: list[StudentRecord] = []
    while any(queues.values()):
        for cid in rotated:
            if queues[cid]:
                interleaved.append(queues[cid].pop(0))
    return interleaved


def _solve_zigzag(
    movable_students: list[StudentRecord],
    assignable_seats: list[SeatCell],
    adjacency: list[tuple[int, int]],
    class_by_student: dict[str, str],
    locked_assignments: list[dict[str, Any]],
    all_seats: list[SeatCell],
    *,
    seed: int,
) -> dict[str, Any]:
    """Full-hall checkerboard zigzag for one dominant class.

    The largest separation group is auto-selected and seated on one color of the
    (row+col)%2 lattice so same-class students are never orthogonal neighbours.
    Remaining students fill the complementary color (then leftover primary seats).
    Conflict counting for this mode uses orthogonal adjacency only.
    """
    seat_index_by_key = {_seat_key(seat): idx for idx, seat in enumerate(all_seats)}
    neighbors = _neighbor_globals(adjacency)

    locked_by_seat: dict[int, str] = {}
    occupied_class: dict[int, str] = {}
    for item in locked_assignments:
        idx = seat_index_by_key[(item["row"], item["col"])]
        student_id = item["exam_student_id"]
        locked_by_seat[idx] = student_id
        occupied_class[idx] = class_by_student.get(
            student_id, str(item.get("exam_class_id", ""))
        )

    if not movable_students:
        conflict_count, conflict_pairs = _find_conflicts(
            {},
            adjacency,
            all_seats,
            class_by_student,
            locked_by_seat,
        )
        status = "optimal" if conflict_count == 0 else "feasible"
        return {
            "contract_version": CONTRACT_VERSION,
            "status": status,
            "strict_mode": False,
            "mode_used": "zigzag",
            "strategy": STRATEGY_ZIGZAG,
            "assignments": locked_assignments,
            "conflict_pairs": conflict_pairs,
            "conflicts_count": conflict_count,
        }

    largest_id, largest_count = _largest_movable_class(movable_students)
    large_students = [
        s for s in movable_students if s.separation_group_id == largest_id
    ]
    other_students = [
        s for s in movable_students if s.separation_group_id != largest_id
    ]

    # Prefer the parity that already hosts locked members of the large group.
    locked_parity_counts = {0: 0, 1: 0}
    for idx, student_id in locked_by_seat.items():
        if class_by_student.get(student_id) != largest_id:
            continue
        seat = all_seats[idx]
        locked_parity_counts[(seat.row + seat.col) % 2] += 1

    even_seats = [s for s in assignable_seats if (s.row + s.col) % 2 == 0]
    odd_seats = [s for s in assignable_seats if (s.row + s.col) % 2 == 1]
    even_seats.sort(key=lambda s: (s.seat_number, s.row, s.col))
    odd_seats.sort(key=lambda s: (s.seat_number, s.row, s.col))

    def parity_score(parity: int, seats_for_parity: list[SeatCell]) -> tuple[int, int, int]:
        fits = 1 if len(seats_for_parity) >= largest_count else 0
        return (fits, locked_parity_counts[parity], len(seats_for_parity))

    scored = [
        (parity_score(0, even_seats), 0, even_seats),
        (parity_score(1, odd_seats), 1, odd_seats),
    ]
    scored.sort(key=lambda item: item[0], reverse=True)
    if scored[0][0] == scored[1][0]:
        # Seed chooses which checkerboard color hosts the largest class.
        prefer = seed % 2
        scored = sorted(scored, key=lambda item: 0 if item[1] == prefer else 1)

    primary_parity = scored[0][1]
    primary_seats = list(scored[0][2])
    secondary_seats = list(scored[1][2])

    assignment_by_seat: dict[int, str] = {}
    used_keys: set[tuple[int, int]] = set()

    def take_seats(pool: list[SeatCell], needed: int) -> list[SeatCell]:
        taken: list[SeatCell] = []
        for seat in pool:
            key = _seat_key(seat)
            if key in used_keys:
                continue
            taken.append(seat)
            used_keys.add(key)
            if len(taken) >= needed:
                break
        return taken

    large_primary = take_seats(primary_seats, len(large_students))
    remaining_large = len(large_students) - len(large_primary)
    large_overflow = take_seats(secondary_seats, remaining_large) if remaining_large else []
    large_seat_list = large_primary + large_overflow

    if len(large_seat_list) < len(large_students):
        return {
            "contract_version": CONTRACT_VERSION,
            "status": "infeasible",
            "strict_mode": False,
            "mode_used": "zigzag",
            "strategy": STRATEGY_ZIGZAG,
            "message": "Not enough usable seats for zigzag placement of the largest class",
            "assignments": locked_assignments,
            "conflict_pairs": [],
            "conflicts_count": 0,
            "zigzag_group_id": largest_id,
            "zigzag_parity": primary_parity,
        }

    for student, seat in zip(large_students, large_seat_list):
        idx = seat_index_by_key[_seat_key(seat)]
        assignment_by_seat[idx] = student.exam_student_id
        occupied_class[idx] = student.separation_group_id

    remaining_secondary = [
        s for s in secondary_seats if _seat_key(s) not in used_keys
    ]
    remaining_primary = [
        s for s in primary_seats if _seat_key(s) not in used_keys
    ]
    other_pool = remaining_secondary + remaining_primary

    interleaved_others = _interleave_students_by_class(other_students, seed)

    def seat_conflicts(global_idx: int, class_id: str) -> bool:
        for neighbor in neighbors.get(global_idx, []):
            if occupied_class.get(neighbor) == class_id:
                return True
        return False

    for student in interleaved_others:
        chosen: SeatCell | None = None
        # Prefer zero orthogonal same-class conflicts among the remaining pool.
        for seat in other_pool:
            key = _seat_key(seat)
            if key in used_keys:
                continue
            idx = seat_index_by_key[key]
            if not seat_conflicts(idx, student.separation_group_id):
                chosen = seat
                break
        if chosen is None:
            for seat in other_pool:
                key = _seat_key(seat)
                if key not in used_keys:
                    chosen = seat
                    break
        if chosen is None:
            return {
                "contract_version": CONTRACT_VERSION,
                "status": "infeasible",
                "strict_mode": False,
                "mode_used": "zigzag",
                "strategy": STRATEGY_ZIGZAG,
                "message": "Not enough usable seats for zigzag placement",
                "assignments": locked_assignments,
                "conflict_pairs": [],
                "conflicts_count": 0,
                "zigzag_group_id": largest_id,
                "zigzag_parity": primary_parity,
            }

        key = _seat_key(chosen)
        used_keys.add(key)
        idx = seat_index_by_key[key]
        assignment_by_seat[idx] = student.exam_student_id
        occupied_class[idx] = student.separation_group_id

    exam_class_by_student = {
        s.exam_student_id: s.exam_class_id for s in movable_students
    }
    result_assignments = list(locked_assignments)
    for global_idx, student_id in assignment_by_seat.items():
        seat = all_seats[global_idx]
        result_assignments.append(
            {
                "exam_student_id": student_id,
                "exam_class_id": exam_class_by_student[student_id],
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

    overflow_used = len(large_overflow) > 0
    status = "optimal" if conflict_count == 0 else "feasible"
    message = None
    if overflow_used:
        message = (
            f"Largest class '{largest_id}' ({largest_count} students) exceeds one "
            f"checkerboard color ({len(primary_seats)} seats); overflow used the "
            f"other color, so some side-by-side same-class seats may remain."
        )
    elif conflict_count > 0:
        message = (
            "Zigzag seating applied; some orthogonal same-class neighbours remain "
            "among smaller classes."
        )

    return {
        "contract_version": CONTRACT_VERSION,
        "status": status,
        "strict_mode": False,
        "mode_used": "zigzag",
        "strategy": STRATEGY_ZIGZAG,
        "assignments": result_assignments,
        "conflict_pairs": conflict_pairs,
        "conflicts_count": conflict_count,
        "message": message,
        "zigzag_group_id": largest_id,
        "zigzag_parity": primary_parity,
        "zigzag_overflow": overflow_used,
    }


def _conflict_free_capacity(assignable_seats: list[SeatCell]) -> int:
    """Max students of a *single* class that can be seated with zero 8-directional
    neighbours: the largest of the four (row%2, col%2) parity groups. Cells that
    share a parity differ by >=2 in a row or column, so each group is an
    independent set of the king-move grid (and for a full grid the largest one is
    the true maximum ≈ a quarter of the seats)."""
    groups: dict[tuple[int, int], int] = {}
    for seat in assignable_seats:
        key = (seat.row % 2, seat.col % 2)
        groups[key] = groups.get(key, 0) + 1
    return max(groups.values()) if groups else 0


def _largest_movable_class(movable_students: list[StudentRecord]) -> tuple[str, int]:
    counts: dict[str, int] = {}
    for student in movable_students:
        counts[student.separation_group_id] = (
            counts.get(student.separation_group_id, 0) + 1
        )
    if not counts:
        return ("", 0)
    return max(counts.items(), key=lambda kv: (kv[1], kv[0]))


def _capacity_message(class_id: str, class_count: int, capacity: int) -> str:
    return (
        f"Class '{class_id}' has {class_count} students, but this seating area can "
        f"hold at most {capacity} of a single class without same-class neighbours "
        f"(diagonals included). Full separation is impossible here - seated with the "
        f"minimum achievable conflicts. Use a larger hall (about {class_count * 4} "
        f"seats) or split this class across rooms."
    )


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

    if parsed.strategy == STRATEGY_ZIGZAG:
        return _solve_zigzag(
            movable_students,
            assignable_seats,
            adjacency,
            class_by_student,
            locked_assignments,
            all_seats,
            seed=parsed.seed,
        )

    # CP-SAT now handles large halls directly (the class-level model solves
    # 1000+ seats in seconds), so every exam flows through the exact solver.
    # The constructive heuristic below is kept only as a last-resort fallback
    # when CP-SAT times out or proves infeasible.
    if parsed.strict_mode:
        # Preflight: under 8-directional adjacency a single class can occupy at
        # most ~a quarter of the hall without neighbours. If the largest class
        # already exceeds that, strict separation is provably impossible — skip
        # the expensive infeasibility proof and go straight to minimisation with
        # an actionable message.
        capacity = _conflict_free_capacity(assignable_seats)
        largest_name, largest_count = _largest_movable_class(movable_students)
        separable = largest_count <= capacity

        if separable:
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

        # Minimise same-class adjacency as the best achievable outcome (either a
        # class is too large to fully separate, or strict could not reach zero).
        # When separation is provably impossible we don't need the full budget to
        # prove optimality of an unavoidably-conflicted layout — cap it so the run
        # stays responsive (CP-SAT with parallel workers captures most of the
        # improvement within the first seconds).
        fallback_timeout = (
            parsed.timeout_seconds if separable else min(parsed.timeout_seconds, 30.0)
        )
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
            timeout_seconds=fallback_timeout,
        )
        if fallback["status"] in {"optimal", "feasible"}:
            fallback["strict_mode"] = True
            fallback["mode_used"] = "fallback"
            if not separable:
                fallback["message"] = _capacity_message(
                    largest_name, largest_count, capacity
                )
            return fallback

        # CP-SAT could not find any complete layout in time: constructive.
        constructive = _constructive_assign(
            movable_students,
            assignable_seats,
            adjacency,
            class_by_student,
            locked_assignments,
            all_seats,
            seed=parsed.seed,
            prefer_zero_conflicts=separable,
        )
        constructive["strict_mode"] = True
        if constructive["status"] == "infeasible":
            return constructive
        constructive["mode_used"] = (
            "constructive"
            if constructive["conflicts_count"] == 0
            else "constructive_fallback"
        )
        if not separable:
            constructive["message"] = _capacity_message(
                largest_name, largest_count, capacity
            )
        elif fallback["status"] == "timeout":
            constructive["message"] = (
                "CP-SAT timed out; used constructive seating assignment"
            )
        return constructive

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
