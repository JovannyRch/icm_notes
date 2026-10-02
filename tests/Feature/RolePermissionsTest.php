<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Roles super_admin / owner / cashier, permisos por cajero y sucursales asignadas. */
class RolePermissionsTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        config(['billing.start_month' => now()->subMonths(2)->format('Y-m')]); // hay aviso de pago
    }

    private function user(string $role, array $permissions = [], array $branches = []): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync($branches);

        return $user;
    }

    private function cashier(array $permissions = []): User
    {
        return $this->user(User::CASHIER, $permissions, [$this->a->id]);
    }

    /** Páginas del negocio: el owner entra, el cajero no. */
    private const BUSINESS_PAGES = ['/notas', '/nota/crear', '/productos', '/productos/crear', '/cortes', '/cortes/crear',
        '/corte_semanales/crear', '/nota-entrada/crear', '/dashboard/exportar', '/export-products'];

    public function test_owner_keeps_all_current_functionality_but_not_system_admin(): void
    {
        $owner = $this->user(User::OWNER);
        foreach (self::BUSINESS_PAGES as $uri) {
            $this->actingAs($owner)->get($uri)->assertSuccessful();
        }
        $this->actingAs($owner)->get('/dashboard')->assertOk();
        $this->actingAs($owner)->get('/admin/pagos-servicio')->assertNotFound();
    }

    public function test_super_admin_can_do_everything(): void
    {
        $admin = $this->user(User::SUPER_ADMIN);
        foreach ([...self::BUSINESS_PAGES, '/admin/pagos-servicio', '/caja'] as $uri) {
            $this->actingAs($admin)->get($uri)->assertSuccessful();
        }
    }

    /** Lo del negocio que el cajero sí puede hacer: el corte del día de su sucursal. */
    private const CASHIER_PAGES = ['/cortes', '/cortes/crear'];

    public function test_cashier_only_reaches_the_register(): void
    {
        $cashier = $this->cashier();
        foreach (array_diff(self::BUSINESS_PAGES, self::CASHIER_PAGES) as $uri) {
            $this->actingAs($cashier)->get($uri)->assertForbidden();
        }
        foreach (self::CASHIER_PAGES as $uri) {
            $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])->get($uri)->assertOk();
        }
        $this->actingAs($cashier)->post('/nota', [])->assertForbidden();
        $this->actingAs($this->cashier(['cortes.create' => false]))->get('/cortes/crear')->assertForbidden();
        $this->actingAs($cashier)->get('/admin/pagos-servicio')->assertNotFound();

        // Pantalla inicial: la caja.
        $this->actingAs($cashier)->get('/dashboard')->assertRedirect(route('caja'));
        $this->actingAs($cashier)->get('/caja')->assertOk();
    }

    public function test_cashier_permissions_are_configurable_per_user(): void
    {
        $this->assertTrue($this->cashier()->hasPermission('sales.create'));
        $this->assertFalse($this->cashier()->hasPermission('sales.discount'));

        $custom = $this->cashier(['sales.discount' => true, 'sales.create' => false]);
        $this->assertTrue($custom->hasPermission('sales.discount'));
        $this->assertFalse($custom->hasPermission('sales.create'));
        $this->actingAs($custom)->get('/caja')->assertForbidden();

        // Lo no configurable nunca se le puede dar a un cajero.
        $this->assertFalse($this->cashier(['cortes.manage' => true, 'users.manage' => true])->hasPermission('cortes.manage'));
    }

    public function test_cashier_works_only_in_assigned_branches(): void
    {
        $cashier = $this->user(User::CASHIER, [], [$this->b->id]);

        // Sesión con una sucursal ajena: se corrige a la asignada.
        $this->actingAs($cashier)->withSession(['branch_id' => $this->a->id])->get('/caja')
            ->assertInertia(fn ($page) => $page->where('currentBranch', $this->b->id)
                ->where('branches', fn ($branches) => collect($branches)->pluck('id')->all() === [$this->b->id]));

        $this->actingAs($cashier)->postJson('/set-branch', ['branch_id' => $this->a->id])->assertForbidden();
        $this->actingAs($cashier)->postJson('/set-branch', ['branch_id' => $this->b->id])->assertOk();
        $this->actingAs($cashier)->getJson('/api/branches')->assertJsonCount(1)->assertJsonPath('0.id', $this->b->id);
    }

    public function test_cashier_does_not_receive_costs_in_product_search(): void
    {
        Product::create(['brand' => 'PIRELLI', 'model' => 'P7', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 16, 'extra' => 5, 'price' => 1800, 'cost' => 1300]);

        $row = $this->actingAs($this->cashier())->getJson('/api/products/search?query=PIRELLI')->assertOk()->json('0');
        $this->assertSame(1800, (int) $row['price']);
        $this->assertArrayNotHasKey('cost', $row);
        $this->assertArrayNotHasKey('extra', $row);

        $ownerRow = $this->actingAs($this->user(User::OWNER))->getJson('/api/products/search?query=PIRELLI')->json('0');
        $this->assertArrayHasKey('cost', $ownerRow);
    }

    public function test_cashier_does_not_see_the_system_payment_notice(): void
    {
        $this->actingAs($this->cashier())->get('/caja')
            ->assertInertia(fn ($page) => $page->where('billing', null)->where('canManageBilling', false));
        $this->actingAs($this->user(User::OWNER))->get('/dashboard')
            ->assertInertia(fn ($page) => $page->where('billing.state', 'overdue'));
    }

    public function test_permissions_are_shared_with_the_frontend(): void
    {
        $this->actingAs($this->cashier())->get('/caja')->assertInertia(fn ($page) => $page
            ->where('permissions', ['sales.create', 'sales.view_own', 'sales.view_branch', 'sales.change_price', 'products.update_price', 'sales.credit', 'stock.view', 'products.view', 'cortes.create']));
    }

    public function test_inactive_user_cannot_log_in_and_open_sessions_are_closed(): void
    {
        $user = $this->user(User::OWNER);
        $user->forceFill(['active' => false])->save();

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($user)->get('/notas')->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_profile_form_cannot_escalate_the_role(): void
    {
        $cashier = $this->cashier();
        $this->actingAs($cashier)->patch('/profile', ['name' => 'X', 'email' => $cashier->email, 'role' => 'super_admin', 'permissions' => ['cortes.manage' => true]]);

        $this->assertSame(User::CASHIER, $cashier->fresh()->role);
        $this->assertNull($cashier->fresh()->permissions);
    }
}
