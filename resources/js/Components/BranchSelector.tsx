import { Branch } from "@/types/Branch";
import { Button, DropdownMenu } from "@radix-ui/themes";

interface BranchSelectorProps {
    branch: Branch;
    branches: Branch[];
    onChange: (branch: Branch) => void;
}

const BranchSelector = ({
    branch,
    branches,
    onChange,
}: BranchSelectorProps) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="outline" color="green">
                    {branch?.name}
                    <DropdownMenu.TriggerIcon />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                {branches?.map((b) => (
                    <DropdownMenu.Item
                        key={b.id}
                        onSelect={() => b.id !== branch.id && onChange(b)}
                    >
                        {b.name}
                    </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

export default BranchSelector;
