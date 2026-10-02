<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** QR del ticket (/v/CODIGO) y búsqueda de notas por código. */
class NoteCodeLinkTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $seller;

    private Note $note;

    protected function setUp(): void
    {
        parent::setUp();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $this->seller = $this->cashier();
        $this->note = Note::create(['folio' => '77', 'date' => '2025-01-15', 'branch_id' => $this->a->id, 'purchase_total' => 0, 'sale_total' => 100,
            'status' => 'paid', 'purchase_status' => 'pending', 'delivery_status' => 'entregado_a_cliente', 'flete' => 0]);
        $this->note->forceFill(['user_id' => $this->seller->id])->save();
    }

    private function cashier(array $permissions = [], ?Branch $branch = null): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync([($branch ?? $this->a)->id]);

        return $user;
    }

    private function link(?string $code = null): string
    {
        return '/v/'.($code ?? $this->note->code);
    }

    public function test_qr_link_opens_the_note_for_the_owner_and_the_ticket_for_its_cashier(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->get($this->link())->assertRedirect(route('notes.show', $this->note));
        $this->actingAs($owner)->get($this->link(strtolower($this->note->code)))->assertRedirect(route('notes.show', $this->note));

        $this->actingAs($this->seller)->get($this->link())->assertRedirect(route('tickets.show', $this->note));
        $this->actingAs($this->cashier(['sales.view_branch' => true]))->get($this->link())->assertRedirect(route('tickets.show', $this->note));
    }

    public function test_qr_link_never_shows_what_the_user_cannot_see(): void
    {
        // Otro cajero de la misma sucursal, sin permiso de ver ventas ajenas.
        $this->actingAs($this->cashier())->get($this->link())->assertRedirect(route('caja'))->assertSessionHas('error');
        // Cajero de otra sucursal.
        $this->actingAs($this->cashier(['sales.view_branch' => true], $this->b))->get($this->link())
            ->assertRedirect(route('caja'))->assertSessionHas('error', 'La venta 77 es de otra sucursal.');
        // Código que no existe.
        $this->actingAs(User::factory()->create())->get($this->link('ZZZZZZZZZZ'))
            ->assertRedirect(route('notas'))->assertSessionHas('error');
    }

    public function test_qr_link_without_session_asks_to_log_in_and_comes_back(): void
    {
        $this->get($this->link())->assertRedirect(route('login'));

        $owner = User::factory()->create();
        $this->post('/login', ['email' => $owner->email, 'password' => 'password'])->assertRedirect($this->link());
    }

    public function test_ticket_qr_carries_the_link(): void
    {
        $html = $this->actingAs($this->seller)->get("/nota/{$this->note->id}/ticket")->getContent();
        preg_match('#data:image/svg\+xml;base64,([^"]+)#', $html, $m);
        $this->assertNotEmpty($m, 'el ticket trae el QR');
        // El SVG del QR es más grande que el de sólo 10 letras: el enlace va dentro.
        $this->assertStringContainsString($this->note->code, $html);
        $this->assertSame(url($this->link()), route('notes.verify', $this->note->code));
    }

    public function test_searching_notes_by_code_or_link_opens_the_note_regardless_of_filters(): void
    {
        $owner = User::factory()->create();
        $as = $this->actingAs($owner)->withSession(['branch_id' => $this->a->id]);

        $as->get('/notas?date=THIS_WEEK&query='.$this->note->code)->assertRedirect(route('notes.show', $this->note));
        $as->get('/notas?query='.urlencode('https://otro.host/v/'.strtolower($this->note->code)))->assertRedirect(route('notes.show', $this->note));
        // Un folio sigue buscándose como folio.
        $as->get('/notas?query=77')->assertOk();
    }

    public function test_extract_code(): void
    {
        $code = $this->note->code;
        $this->assertSame($code, Note::extractCode($code));
        $this->assertSame($code, Note::extractCode(' '.strtolower($code).' '));
        $this->assertSame($code, Note::extractCode("https://icm.example/v/{$code}"));
        $this->assertSame($code, Note::extractCode("http://x/v/{$code}?a=1"));
        $this->assertNull(Note::extractCode('2345678923'), 'sólo números: es folio');
        $this->assertNull(Note::extractCode('MICHELIN'));
        $this->assertNull(Note::extractCode('ABCDEFGHIO'), 'O no está en el alfabeto');
        $this->assertNull(Note::extractCode(null));
    }
}
