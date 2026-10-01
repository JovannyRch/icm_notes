<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Inventario de las notas: crear descuenta, editar mueve sólo la diferencia y
 * eliminar devuelve las piezas, siempre en la sucursal de la nota.
 */
class NoteStockTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $a;

    private Branch $b;

    private Product $p1;

    private Product $p2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->a = Branch::create(['name' => 'A']);
        $this->b = Branch::create(['name' => 'B']);
        $make = fn ($model) => Product::create(['brand' => 'X', 'model' => $model, 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'iva' => 0, 'extra' => 0, 'price' => 100, 'cost' => 50]);
        $this->p1 = $make('M1');
        $this->p2 = $make('M2');
        foreach ([$this->a, $this->b] as $branch) {
            foreach ([$this->p1, $this->p2] as $product) {
                Stock::create(['branch_id' => $branch->id, 'product_id' => $product->id, 'quantity' => 10]);
            }
        }
    }

    private function item(Product $product, $quantity): array
    {
        return ['brand' => 'X', 'model' => $product->model, 'measure' => '1', 'mc' => '', 'unit' => 'PZA', 'quantity' => $quantity,
            'cost' => 50, 'price' => 100, 'iva' => 0, 'extra' => 0, 'purchase_subtotal' => 50 * $quantity, 'sale_subtotal' => 100 * $quantity,
            'supplied_status' => 'no_enviado', 'delivery_status' => 'pendiente', 'product_id' => $product->id];
    }

    private function payload(array $items, ?Branch $branch = null): array
    {
        return ['folio' => '1', 'customer' => 'c', 'date' => '2026-09-10', 'purchase_total' => 0, 'sale_total' => 0, 'flete' => 0,
            'branch_id' => ($branch ?? $this->a)->id, 'delivery_status' => 'pendiente', 'status' => 'pending', 'purchase_status' => 'pending',
            'notes' => '', 'items' => $items, 'payments' => []];
    }

    private function stock(Branch $branch, Product $product): float
    {
        return (float) Stock::where(['branch_id' => $branch->id, 'product_id' => $product->id])->value('quantity');
    }

    private function as(Branch $session)
    {
        return $this->actingAs($this->user)->withSession(['branch_id' => $session->id]);
    }

    public function test_saving_an_edited_note_without_changes_does_not_discount_again(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 2)]));
        $note = Note::sole();
        $this->assertSame(8.0, $this->stock($this->a, $this->p1));

        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$this->item($this->p1, 2)]));
        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$this->item($this->p1, 2)]));

        $this->assertSame(8.0, $this->stock($this->a, $this->p1));
    }

    public function test_editing_moves_only_the_difference(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 2)]));
        $note = Note::sole();

        // Sube a 3 y se agrega otra partida de 4.
        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$this->item($this->p1, 3), $this->item($this->p2, 4)]));
        $this->assertSame(7.0, $this->stock($this->a, $this->p1));
        $this->assertSame(6.0, $this->stock($this->a, $this->p2));

        // Se quita la primera partida: regresan sus 3 piezas.
        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$this->item($this->p2, 4)]));
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));
        $this->assertSame(6.0, $this->stock($this->a, $this->p2));
    }

    public function test_stock_moves_in_the_branch_of_the_note_not_the_session(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 2)]));
        $note = Note::sole();

        // Se edita teniendo activa la sucursal B.
        $this->as($this->b)->put("/nota/{$note->id}", $this->payload([$this->item($this->p1, 5)]));

        $this->assertSame(5.0, $this->stock($this->a, $this->p1));
        $this->assertSame(10.0, $this->stock($this->b, $this->p1));
    }

    public function test_deleting_notes_returns_their_pieces(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 2), $this->item($this->p2, 1)]));
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 3)]));
        [$first, $second] = Note::orderBy('id')->get()->all();
        $this->assertSame(5.0, $this->stock($this->a, $this->p1));

        $this->as($this->a)->post("/nota/{$first->id}/destroy");
        $this->assertSame(7.0, $this->stock($this->a, $this->p1));
        $this->assertSame(10.0, $this->stock($this->a, $this->p2));

        // Eliminación múltiple desde el listado.
        $this->as($this->a)->post(route('notes.destroy.items'), ['ids' => [(string) $second->id]]);
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));
        $this->assertSame(0, Note::count());
    }

    public function test_items_without_product_do_not_touch_stock(): void
    {
        $free = $this->item($this->p1, 2);
        $free['product_id'] = null;
        $this->as($this->a)->post('/nota', $this->payload([$free]));
        $note = Note::sole();
        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$free]));
        $this->as($this->a)->post("/nota/{$note->id}/destroy");

        $this->assertSame(10.0, $this->stock($this->a, $this->p1));
    }

    private function cancelled(array $payload): array
    {
        return array_merge($payload, ['delivery_status' => 'cancelado', 'status' => 'canceled']);
    }

    public function test_cancelling_returns_pieces_and_reactivating_discounts_them_again(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 4)]));
        $note = Note::sole();
        $this->assertSame(6.0, $this->stock($this->a, $this->p1));

        $this->as($this->a)->put("/nota/{$note->id}", $this->cancelled($this->payload([$this->item($this->p1, 4)])));
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));

        // Guardar otra vez cancelada no mueve nada.
        $this->as($this->a)->put("/nota/{$note->id}", $this->cancelled($this->payload([$this->item($this->p1, 4)])));
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));

        // Reactivar (entrega y estatus ya no cancelados) vuelve a descontar.
        $this->as($this->a)->put("/nota/{$note->id}", $this->payload([$this->item($this->p1, 4)]));
        $this->assertSame(6.0, $this->stock($this->a, $this->p1));

        $descriptions = \App\Models\StockMovement::where('note_id', $note->id)->orderBy('id')->pluck('description')->all();
        $this->assertSame([
            'Salida por nota #1',
            'Devolución por cancelación de nota #1',
            'Salida por reactivación de nota #1',
        ], $descriptions);
    }

    public function test_a_note_created_cancelled_discounts_nothing(): void
    {
        $this->as($this->a)->post('/nota', $this->cancelled($this->payload([$this->item($this->p1, 3)])));

        $this->assertSame(10.0, $this->stock($this->a, $this->p1));
    }

    public function test_deleting_a_cancelled_note_does_not_return_pieces_twice(): void
    {
        $this->as($this->a)->post('/nota', $this->payload([$this->item($this->p1, 3)]));
        $note = Note::sole();
        $this->as($this->a)->put("/nota/{$note->id}", $this->cancelled($this->payload([$this->item($this->p1, 3)])));
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));

        $this->as($this->a)->post("/nota/{$note->id}/destroy");
        $this->assertSame(10.0, $this->stock($this->a, $this->p1));
    }
}
