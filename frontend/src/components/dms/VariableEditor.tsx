import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { TemplateVariable } from "@/types/dms";

interface VariableEditorProps {
  variables: TemplateVariable[];
  onChange: (variables: TemplateVariable[]) => void;
}

export function VariableEditor({ variables, onChange }: VariableEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVariable, setNewVariable] = useState<Partial<TemplateVariable>>({
    name: "",
    label: "",
    type: "text",
    default: "",
    required: false,
    description: "",
  });

  const handleAdd = () => {
    if (!newVariable.name?.trim()) return;

    const variable: TemplateVariable = {
      name: newVariable.name.trim(),
      label: newVariable.label?.trim() || newVariable.name.trim(),
      type: newVariable.type || "text",
      default: newVariable.default?.trim() || "",
      required: newVariable.required || false,
      description: newVariable.description?.trim() || "",
    };

    onChange([...variables, variable]);
    setNewVariable({
      name: "",
      label: "",
      type: "text",
      default: "",
      required: false,
      description: "",
    });
  };

  const handleUpdate = (index: number, updates: Partial<TemplateVariable>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Template Variables</Label>
        <span className="text-sm text-muted-foreground">
          Use {"{{variable_name}}"} in your template body
        </span>
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        {variables.map((variable, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              {editingIndex === index ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label htmlFor={`var-name-${index}`}>Variable Name *</Label>
                      <Input
                        id={`var-name-${index}`}
                        value={variable.name}
                        onChange={(e) =>
                          handleUpdate(index, { name: e.target.value })
                        }
                        placeholder="student_name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`var-label-${index}`}>Label</Label>
                      <Input
                        id={`var-label-${index}`}
                        value={variable.label || ""}
                        onChange={(e) =>
                          handleUpdate(index, { label: e.target.value })
                        }
                        placeholder="Student Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`var-type-${index}`}>Type</Label>
                      <Select
                        value={variable.type || "text"}
                        onValueChange={(value: TemplateVariable["type"]) =>
                          handleUpdate(index, { type: value })
                        }
                      >
                        <SelectTrigger id={`var-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`var-default-${index}`}>Default Value</Label>
                      <Input
                        id={`var-default-${index}`}
                        value={variable.default || ""}
                        onChange={(e) =>
                          handleUpdate(index, { default: e.target.value })
                        }
                        placeholder="Optional default value"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`var-desc-${index}`}>Description</Label>
                    <Textarea
                      id={`var-desc-${index}`}
                      value={variable.description || ""}
                      onChange={(e) =>
                        handleUpdate(index, { description: e.target.value })
                      }
                      placeholder="Variable description"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelEdit}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {"{{" + variable.name + "}}"}
                      </code>
                      {variable.label && (
                        <span className="text-sm text-muted-foreground">
                          ({variable.label})
                        </span>
                      )}
                      {variable.type && variable.type !== "text" && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {variable.type}
                        </span>
                      )}
                      {variable.required && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    {variable.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {variable.description}
                      </p>
                    )}
                    {variable.default && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Default: {variable.default}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add New Variable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Variable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="new-var-name">Variable Name *</Label>
              <Input
                id="new-var-name"
                value={newVariable.name || ""}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, name: e.target.value })
                }
                placeholder="student_name"
              />
            </div>
            <div>
              <Label htmlFor="new-var-label">Label</Label>
              <Input
                id="new-var-label"
                value={newVariable.label || ""}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, label: e.target.value })
                }
                placeholder="Student Name"
              />
            </div>
            <div>
              <Label htmlFor="new-var-type">Type</Label>
              <Select
                value={newVariable.type || "text"}
                onValueChange={(value: TemplateVariable["type"]) =>
                  setNewVariable({ ...newVariable, type: value })
                }
              >
                <SelectTrigger id="new-var-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-var-default">Default Value</Label>
              <Input
                id="new-var-default"
                value={newVariable.default || ""}
                onChange={(e) =>
                  setNewVariable({ ...newVariable, default: e.target.value })
                }
                placeholder="Optional default value"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="new-var-desc">Description</Label>
            <Textarea
              id="new-var-desc"
              value={newVariable.description || ""}
              onChange={(e) =>
                setNewVariable({ ...newVariable, description: e.target.value })
              }
              placeholder="Variable description"
              rows={2}
            />
          </div>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!newVariable.name?.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Variable
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

