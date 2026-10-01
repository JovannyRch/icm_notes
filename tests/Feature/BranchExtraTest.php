<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchExtraTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Branch $a;

    private Branch $b;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->a = Branch::create(['name' => 'Sucursal A']);
        $this->b = Branch::create(['name' => 'Sucursal B']);
    }

    public function test_sets_and_clears_the_branch_extra_without_touching_other_branches(): void
    {
        $this->actingAs($this->user)
            ->put(route('branches.extra.update', $this->a), ['extra_percentage' => 12.5])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success');

        $this->assertSame(12.5, $this->a->fresh()->extra_percentage);
        $this->assertNull($this->b->fresh()->extra_percentage);

        $this->actingAs($this->user)
            ->put(route('branches.extra.update', $this->a), ['extra_percentage' => null])
            ->assertSessionHasNoErrors();

        $this->assertNull($this->a->fresh()->extra_percentage);
    }

    public function test_zero_is_a_valid_global_extra(): void
    {
        $this->actingAs($this->user)
            ->put(route('branches.extra.update', $this->a), ['extra_percentage' => 0])
            ->assertSessionHasNoErrors();

        $this->assertSame(0.0, $this->a->fresh()->extra_percentage);
    }

    public function test_rejects_invalid_values(): void
    {
        foreach ([-1, 'abc', 5000] as $value) {
            $this->actingAs($this->user)
                ->put(route('branches.extra.update', $this->a), ['extra_percentage' => $value])
                ->assertSessionHasErrors('extra_percentage');
        }

        $this->assertNull($this->a->fresh()->extra_percentage);
    }

    public function test_requires_login(): void
    {
        $this->put(route('branches.extra.update', $this->a), ['extra_percentage' => 10])
            ->assertRedirect(route('login'));

        $this->assertNull($this->a->fresh()->extra_percentage);
    }

    public function test_extra_is_shared_with_every_page(): void
    {
        $this->a->update(['extra_percentage' => 8]);

        $this->actingAs($this->user)
            ->withSession(['branch_id' => $this->a->id])
            ->get(route('products'))
            ->assertInertia(fn ($page) => $page
                ->where('currentBranch', $this->a->id)
                ->where('branches.0.extra_percentage', 8)
                ->where('branches.1.extra_percentage', null));
    }
}
