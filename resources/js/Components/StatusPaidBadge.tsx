import { payment_status } from "@/types";
import StatusPill, { StatusTone } from "./StatusPill";

interface Props {
    status: payment_status;
    label: string;
}

const tone: Record<payment_status, StatusTone> = {
    pending: "amber",
    paid: "green",
    canceled: "red",
};

const StatusPaidBadge = ({ status, label }: Props) => (
    <div className="flex items-center justify-center min-h-[30px]">
        <StatusPill tone={tone[status] ?? "gray"}>{label}</StatusPill>
    </div>
);

export default StatusPaidBadge;
