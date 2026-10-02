import Container from "@/Components/Container";
import PageHeader from "@/Components/ui/PageHeader";
import { useBranch } from "@/hooks/useBranch";
import { LuShoppingCart } from "react-icons/lu";

/** Caja del cajero. Fase 1: sólo la entrada; la caja completa llega en la fase 4. */
const CajaIndex = () => {
    const { currentBranchName } = useBranch();

    return (
        <Container headTitle="Caja">
            <PageHeader eyebrow={currentBranchName} title="Caja" />
            <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-card-lg border-pebble bg-[#fafafa]">
                <span className="flex items-center justify-center w-12 h-12 mb-4 rounded-tag bg-sky-tint text-electric">
                    <LuShoppingCart className="w-6 h-6" aria-hidden />
                </span>
                <p className="text-base font-medium text-charcoal">La caja estará disponible muy pronto</p>
                <p className="mt-1 text-sm text-fog">Desde aquí vas a registrar ventas e imprimir tickets.</p>
            </div>
        </Container>
    );
};

export default CajaIndex;
