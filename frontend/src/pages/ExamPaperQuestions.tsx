import { FileText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useExamPaperTemplates } from '@/hooks/useExamPapers';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useSubjects } from '@/hooks/useSubjects';

export default function ExamPaperQuestions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>();

  const { data: templates, isLoading } = useExamPaperTemplates({
    schoolId: profile?.default_school_id ?? undefined,
    subjectId: selectedSubjectId,
  });
  const { data: subjects } = useSubjects(organizationId);

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return templates;

    return templates.filter((template) => {
      const subjectName = subjects?.find((s) => s.id === template.subjectId)?.name ?? '';
      return (
        template.title.toLowerCase().includes(query) ||
        subjectName.toLowerCase().includes(query)
      );
    });
  }, [templates, searchQuery, subjects]);

  const getSubjectName = (subjectId: string) =>
    subjects?.find((s) => s.id === subjectId)?.name ?? '—';

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-semibold">{t('examPapers.paperQuestionsTitle')}</h1>
        <p className="text-sm text-muted-foreground hidden md:block">
          {t('examPapers.paperQuestionsDescription')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('examPapers.papersList')}</CardTitle>
          <CardDescription>{t('examPapers.paperQuestionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common.search')}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedSubjectId ?? '__all__'}
              onValueChange={(value) =>
                setSelectedSubjectId(value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder={t('examPapers.selectSubject')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('common.all')}</SelectItem>
                {subjects?.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t('examPapers.noTemplatesFound')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('examPapers.paperTitle')}</TableHead>
                    <TableHead>{t('examPapers.subject')}</TableHead>
                    <TableHead>{t('examPapers.questions')}</TableHead>
                    <TableHead>{t('examPapers.totalMarks')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const questionsCount =
                      template.itemsCount ?? template.items?.length ?? 0;
                    const totalMarks =
                      template.computedTotalMarks ?? template.totalMarks ?? 0;

                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>{getSubjectName(template.subjectId)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{questionsCount}</Badge>
                        </TableCell>
                        <TableCell>{totalMarks}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/exams/papers/${template.id}/edit`)}
                            aria-label={t('examPapers.editQuestions')}
                          >
                            <FileText className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">
                              {t('examPapers.editQuestions')}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
