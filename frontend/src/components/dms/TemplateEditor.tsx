import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TemplateEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TemplateEditor({ value, onChange }: TemplateEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Body HTML</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[200px] font-mono"
        placeholder="Write letter body with placeholders"
      />
    </div>
  );
}
