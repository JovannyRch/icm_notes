import { DELIVERY_STATUS_MAP, STATUS_DELIVERY_ENUM } from "@/const";
import { Badge } from "@radix-ui/themes";
import { CgCheck, CgClose, CgTime } from "react-icons/cg";
import { LuPackageOpen } from "react-icons/lu";
import { TbTruckDelivery } from "react-icons/tb";

interface Props {
    status: STATUS_DELIVERY_ENUM;
}

const DeliveryStatusBadge = ({ status }: Props) => {
    const label = DELIVERY_STATUS_MAP[status];

    const icon = {
        [STATUS_DELIVERY_ENUM.DELIVERED]: (
            <CgCheck className="w-5 h-5 text-green-600" />
        ),
        [STATUS_DELIVERY_ENUM.PAID_TO_SEND]: (
            <TbTruckDelivery className="w-5 h-5 text-orange-600" />
        ),
        [STATUS_DELIVERY_ENUM.PAID_TO_PICKUP]: (
            <LuPackageOpen className="w-5 h-5 text-orange-600" />
        ),
        [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_SEND]: (
            <TbTruckDelivery className="w-5 h-5 text-orange-600" />
        ),
        [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_PICKUP]: (
            <LuPackageOpen className="w-5 h-5 text-orange-600" />
        ),
        [STATUS_DELIVERY_ENUM.CANCELED]: (
            <CgClose className="w-4 h-4 text-red-600" />
        ),
        [STATUS_DELIVERY_ENUM.PENDING]: (
            <CgTime className="w-4 h-4 text-yellow-600" />
        ),
    };

    const color: {
        [key in STATUS_DELIVERY_ENUM]:
            | "green"
            | "orange"
            | "red"
            | "yellow"
            | "amber";
    } = {
        [STATUS_DELIVERY_ENUM.DELIVERED]: "green",
        [STATUS_DELIVERY_ENUM.PAID_TO_SEND]: "orange",
        [STATUS_DELIVERY_ENUM.PAID_TO_PICKUP]: "orange",
        [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_SEND]: "orange",
        [STATUS_DELIVERY_ENUM.ON_ACCOUNT_TO_PICKUP]: "orange",
        [STATUS_DELIVERY_ENUM.CANCELED]: "red",
        [STATUS_DELIVERY_ENUM.PENDING]: "yellow",
    };

    return (
        <div className="flex items-center justify-center gap-2">
            <Badge color={color[status] ?? "amber"}>
                <div className="flex items-center gap-1">
                    {icon[status]}
                    {label}
                </div>
            </Badge>
        </div>
    );
};

export default DeliveryStatusBadge;
