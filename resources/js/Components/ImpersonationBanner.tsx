import { PageProps } from "@/types";
import { router, usePage } from "@inertiajs/react";
import { LuEye, LuUndo2 } from "react-icons/lu";

/** Franja fija mientras el super admin ve el sistema "como" otro usuario. */
const ImpersonationBanner = () => {
    const { impersonator, auth } = usePage<PageProps>().props;
    if (!impersonator) return null;

    return (
        <div role="status" className="text-sm text-white bg-ink">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 mx-auto max-w-[1200px]">
                <span className="inline-flex items-center gap-2">
                    <LuEye className="w-4 h-4 shrink-0" aria-hidden />
                    Estás viendo el sistema como <b className="font-semibold">{auth.user.name}</b>
                </span>
                <button
                    type="button"
                    onClick={() => router.post(route("impersonation.stop"))}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 font-medium border rounded-button border-white/25 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                    <LuUndo2 className="w-3.5 h-3.5" aria-hidden />
                    Volver a mi cuenta
                </button>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
