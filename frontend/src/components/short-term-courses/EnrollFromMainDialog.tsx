import { useState, useMemo, memo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useStudents } from '@/hooks/useStudents';
import { useEnrollFromMain } from '@/hooks/useCourseStudents';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';
import { Search, UserPlus } from 'lucide-react';

interface EnrollFromMainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: ShortTermCourse;
  onSuccess?: () => void;
}

export const EnrollFromMainDialog = memo(function EnrollFromMainDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: EnrollFromMainDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [registrationDate, setRegistrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [feePaid, setFeePaid] = useState(false);

  const { data: students, isLoading } = useStudents();
  const enrollMutation = useEnrollFromMain();

  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    const searchLower = search.toLowerCase();
    return students.filter((s) =>
      s.full_name?.toLowerCase().includes(searchLower) ||
      s.admission_no?.toLowerCase().includes(searchLower) ||
      s.father_name?.toLowerCase().includes(searchLower)
    );
  }, [students, search]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleEnroll = async () => {
    if (selectedIds.length === 0) return;

    await enrollMutation.mutateAsync({
      course_id: course.id,
      main_student_ids: selectedIds,
      registration_date: registrationDate,
      fee_paid: feePaid,
      fee_amount: course.feeAmount ?? undefined,
    });

    setSelectedIds([]);
    setSearch('');
    onSuccess?.();
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds([]);
    setSearch('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Enroll Students from Main Database
          </DialogTitle>
          <DialogDescription>
            Select students from the main database to enroll in <strong>{course.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registrationDate">Registration Date</Label>
              <Input
                id="registrationDate"
                type="date"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="feePaid"
                checked={feePaid}
                onCheckedChange={(checked) => setFeePaid(checked === true)}
              />
              <Label htmlFor="feePaid" className="cursor-pointer">
                Mark fee as paid {course.feeAmount ? `(${course.feeAmount})` : ''}
              </Label>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or admission number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{selectedIds.length} student(s) selected</span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              {selectedIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-4 space-y-2">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {search ? 'No students match your search' : 'No students available'}
                  </p>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedIds.includes(student.id)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggle(student.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(student.id)}
                        onCheckedChange={() => handleToggle(student.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {student.father_name && `S/O ${student.father_name}`}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {student.admission_no || 'No ID'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={selectedIds.length === 0 || enrollMutation.isPending}
          >
            {enrollMutation.isPending
              ? 'Enrolling...'
              : `Enroll ${selectedIds.length} Student${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EnrollFromMainDialog;
