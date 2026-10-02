<?php

namespace Tests\Unit;

use Tests\TestCase;

/** La versión sale de package.json (la sube release-please) y debe estar en el CHANGELOG. */
class AppVersionTest extends TestCase
{
    public function test_version_is_semver_and_matches_package_json(): void
    {
        $version = config('app.version');
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', $version);

        $package = json_decode(file_get_contents(base_path('package.json')), true);
        $this->assertSame($version, $package['version'] ?? null, 'Actualiza también "version" en package.json.');

        $this->assertStringContainsString("## [{$version}]", file_get_contents(base_path('CHANGELOG.md')), 'Anota la versión en CHANGELOG.md.');
    }
}
