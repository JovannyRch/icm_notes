<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ServicePayment;
use App\Models\User;
use App\Services\BillingStatusService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServicePaymentTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Branch::create(['name' => 'Sucursal A']);
        $this->admin = User::factory()->create(['email' => 'dev@example.com']);
        $this->user = User::factory()->create(['email' => 'cajero@example.com']);

        config([
            'billing.start_month' => '2026-08',
            'billing.due_day' => 7,
            'billing.admin_emails' => ['dev@example.com'],
        ]);
    }

    private function statusOn(string $date): ?array
    {
        return app(BillingStatusService::class)->status(CarbonImmutable::parse($date));
    }

    private function pay(string ...$periods): void
    {
        foreach ($periods as $period) {
            ServicePayment::create(['period' => $period, 'paid_at' => "{$period}-01"]);
        }
    }

    public function test_disabled_without_start_month(): void
    {
        config(['billing.start_month' => null]);

        $this->assertNull($this->statusOn('2026-10-20'));
    }

    public function test_ok_when_every_month_is_paid(): void
    {
        $this->pay('2026-08', '2026-09', '2026-10');

        $this->assertSame('ok', $this->statusOn('2026-10-20')['state']);
    }

    public function test_due_within_grace_days_of_current_month(): void
    {
        $this->pay('2026-08', '2026-09');

        $status = $this->statusOn('2026-10-07');
        $this->assertSame('due', $status['state']);
        $this->assertSame(['2026-10'], $status['pending']);
        $this->assertSame('2026-10-07', $status['due_date']);
    }

    public function test_overdue_after_due_day(): void
    {
        $this->pay('2026-08', '2026-09');

        $this->assertSame('overdue', $this->statusOn('2026-10-08')['state']);
    }

    public function test_overdue_when_a_previous_month_is_unpaid(): void
    {
        $this->pay('2026-08', '2026-10');

        $status = $this->statusOn('2026-10-02');
        $this->assertSame('overdue', $status['state']);
        $this->assertSame(['2026-09'], $status['pending']);
        $this->assertSame('2026-09-07', $status['due_date']);
    }

    public function test_months_before_start_month_are_never_pending(): void
    {
        $this->assertSame(['2026-08'], $this->statusOn('2026-08-03')['pending']);
    }

    public function test_due_day_is_clamped_to_month_length(): void
    {
        config(['billing.due_day' => 31]);

        $this->assertSame('2026-09-30', app(BillingStatusService::class)->dueDate('2026-09'));
    }

    public function test_screen_is_hidden_from_non_admin_users(): void
    {
        $this->actingAs($this->user)->get(route('service-payments.index'))->assertNotFound();
        $this->actingAs($this->user)
            ->post(route('service-payments.store'), ['period' => '2026-10', 'paid_at' => '2026-10-03'])
            ->assertNotFound();

        $this->assertSame(0, ServicePayment::count());
    }

    public function test_admin_registers_updates_and_deletes_a_payment(): void
    {
        $this->actingAs($this->admin)->get(route('service-payments.index'))->assertOk();

        $this->actingAs($this->admin)
            ->post(route('service-payments.store'), ['period' => '2026-10', 'paid_at' => '2026-10-03', 'amount' => 1500])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->admin)
            ->post(route('service-payments.store'), ['period' => '2026-10', 'paid_at' => '2026-10-04', 'notes' => 'Transferencia'])
            ->assertSessionHasNoErrors();

        $payment = ServicePayment::sole();
        $this->assertSame('2026-10-04', $payment->paid_at->toDateString());
        $this->assertSame('Transferencia', $payment->notes);

        $this->actingAs($this->admin)->delete(route('service-payments.destroy', $payment));
        $this->assertSame(0, ServicePayment::count());
    }

    public function test_billing_status_is_shared_with_every_user(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-10-20 12:00', 'America/Mexico_City'));

        $this->actingAs($this->user)
            ->get(route('products'))
            ->assertInertia(fn ($page) => $page
                ->where('billing.state', 'overdue')
                ->where('canManageBilling', false));
    }
}
