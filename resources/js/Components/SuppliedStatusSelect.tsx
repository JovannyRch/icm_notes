import { SUPPLIED_STATUS_OPTIONS } from "@/const";
import { Box, Flex } from "@radix-ui/themes";
import InputLabel from "./InputLabel";
import { FaTruckPickup } from "react-icons/fa6";

interface SuppliedStatusSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export const SuppliedStatusSelect = ({
    value,
    onChange,
}: SuppliedStatusSelectProps) => {
    return (
        <Box className="w-full">
            <Flex gap="2" align="center" className="pl-2">
                <InputLabel
                    htmlFor="supplied_status"
                    value="Estatus por surtir"
                />
                <FaTruckPickup className="w-4 h-4 text-fog" />
            </Flex>
            <select
                className="block w-full h-9 mt-1 text-sm bg-white"
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
            >
                {SUPPLIED_STATUS_OPTIONS.map((group) => (
                    <option key={group.value} value={group.value}>
                        {group.label}
                    </option>
                ))}
            </select>
        </Box>
    );
};
