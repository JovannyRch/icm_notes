<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\NoteProduct;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Folio automático, vendedor, código del documento y descuentos de la nota. */
class NoteSaleFieldsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $a;

    private Branch $b;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
    }

    private function item(array $overrides = []): array
    {
        return array_merge(['brand' => 'X', 'model' => 'M', 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'quantity' => 2,
            'cost' => 50, 'price' => 100, 'iva' => 0, 'extra' => 0, 'purchase_subtotal' => 100, 'sale_subtotal' => 200,
            'supplied_status' => 'no_enviado', 'delivery_status' => 'pendiente', 'product_id' => null], $overrides);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge(['folio' => '', 'customer' => 'c', 'date' => '2026-09-10', 'purchase_total' => 100, 'sale_total' => 200, 'flete' => 0,
            'branch_id' => $this->a->id, 'delivery_status' => 'pendiente', 'status' => 'pending', 'purchase_status' => 'pending',
            'notes' => '', 'items' => [$this->item()], 'payments' => []], $overrides);
    }

    private function existing(string $folio, Branch $branch): void
    {
        Note::create(['folio' => $folio, 'date' => '2026-09-01', 'branch_id' => $branch->id, 'purchase_total' => 0, 'sale_total' => 0,
            'status' => 'pending', 'purchase_status' => 'pending', 'delivery_status' => 'pendiente', 'flete' => 0]);
    }

    private function as()
    {
        return $this->actingAs($this->user)->withSession(['branch_id' => $this->a->id]);
    }

    public function test_next_folio_is_the_highest_numeric_folio_of_the_branch_plus_one(): void
    {
        $this->assertSame('1', Note::nextFolio($this->a->id), 'sin notas empieza en 1');

        foreach (['9', '10', 'A-500', ' ', '0099'] as $folio) {
            $this->existing($folio, $this->a);
        }
        $this->existing('900', $this->b); // otra sucursal no cuenta

        $this->assertSame('100', Note::nextFolio($this->a->id));
        $this->as()->get('/nota/crear')->assertInertia(fn ($page) => $page->where('nextFolio', '100'));
    }

    public function test_blank_folio_gets_the_next_one_and_a_typed_folio_is_kept(): void
    {
        $this->existing('41', $this->a);

        $this->as()->post('/nota', $this->payload())->assertSessionHasNoErrors();
        $this->as()->post('/nota', $this->payload(['folio' => 'MANUAL-7']));

        $this->assertSame(['41', '42', 'MANUAL-7'], Note::orderBy('id')->pluck('folio')->all());
    }

    public function test_seller_and_code_are_set_by_the_server(): void
    {
        $other = User::factory()->create();
        $this->as()->post('/nota', $this->payload(['user_id' => $other->id, 'code' => 'HACKED']));

        $note = Note::sole();
        $this->assertSame($this->user->id, $note->user_id);
        $this->assertMatchesRegularExpression('/^[2-9A-HJKMNP-Z]{10}$/', $note->code);

        // Editar (con otro usuario y folio vacío) no cambia vendedor, código ni folio.
        $folio = $note->folio;
        $this->actingAs($other)->put("/nota/{$note->id}", $this->payload(['folio' => '', 'code' => 'X']));
        $note->refresh();
        $this->assertSame($this->user->id, $note->user_id);
        $this->assertNotSame('X', $note->code);
        $this->assertSame($folio, $note->folio);

        $this->as()->get("/nota/{$note->id}")->assertInertia(fn ($page) => $page->where('seller', $this->user->name));
    }

    public function test_every_note_gets_a_distinct_code(): void
    {
        foreach (range(1, 30) as $i) {
            $this->existing((string) $i, $this->a);
        }
        $this->assertSame(30, Note::distinct()->count('code'));
    }

    public function test_discounts_are_stored_and_totals_stay_net(): void
    {
        // 2 × $100 con $20 de descuento en la partida = 180; − $30 de la nota = 150.
        $this->as()->post('/nota', $this->payload([
            'discount' => 30,
            'cash_received' => 200,
            'sale_total' => 150,
            'items' => [$this->item(['discount' => 20, 'sale_subtotal' => 180, 'list_price' => 110])],
            'payments' => [['date' => '2026-09-10', 'cash' => 150, 'card' => 0, 'transfer' => 0]],
        ]))->assertSessionHasNoErrors();

        $note = Note::sole();
        $this->assertEquals(30, $note->discount);
        $this->assertEquals(200, $note->cash_received);
        $this->assertEquals(150, $note->sale_total);
        $this->assertEquals(0, $note->balance);

        $item = NoteProduct::sole();
        $this->assertEquals(20, $item->discount);
        $this->assertEquals(180, $item->sale_subtotal);
        $this->assertEquals(110, $item->list_price);
    }

    public function test_notes_without_discount_keep_their_totals(): void
    {
        // Lo que manda hoy el formulario (sin campos de descuento) se guarda igual que antes.
        $this->as()->post('/nota', $this->payload(['discount' => null]))->assertSessionHasNoErrors();

        $note = Note::sole();
        $this->assertEquals(0, $note->discount);
        $this->assertEquals(200, $note->sale_total);
        $this->assertEquals(200, $note->balance);
        $this->assertEquals(0, NoteProduct::sole()->discount);
    }
}
