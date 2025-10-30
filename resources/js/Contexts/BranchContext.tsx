import { createContext, useContext } from "react";

interface BranchContextProps {
    currentBranch: number | null;
    branches: Branch[];
}

const BranchContext = createContext<BranchContextProps>({
    currentBranch: null,
    branches: [],
});

export const useBranch = () => useContext(BranchContext);

export default BranchContext;
