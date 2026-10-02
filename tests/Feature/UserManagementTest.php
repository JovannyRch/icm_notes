<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/** Administración de usuarios (super_admin) y "entrar como". */
class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->admin = $this->user(User::SUPER_ADMIN);
    }

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function cashierPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Cajera Uno',
            'email' => '  Caja1@Example.com ',
            'role' => User::CASHIER,
            'active' => true,
            'password' => 'secreta123',
            'branches' => [$this->b->id],
            'permissions' => ['sales.discount' => true, 'sales.view_own' => false],
            'max_discount_percent' => 10,
        ], $overrides);
    }

    public function test_only_super_admin_reaches_user_management(): void
    {
        $owner = $this->user(User::OWNER);
        foreach (['/admin/usuarios', '/admin/usuarios/crear', "/admin/usuarios/{$owner->id}"] as $uri) {
            $this->actingAs($owner)->get($uri)->assertNotFound();
            $this->actingAs($this->admin)->get($uri)->assertOk();
        }
        $this->actingAs($owner)->post('/admin/usuarios', $this->cashierPayload())->assertNotFound();
        $this->assertDatabaseCount('users', 2);
    }

    public function test_super_admin_creates_a_cashier_with_branches_and_permissions(): void
    {
        $this->actingAs($this->admin)->post('/admin/usuarios', $this->cashierPayload())
            ->assertRedirect(route('users.index'));

        $cashier = User::where('email', 'caja1@example.com')->firstOrFail();
        $this->assertSame(User::CASHIER, $cashier->role);
        $this->assertNotNull($cashier->email_verified_at, 'si no, el middleware verified lo saca');
        $this->assertTrue(Hash::check('secreta123', $cashier->password));
        $this->assertSame([$this->b->id], $cashier->accessibleBranchIds());
        $this->assertSame(10.0, $cashier->max_discount_percent);
        $this->actingAs($cashier)->get('/caja')->assertOk();

        $this->assertTrue($cashier->hasPermission('sales.discount'));
        $this->assertFalse($cashier->hasPermission('sales.view_own'));
        $this->assertTrue($cashier->hasPermission('sales.create'), 'sin valor enviado toma el de la plantilla');
        $this->assertFalse($cashier->hasPermission('notes.manage'));
        // Se guardan todos los configurables, explícitos.
        $this->assertCount(count(array_filter(config('permissions.abilities'), fn ($a) => ! empty($a['cashier']))), $cashier->permissions);
    }

    public function test_cashier_needs_a_branch_and_unique_email(): void
    {
        $this->actingAs($this->admin)->post('/admin/usuarios', $this->cashierPayload(['branches' => []]))
            ->assertSessionHasErrors('branches');
        $this->actingAs($this->admin)->post('/admin/usuarios', $this->cashierPayload(['email' => strtoupper($this->admin->email)]))
            ->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_owner_does_not_keep_cashier_settings(): void
    {
        $this->actingAs($this->admin)->post('/admin/usuarios', $this->cashierPayload());
        $user = User::where('email', 'caja1@example.com')->first();

        $this->actingAs($this->admin)->put("/admin/usuarios/{$user->id}", $this->cashierPayload([
            'role' => User::OWNER, 'password' => '', 'branches' => [],
        ]))->assertRedirect(route('users.index'));

        $user->refresh();
        $this->assertSame(User::OWNER, $user->role);
        $this->assertNull($user->permissions);
        $this->assertNull($user->max_discount_percent);
        $this->assertSame(0, $user->branches()->count());
        $this->assertTrue(Hash::check('secreta123', $user->password), 'contraseña vacía conserva la actual');
        $this->assertSame([$this->a->id, $this->b->id], $user->accessibleBranchIds());
    }

    public function test_super_admin_cannot_lock_themself_out(): void
    {
        $payload = ['name' => 'Yo', 'email' => $this->admin->email, 'active' => true, 'password' => ''];

        $this->actingAs($this->admin)->put("/admin/usuarios/{$this->admin->id}", $payload + ['role' => User::OWNER])
            ->assertSessionHas('error');
        $this->actingAs($this->admin)->put("/admin/usuarios/{$this->admin->id}", ['active' => false, 'role' => User::SUPER_ADMIN] + $payload)
            ->assertSessionHas('error');
        $this->actingAs($this->admin)->patch("/admin/usuarios/{$this->admin->id}/activo")->assertSessionHas('error');

        $this->admin->refresh();
        $this->assertTrue($this->admin->isSuperAdmin());
        $this->assertTrue($this->admin->active);
    }

    public function test_deactivate_and_reactivate(): void
    {
        $owner = $this->user(User::OWNER);

        $this->actingAs($this->admin)->patch("/admin/usuarios/{$owner->id}/activo");
        $this->assertFalse($owner->refresh()->active);
        $this->actingAs($owner)->get('/notas')->assertRedirect(route('login'));

        $this->actingAs($this->admin)->patch("/admin/usuarios/{$owner->id}/activo");
        $this->assertTrue($owner->refresh()->active);
    }

    public function test_impersonate_a_cashier_and_go_back(): void
    {
        $cashier = $this->user(User::CASHIER);
        $cashier->branches()->sync([$this->b->id]);

        $this->actingAs($this->admin)->post("/admin/usuarios/{$cashier->id}/entrar")->assertRedirect(route('dashboard'));
        $this->assertAuthenticatedAs($cashier);

        // Ve exactamente lo del cajero: su sucursal, sin pantallas del negocio ni de admin.
        $this->get('/caja')->assertOk()->assertInertia(fn ($page) => $page
            ->where('impersonator.id', $this->admin->id)
            ->where('currentBranch', $this->b->id));
        $this->get('/notas')->assertForbidden();
        $this->get('/admin/usuarios')->assertNotFound();

        $this->post('/admin/volver-a-mi-cuenta')->assertRedirect(route('users.index'));
        $this->assertAuthenticatedAs($this->admin);
        $this->get('/admin/usuarios')->assertOk()->assertInertia(fn ($page) => $page->where('impersonator', null));
    }

    public function test_cannot_impersonate_super_admins_inactive_users_or_without_session(): void
    {
        $other = $this->user(User::SUPER_ADMIN);
        $this->actingAs($this->admin)->post("/admin/usuarios/{$other->id}/entrar")->assertSessionHas('error');
        $this->assertAuthenticatedAs($this->admin);

        $inactive = $this->user(User::OWNER);
        $inactive->forceFill(['active' => false])->save();
        $this->actingAs($this->admin)->post("/admin/usuarios/{$inactive->id}/entrar")->assertSessionHas('error');
        $this->assertAuthenticatedAs($this->admin);

        // Sin haber entrado como nadie, "volver" no convierte a nadie en admin.
        $owner = $this->user(User::OWNER);
        $this->actingAs($owner)->post('/admin/volver-a-mi-cuenta')->assertNotFound();
        $this->assertAuthenticatedAs($owner);
    }
}
