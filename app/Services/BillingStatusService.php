<?php

namespace App\Services;

use App\Models\ServicePayment;
use Carbon\CarbonImmutable;

class BillingStatusService
{
    /**
     * Estado del pago mensual, o null si el recordatorio está apagado.
     *
     * - ok:      todos los meses desde start_month están pagados.
     * - due:     solo falta el mes actual y aún no pasa el día límite.
     * - overdue: falta un mes anterior, o el mes actual ya pasó el día límite.
     *
     * @return array{state: string, pending: string[], due_date: ?string}|null
     */
    public function status(?CarbonImmutable $today = null): ?array
    {
        $start = config('billing.start_month');
        if (! $start || ! preg_match('/^\d{4}-\d{2}$/', $start)) {
            return null;
        }

        $today ??= CarbonImmutable::now(config('billing.timezone'));
        $current = $today->format('Y-m');

        $periods = $this->periodsBetween($start, $current);
        if ($periods === []) {
            return null;
        }

        $paid = ServicePayment::whereIn('period', $periods)->pluck('period')->all();
        $pending = array_values(array_diff($periods, $paid));

        if ($pending === []) {
            return ['state' => 'ok', 'pending' => [], 'due_date' => null];
        }

        $dueDate = $this->dueDate($pending[0]);
        $overdue = $pending[0] !== $current || $today->toDateString() > $dueDate;

        return [
            'state' => $overdue ? 'overdue' : 'due',
            'pending' => $pending,
            'due_date' => $dueDate,
        ];
    }

    public function dueDate(string $period): string
    {
        $month = CarbonImmutable::createFromFormat('!Y-m', $period);
        $day = min(max(config('billing.due_day'), 1), $month->daysInMonth);

        return $month->setDay($day)->toDateString();
    }

    /** @return string[] YYYY-MM de $from a $to, ambos incluidos. */
    public function periodsBetween(string $from, string $to): array
    {
        $periods = [];
        $month = CarbonImmutable::createFromFormat('!Y-m', $from);
        $end = CarbonImmutable::createFromFormat('!Y-m', $to);

        while ($month <= $end) {
            $periods[] = $month->format('Y-m');
            $month = $month->addMonth();
        }

        return $periods;
    }
}
