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
                className="block w-full h-8 mt-1 text-sm bg-white rounded-input"
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
