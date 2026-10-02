<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * "Entrar como": el super_admin ve el sistema exactamente como otro usuario (sus
 * permisos y sucursales) para revisar o dar soporte. Se guarda quién entró en la
 * sesión (impersonator_id) para poder volver a su cuenta sin contraseña.
 */
class ImpersonationController extends Controller
{
    public const SESSION_KEY = 'impersonator_id';

    public function start(Request $request, User $user)
    {
        $admin = $request->user();

        if ($user->id === $admin->id || $user->isSuperAdmin() || ! $user->active) {
            return back()->with('error', 'Sólo puedes entrar como un usuario activo que no sea super administrador.');
        }

        Log::info('Impersonation start', ['admin_id' => $admin->id, 'user_id' => $user->id]);

        // Auth::login migra la sesión (nuevo id) conservando sus datos.
        Auth::login($user);
        $request->session()->put(self::SESSION_KEY, $admin->id);
        $request->session()->forget('branch_id'); // que tome una sucursal del usuario

        return redirect()->route('dashboard');
    }

    /** Sólo necesita sesión: quien está "dentro" es el otro usuario, sin users.manage. */
    public function stop(Request $request)
    {
        $admin = User::find($request->session()->get(self::SESSION_KEY));
        abort_unless($admin && $admin->isSuperAdmin() && $admin->active, 404);

        Log::info('Impersonation stop', ['admin_id' => $admin->id, 'user_id' => $request->user()->id]);

        Auth::login($admin);
        $request->session()->forget([self::SESSION_KEY, 'branch_id']);

        return redirect()->route('users.index')->with('success', 'Volviste a tu cuenta.');
    }
}
