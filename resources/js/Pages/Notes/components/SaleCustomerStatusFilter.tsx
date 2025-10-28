import { MdPointOfSale } from "react-icons/md";
import { DropdownFilter } from "./DropdownFilter";

const PURCHASE_STATUS_VALUES = {
    paid: "Pagado",
    pending: "Pendiente de pago",
    canceled: "Cancelado",
} as const;

const SaleCustomerStatusFilter = () => (
    <DropdownFilter
        icon={<MdPointOfSale />}
        values={PURCHASE_STATUS_VALUES}
        paramKey="status"
        defaultLabel="Estatus venta cliente"
        routeName="notas"
    />
);

export default SaleCustomerStatusFilter;
