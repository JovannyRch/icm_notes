import { BiPackage } from "react-icons/bi";
import { DropdownFilter } from "../../../Components/ProductsModal/DropdownFilter/DropdownFilter";
import { DELIVERY_STATUS_MAP } from "@/const";

const DeliveryStatusFilter = () => (
    <DropdownFilter
        icon={<BiPackage />}
        values={DELIVERY_STATUS_MAP}
        paramKey="delivery_status"
        defaultLabel="Estatus de entrega"
        routeName="notas"
    />
);

export default DeliveryStatusFilter;
