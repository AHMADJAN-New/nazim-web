<?php

namespace App\Mail;

use App\Models\ReportRun;
use App\Models\User;
use App\Services\Storage\FileStorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ReportEmail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public ReportRun $reportRun,
        public ?User $user = null,
        public ?string $subject = null
    ) {
    }

    public function build(): self
    {
        $subject = $this->subject ?? $this->reportRun->title ?? 'Nazim Report';
        
        $mailable = $this->subject($subject)
            ->view('emails.report')
            ->with([
                'reportRun' => $this->reportRun,
                'user' => $this->user,
                'reportTitle' => $this->reportRun->title ?? 'Report',
                'reportType' => $this->reportRun->report_type,
                'generatedAt' => $this->reportRun->completed_at?->format('Y-m-d H:i:s'),
            ]);

        // Attach the report file if it exists
        if ($this->reportRun->output_path) {
            $fileStorageService = app(FileStorageService::class);
            
            // Determine disk (private for reports)
            $disk = 'private';
            
            // Check if file exists
            if (Storage::disk($disk)->exists($this->reportRun->output_path)) {
                $fileContents = Storage::disk($disk)->get($this->reportRun->output_path);
                $fileName = $this->reportRun->file_name ?? 'report.' . ($this->reportRun->report_type === 'pdf' ? 'pdf' : 'xlsx');
                
                $mailable->attachData(
                    $fileContents,
                    $fileName,
                    [
                        'mime' => $this->reportRun->report_type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    ]
                );
            } else {
                \Log::warning('Report file not found for email attachment', [
                    'report_run_id' => $this->reportRun->id,
                    'output_path' => $this->reportRun->output_path,
                ]);
            }
        }

        return $mailable;
    }
}

