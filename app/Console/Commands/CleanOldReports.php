<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanOldReports extends Command
{
    protected $signature = 'clean:old-reports';
    protected $description = 'Elimina archivos temporales de Excel viejos (mayores a 15 minutos)';

    public function handle(): int
    {
        $files = Storage::disk('public')->files('temp_reports');

        foreach ($files as $file) {
            $path = Storage::disk('public')->path($file);
            $lastModified = filemtime($path);

            if (now()->diffInMinutes(\Carbon\Carbon::createFromTimestamp($lastModified)) > 15) {
                Storage::disk('public')->delete($file);
                $this->line("Archivo eliminado: {$file}");
            }
        }

        return self::SUCCESS;
    }
}
