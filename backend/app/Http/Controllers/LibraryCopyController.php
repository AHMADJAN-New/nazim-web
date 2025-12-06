<?php

namespace App\Http\Controllers;

use App\Models\LibraryBook;
use App\Models\LibraryCopy;
use Illuminate\Http\Request;

class LibraryCopyController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'book_id' => 'required|uuid|exists:library_books,id',
            'copy_code' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);

        $copy = LibraryCopy::create([
            'book_id' => $data['book_id'],
            'copy_code' => $data['copy_code'] ?? null,
            'status' => $data['status'] ?? 'available',
            'acquired_at' => $data['acquired_at'] ?? null,
        ]);

        return response()->json($copy, 201);
    }

    public function update(Request $request, string $id)
    {
        $copy = LibraryCopy::findOrFail($id);
        $data = $request->validate([
            'copy_code' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);
        $copy->update($data);

        return response()->json($copy);
    }

    public function destroy(string $id)
    {
        $copy = LibraryCopy::findOrFail($id);
        $copy->delete();

        return response()->json(['message' => 'Copy removed']);
    }
}
