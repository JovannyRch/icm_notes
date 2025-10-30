import { MdPointOfSale } from "react-icons/md";
import { DropdownFilter } from "../../../Components/ProductsModal/DropdownFilter/DropdownFilter";

const PURCHASE_STATUS_VALUES = {
    paid: "Pagado",
    pending: "Pendiente",
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
