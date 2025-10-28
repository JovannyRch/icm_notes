import { DATE_FILTERS_VALUES } from "@/const";
import { FaRegCalendarAlt } from "react-icons/fa";
import { DropdownFilter } from "./DropdownFilter";
import { useLocalStorage } from "usehooks-ts";

const DateFilter = () => {
    const branchId = route().params.branch;
    const [filterDate, setFilterDate] = useLocalStorage(
        `date-filter-${branchId}`,
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
            defaultValue={filterDate}
        />
    );
};

export default DateFilter;
