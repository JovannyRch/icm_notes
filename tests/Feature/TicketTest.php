<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Note;
use App\Models\Product;
use App\Models\TicketPrint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Ticket de 80 mm: contenido, quién lo puede ver, bitácora de reimpresión y datos por sucursal. */
class TicketTest extends TestCase
{
    use RefreshDatabase;

    private Branch $a;

    private Branch $b;

    private User $cashier;

    private Note $note;

    protected function setUp(): void
    {
        parent::setUp();
        config(['features.discounts' => true]);
        $this->a = Branch::create(['name' => 'San Felipe']);
        $this->b = Branch::create(['name' => 'Jilotepec']);
        $product = Product::create(['brand' => 'MICHELIN', 'model' => 'PRIMACY 4', 'measure' => '205/55R16', 'mc' => '', 'unit' => 'PZA', 'iva' => 16, 'extra' => 0, 'price' => 2500, 'cost' => 1777]);

        $this->cashier = $this->cashier(['sales.discount' => true]);
        $this->actingAs($this->cashier)->withSession(['branch_id' => $this->a->id])->post('/caja/ventas', [
            'items' => [['product_id' => $product->id, 'quantity' => 2, 'discount' => 100]],
            'discount' => 150, 'cash_received' => 5000, 'customer' => 'Juan Pérez',
        ])->assertSessionHasNoErrors();
        $this->note = Note::sole();
    }

    private function cashier(array $permissions = [], ?Branch $branch = null): User
    {
        $user = User::factory()->create(['name' => 'Ana Caja']);
        $user->forceFill(['role' => User::CASHIER, 'permissions' => $permissions ?: null])->save();
        $user->branches()->sync([($branch ?? $this->a)->id]);

        return $user;
    }

    private function ticketUrl(bool $print = false): string
    {
        return "/nota/{$this->note->id}/ticket".($print ? '?print=1' : '');
    }

    public function test_ticket_shows_the_sale_without_costs(): void
    {
        $html = $this->actingAs($this->cashier)->get($this->ticketUrl())->assertOk()->getContent();

        foreach (['CAJA SAN FELIPE', 'Folio: <b>1</b>', 'Atendió: Ana Caja', 'Cliente: Juan Pérez', 'MICHELIN PRIMACY 4 205/55R16',
            '2 x $2,500.00', '$4,900.00', '-$100.00', '-$250.00', '$4,750.00', 'Recibido', '$5,000.00', '$250.00',
            'CUATRO MIL SETECIENTOS CINCUENTA PESOS 00/100 M.N.', $this->note->code, 'data:image/svg+xml;base64,', 'Ideas Modernas de Construcción', '¡Gracias por su compra!', 'img/ticket-logo.png'] as $text) {
            $this->assertStringContainsString($text, $html, "Falta en el ticket: {$text}");
        }
        $this->assertStringNotContainsString('1,777', $html, 'el ticket no muestra costos');
        $this->assertStringNotContainsString('REIMPRESIÓN', $html);
        $this->assertStringNotContainsString('window.print()', str_replace('onclick="window.print()"', '', $html), 'sin ?print=1 no imprime solo');
    }

    public function test_printing_is_logged_and_the_second_time_is_a_reprint(): void
    {
        $first = $this->actingAs($this->cashier)->get($this->ticketUrl(print: true))->assertOk()->getContent();
        $this->assertStringNotContainsString('REIMPRESIÓN', $first);
        $this->assertStringContainsString("window.addEventListener('load'", $first);

        $second = $this->actingAs($this->cashier)->get($this->ticketUrl(print: true))->getContent();
        $this->assertStringContainsString('REIMPRESIÓN', $second);

        $this->assertSame([false, true], TicketPrint::orderBy('id')->pluck('reprint')->all());
        $this->assertSame($this->cashier->id, TicketPrint::first()->user_id);
    }

    public function test_who_can_see_a_ticket(): void
    {
        // Otro cajero de la misma sucursal: sólo con "ver ventas de la sucursal".
        $this->actingAs($this->cashier())->get($this->ticketUrl())->assertForbidden();
        $this->actingAs($this->cashier(['sales.view_branch' => true]))->get($this->ticketUrl())->assertOk();
        // De otra sucursal: nunca, aunque vea las de la suya.
        $this->actingAs($this->cashier(['sales.view_branch' => true], $this->b))->get($this->ticketUrl())->assertForbidden();
        // Dueño: sí.
        $this->actingAs(User::factory()->create())->get($this->ticketUrl())->assertOk();
    }

    /** [ancho, alto] en mm de la primera página del PDF. */
    private function pdfSize(string $pdf): array
    {
        $this->assertMatchesRegularExpression('/MediaBox \[[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)\]/', $pdf);
        preg_match('/MediaBox \[[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)\]/', $pdf, $m);

        return [round($m[1] / 72 * 25.4, 1), round($m[2] / 72 * 25.4, 1)];
    }

