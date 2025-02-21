import Container from "@/Components/Container";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { DataList, Link, Table } from "@radix-ui/themes";

interface BranchesProps extends PageProps {
    branches: Branch[];
}

const Index = ({ branches }: BranchesProps) => {
    return (
        <Container title="Sucursales">
            <></>
        </Container>
    );
};

export default Index;
