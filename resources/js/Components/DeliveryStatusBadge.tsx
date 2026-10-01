import { DELIVERY_STATUS_MAP, STATUS_DELIVERY_ENUM } from "@/const";
import { LuPackageOpen, LuTruck } from "react-icons/lu";
import StatusPill, { StatusTone } from "./StatusPill";

interface Props {
    status: STATUS_DELIVERY_ENUM;
}

const tone: Record<STATUS_DELIVERY_ENUM, StatusTone> = {
    [STATUS_DELIVERY_ENUM.DELIVERED]: "green",
    [STATUS_DELIVERY_ENUM.PAID_TO_SEND]: "orange",
    [STATUS_DELIVERY_ENUM.PAID_TO_PICKUP]: "orange",
    [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_SEND]: "orange",
    [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_PICKUP]: "orange",
    [STATUS_DELIVERY_ENUM.CANCELED]: "red",
    [STATUS_DELIVERY_ENUM.PENDING]: "amber",
};

// Enviar / recoger se distinguen por icono; el resto lleva el punto de color.
const icon: Partial<Record<STATUS_DELIVERY_ENUM, JSX.Element>> = {
    [STATUS_DELIVERY_ENUM.PAID_TO_SEND]: <LuTruck className="w-3.5 h-3.5" aria-hidden />,
    [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_SEND]: <LuTruck className="w-3.5 h-3.5" aria-hidden />,
    [STATUS_DELIVERY_ENUM.PAID_TO_PICKUP]: <LuPackageOpen className="w-3.5 h-3.5" aria-hidden />,
    [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_PICKUP]: <LuPackageOpen className="w-3.5 h-3.5" aria-hidden />,
};

const DeliveryStatusBadge = ({ status }: Props) => (
    <div className="flex items-center justify-center">
        <StatusPill tone={tone[status] ?? "gray"} icon={icon[status]}>
            {DELIVERY_STATUS_MAP[status] ?? status}
        </StatusPill>
    </div>
);

export default DeliveryStatusBadge;