    public function test_ticket_pdf_is_80mm_and_as_long_as_the_ticket(): void
    {
        $response = $this->actingAs($this->cashier)->get("/nota/{$this->note->id}/ticket/pdf")->assertOk();
        $response->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('attachment; filename="ticket-1.pdf"', $response->headers->get('Content-Disposition'));

        $pdf = $response->getContent();
        $this->assertStringStartsWith('%PDF', $pdf);
        $this->assertSame(1, preg_match_all('#/Type\s*/Page[^s]#', $pdf), 'una sola página');
        [$width, $height] = $this->pdfSize($pdf);
        $this->assertSame(80.0, $width);
        $this->assertGreaterThan(120, $height);
        $this->assertLessThan(260, $height, 'recortado al largo del ticket, sin hoja en blanco');

        // Descargar el PDF no cuenta como impresión.
        $this->assertSame(0, TicketPrint::count());

        // Con más productos, el PDF es más largo.
        foreach (range(1, 8) as $i) {
            $this->note->items()->create(['brand' => 'CEMEX', 'model' => "M{$i}", 'measure' => '50KG', 'mc' => '', 'unit' => 'PZA', 'quantity' => 1,
                'cost' => 1, 'price' => 10, 'iva' => 0, 'extra' => 0, 'sale_subtotal' => 10, 'purchase_subtotal' => 1, 'supplied_status' => 'no_enviado', 'delivery_status' => 'entregado_a_cliente']);
        }
        [, $longer] = $this->pdfSize($this->actingAs($this->cashier)->get("/nota/{$this->note->id}/ticket/pdf")->getContent());
        $this->assertGreaterThan($height + 40, $longer);
    }

    public function test_ticket_pdf_follows_the_same_access_rules(): void
    {
        $this->actingAs($this->cashier())->get("/nota/{$this->note->id}/ticket/pdf")->assertForbidden();
        $this->actingAs($this->cashier(['sales.view_branch' => true], $this->b))->get("/nota/{$this->note->id}/ticket/pdf")->assertForbidden();
        $this->actingAs(User::factory()->create())->get("/nota/{$this->note->id}/ticket/pdf")->assertOk();
        auth()->logout();
        $this->get("/nota/{$this->note->id}/ticket/pdf")->assertRedirect(route('login'));
    }

    public function test_ticket_shows_m2_per_box_and_total_m2(): void
    {
        $this->note->items()->create(['brand' => 'CASTEL', 'model' => 'MARMOL', 'measure' => '60x60', 'mc' => '1.44', 'unit' => 'CAJA', 'quantity' => 4,
            'cost' => 1, 'price' => 300, 'iva' => 0, 'extra' => 0, 'sale_subtotal' => 1200, 'purchase_subtotal' => 4, 'supplied_status' => 'no_enviado', 'delivery_status' => 'entregado_a_cliente']);

        $html = $this->actingAs($this->cashier)->get("/nota/{$this->note->id}/ticket")->getContent();
        $this->assertStringContainsString('1.44 m²/caja', $html);
        $this->assertStringContainsString('5.76 m²', $html);
        $this->assertStringContainsString('Total m²', $html);
    }

    public function test_canceled_sale_ticket_says_so(): void
    {
        $this->note->update(['delivery_status' => 'cancelado', 'status' => 'canceled']);

        $this->actingAs($this->cashier)->get($this->ticketUrl())->assertSee('VENTA CANCELADA');
    }

    public function test_branch_ticket_settings_are_printed_and_blank_fields_use_defaults(): void
    {
        $owner = User::factory()->create();
        $this->actingAs($owner)->put("/sucursales/{$this->a->id}/ticket", [
            'business_name' => 'Llantera ICM', 'rfc' => 'ICM010101AAA', 'address' => "Av. Juárez 10\nCentro", 'phone' => '712 123 4567',
            'header' => '', 'footer' => 'Garantía de 30 días', 'show_logo' => false,
        ])->assertSessionHas('success');

        $html = $this->actingAs($this->cashier)->get($this->ticketUrl())->getContent();
        foreach (['Llantera ICM', 'RFC: ICM010101AAA', 'Av. Juárez 10', 'Tel. 712 123 4567', 'Garantía de 30 días'] as $text) {
            $this->assertStringContainsString($text, $html);
        }
        $this->assertStringNotContainsString('img/ticket-logo.png', $html);

        // La otra sucursal no se ve afectada.
        $this->assertNull($this->b->fresh()->ticket);
        $this->actingAs($owner)->get("/sucursales/{$this->b->id}/ticket-prueba")->assertOk()
            ->assertSee('TICKET DE PRUEBA')->assertSee('CAJA JILOTEPEC')->assertSee('Ideas Modernas de Construcción');
    }

    public function test_cashier_cannot_manage_branches(): void
    {
        $this->actingAs($this->cashier)->get('/sucursales')->assertForbidden();
        $this->actingAs($this->cashier)->put("/sucursales/{$this->a->id}/ticket", ['business_name' => 'X'])->assertForbidden();
        $this->actingAs(User::factory()->create())->get('/sucursales')->assertOk();
    }
}
