import { DropdownFilter } from "../../../Components/ProductsModal/DropdownFilter/DropdownFilter";
import { MdShoppingCart } from "react-icons/md";

const PURCHASE_STATUS_VALUES = {
    paid: "Costo pagado",
    pending: "Costo pendiente",
} as const;

const PurchaseStatusFilter = () => (
    <DropdownFilter
        icon={<MdShoppingCart />}
        values={PURCHASE_STATUS_VALUES}
        paramKey="purchase_status"
        defaultLabel="Estatus de compra"
        routeName="notas"
    />
);

export default PurchaseStatusFilter;
