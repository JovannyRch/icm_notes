<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Las pantallas de error usan el diseño de la app (Pages/Error.tsx), no las de Laravel. */
class ErrorPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_unknown_url_shows_the_app_not_found_page(): void
    {
        $this->get('/esto-no-existe')
            ->assertNotFound()
            ->assertInertia(fn ($page) => $page->component('Error')->where('status', 404)->where('message', null));
    }

    public function test_missing_record_and_hidden_screen_show_not_found(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)->get('/productos/999999')
            ->assertNotFound()->assertInertia(fn ($page) => $page->component('Error'));
        // Pantalla de sistema para quien no es super admin: 404, sin delatar que existe.
        $this->actingAs($owner)->get('/admin/usuarios')
            ->assertNotFound()->assertInertia(fn ($page) => $page->component('Error'));
    }

    public function test_forbidden_shows_the_spanish_abort_message(): void
    {
        $a = Branch::create(['name' => 'A']);
        $cashier = User::factory()->create();
        $cashier->forceFill(['role' => 'cashier'])->save();
        $cashier->branches()->attach($a->id);

        // Sin permiso (mensaje genérico de Laravel: no se muestra).
        $this->actingAs($cashier)->get('/productos')
            ->assertForbidden()->assertInertia(fn ($page) => $page->component('Error')->where('status', 403)->where('message', null));
    }

    public function test_json_requests_keep_json_errors(): void
    {
        $owner = User::factory()->create();

        $this->actingAs($owner)->getJson('/productos/999999')->assertNotFound()->assertJsonStructure(['message']);
    }
}
