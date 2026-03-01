import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FySelectorProps {
  value: string;
  options: string[];
  onChange: (fy: string) => void;
  includeOpenOpps?: boolean;
  includeAll?: boolean;
}

export function FySelector({ value, options, onChange, includeOpenOpps, includeAll }: Readonly<FySelectorProps>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[140px]" data-testid="select-fy">
        <SelectValue placeholder="Select FY" />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all" data-testid="select-fy-all">All Years</SelectItem>}
        {includeOpenOpps && <SelectItem value="open_opps" data-testid="select-fy-open-opps">Open Opps</SelectItem>}
        {options.map(fy => (
          <SelectItem key={fy} value={fy} data-testid={`select-fy-${fy}`}>
            FY{fy}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
