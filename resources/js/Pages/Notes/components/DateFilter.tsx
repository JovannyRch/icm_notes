import { DATE_FILTERS_VALUES } from "@/const";
import { FaRegCalendarAlt } from "react-icons/fa";
import { DropdownFilter } from "../../../Components/ProductsModal/DropdownFilter/DropdownFilter";
import { useLocalStorage } from "usehooks-ts";
import { useBranch } from "@/hooks/useBranch";

const DateFilter = () => {
    const { currentBranchId } = useBranch();

    const dateParam = route().params.date as string | undefined;

    const [filterDate, setFilterDate] = useLocalStorage(
        `date-filter-${currentBranchId}`,
        "THIS_WEEK"
    );

    return (
        <DropdownFilter
            icon={<FaRegCalendarAlt />}
            values={DATE_FILTERS_VALUES}
            paramKey="date"
            defaultLabel="Fecha"
            routeName="notas"
            onSelect={(value) => {
                setFilterDate(value ?? "THIS_WEEK");
            }}
            defaultValue={dateParam ?? filterDate}
        />
    );
};

export default DateFilter;
