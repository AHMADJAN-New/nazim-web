import { CreditCard, Printer, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { IdCardHistory } from '@/types/domain/studentHistory';

interface IdCardsSectionProps {
  idCards: IdCardHistory;
}

export function IdCardsSection({ idCards }: IdCardsSectionProps) {
  const { t } = useLanguage();
  const { summary, cards } = idCards;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{summary.totalCards}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.totalCards') || 'Total Cards'}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.printedCards}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.printed') || 'Printed'}</p>
              </div>
              <Printer className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{summary.unprintedCards}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.pendingPrint') || 'Pending Print'}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.feePaidCards}</p>
                <p className="text-sm text-muted-foreground">{t('studentHistory.feePaid') || 'Fee Paid'}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ID Cards List */}
      {cards.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('studentHistory.idCardHistory') || 'ID Card History'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('studentHistory.cardNumber') || 'Card Number'}</TableHead>
                    <TableHead>{t('studentHistory.academicYear') || 'Academic Year'}</TableHead>
                    <TableHead>{t('studentHistory.class') || 'Class'}</TableHead>
                    <TableHead>{t('studentHistory.template') || 'Template'}</TableHead>
                    <TableHead>{t('studentHistory.printStatus') || 'Print Status'}</TableHead>
                    <TableHead>{t('studentHistory.feeStatus') || 'Fee Status'}</TableHead>
                    <TableHead>{t('studentHistory.issuedDate') || 'Issued Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium font-mono">{card.cardNumber || '-'}</TableCell>
                      <TableCell>{card.academicYear?.name || '-'}</TableCell>
                      <TableCell>{card.class?.name || '-'}</TableCell>
                      <TableCell>{card.template?.name || '-'}</TableCell>
                      <TableCell>
                        {card.isPrinted ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Badge variant="default">{t('studentHistory.printed') || 'Printed'}</Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <Badge variant="secondary">{t('studentHistory.pending') || 'Pending'}</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {card.cardFeePaid ? (
                          <Badge variant="default">{t('studentHistory.paid') || 'Paid'}</Badge>
                        ) : (
                          <Badge variant="outline">{t('studentHistory.unpaid') || 'Unpaid'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {card.createdAt ? formatDate(card.createdAt) : '-'}
                        {card.printedAt && (
                          <p className="text-xs text-muted-foreground">
                            {t('studentHistory.printedOn') || 'Printed'}: {formatDate(card.printedAt)}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('studentHistory.noIdCardRecords') || 'No ID card records found'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

