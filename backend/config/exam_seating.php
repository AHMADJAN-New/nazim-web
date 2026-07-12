<?php

return [
    'python_path' => env('EXAM_SEATING_PYTHON_PATH', 'python'),
    'solver_script' => base_path('solver/exam_seating_solver.py'),
    'timeout_seconds' => (int) env('EXAM_SEATING_TIMEOUT_SECONDS', 120),
    'algorithm_version' => 'ortools-cp-sat-v1',
];
