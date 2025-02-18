import Container from "@/Components/Container";
import { PageProps } from "@/types";
import { Branch } from "@/types/Branch";
import { Link, Table } from "@radix-ui/themes";

interface BranchesProps extends PageProps {
    branches: Branch[];
}

const Index = ({ branches }: BranchesProps) => {
    return (
        <Container title="Sucursales">
            <>
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.ColumnHeaderCell>
                                Sucursal
                            </Table.ColumnHeaderCell>

                            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {branches.map((branch) => (
                            <Table.Row key={branch.id}>
                                <Table.Cell>{branch.name}</Table.Cell>

                                <Table.Cell>
                                    <div className="flex gap-1">
                                        <Link
                                            href={route(
                                                "branches.notes",
                                                branch.id
                                            )}
                                        >
                                            Notas
                                        </Link>
                                    </div>
                                </Table.Cell>
                            </Table.Row>
                        ))}
                    </Table.Body>
                </Table.Root>
            </>
        </Container>
    );
};

export default Index;
