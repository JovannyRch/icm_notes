import { useBranch as useBranchContext } from "../Contexts/BranchContext";

export function useBranch() {
    const { currentBranch, branches } = useBranchContext();

    const currentBranchData = branches.find(
        (b) => b.id === Number(currentBranch)
    );

    return {
        currentBranchId: Number(currentBranch),
        currentBranchName: currentBranchData?.name ?? "Sin sucursal",
        currentBranch: currentBranchData,
        branches,
        isMultiBranch: branches.length > 1,
    };
}
