import InputLabel from "./InputLabel";

interface Props {
    value: string;
    onChange: (value: string) => void;
}

const UnitInput = ({ value, onChange }: Props) => {
    return (
        <div>
            <InputLabel htmlFor="unit" value="Unidad" />
            <input
                type="text"
                className=" border border-gray-300  text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5 "
                list="unit"
                name="unit"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required
            />
            <datalist id="unit">
                <option>Caja</option>
                <option>Pieza</option>
                <option>Bulto</option>
            </datalist>
        </div>
    );
};

export default UnitInput;
