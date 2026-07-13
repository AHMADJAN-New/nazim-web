<?php

return [
    'python_path' => env('EXAM_SEATING_PYTHON_PATH', 'python'),
    'solver_script' => base_path('solver/exam_seating_solver.py'),
    // Base CP-SAT time budget per solve phase (strict and/or fallback). Scales up with student count.
    'timeout_seconds' => (int) env('EXAM_SEATING_TIMEOUT_SECONDS', 300),
    // Hard cap for scaled timeout (CP-SAT max_time_in_seconds).
    'max_timeout_seconds' => (int) env('EXAM_SEATING_MAX_TIMEOUT_SECONDS', 900),
    'algorithm_version' => 'ortools-cp-sat-v1',
];
