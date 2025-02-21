import { payment_status } from "@/types";
import { Badge } from "@radix-ui/themes";
import { CgCheck, CgClose, CgTime } from "react-icons/cg";

interface Props {
    status: payment_status;
    label: string;
}

const StatusPaidBadge = ({ status, label }: Props) => {
    const color: {
        [key in payment_status]:
            | "green"
            | "orange"
            | "red"
            | "yellow"
            | "amber";
    } = {
        pending: "yellow",
        paid: "green",
        canceled: "red",
    };

    const icon = {
        pending: <CgTime className="w-4 h-4 text-yellow-600" />,
        paid: <CgCheck className="w-5 h-5 text-green-600" />,
        canceled: <CgClose className="w-4 h-4 text-red-600" />,
    };

    return (
        <div className="flex items-center justify-center gap-2 min-h-[30px]">
            <Badge color={color[status] ?? "amber"}>
                <div className="flex items-center gap-1">
                    {icon[status]}
                    {label}
                </div>
            </Badge>
        </div>
    );
};

export default StatusPaidBadge;
