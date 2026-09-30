<?php

namespace App\Http\Controllers;

use App\Models\ServicePayment;
use App\Services\BillingStatusService;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

/**
 * Pantalla oculta para registrar los pagos mensuales del sistema.
 * Responde 404 a quien no esté en BILLING_ADMIN_EMAILS.
 */
class ServicePaymentController extends Controller
{
    public function index(BillingStatusService $billing)
    {
        $this->authorizeAdmin();

        $payments = ServicePayment::orderByDesc('period')->get()->keyBy('period');
        $start = config('billing.start_month');
        $current = CarbonImmutable::now(config('billing.timezone'))->format('Y-m');

        // Del mes actual hacia atrás hasta start_month, más cualquier mes pagado fuera de ese rango.
        $periods = $start ? array_reverse($billing->periodsBetween($start, $current)) : [];
        $periods = collect($periods)->merge($payments->keys())->unique()->sortDesc()->values();

        return Inertia::render('ServicePayments/Index', [
            'months' => $periods->map(fn ($period) => [
                'period' => $period,
                'due_date' => $billing->dueDate($period),
                'payment' => $payments->get($period),
            ]),
            'config' => [
                'start_month' => $start,
                'due_day' => config('billing.due_day'),
                'current_month' => $current,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'period' => 'required|date_format:Y-m',
            'paid_at' => 'required|date',
            'amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        ServicePayment::updateOrCreate(
            ['period' => $validated['period']],
            $validated
        );

        return redirect()->back()->with('success', 'Pago de '.$validated['period'].' registrado.');
    }

    public function destroy(ServicePayment $servicePayment)
    {
        $this->authorizeAdmin();

        $servicePayment->delete();

        return redirect()->back()->with('success', 'Pago de '.$servicePayment->period.' eliminado.');
    }

    private function authorizeAdmin(): void
    {
        abort_unless(Gate::allows('manage-billing'), 404);
    }
}
