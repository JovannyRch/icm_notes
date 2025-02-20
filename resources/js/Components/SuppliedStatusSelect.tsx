import { SUPPLIED_STATUS_OPTIONS } from "@/const";
import { Box, Flex } from "@radix-ui/themes";
import InputLabel from "./InputLabel";
import { FaWarehouse } from "react-icons/fa6";

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
            <Flex gap="2" align="center">
                <InputLabel
                    htmlFor="supplied_status"
                    value="Estatus por surtir"
                />
                <FaWarehouse className="w-5 h-5 text-orange-500" />
            </Flex>
            <select
                className="w-full h-10 mt-1 border border-gray-300 rounded-lg"
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
