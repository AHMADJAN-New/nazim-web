import { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Upload, Save, Search, X, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { flattenTranslations, nestTranslations, syncMissingKeys, type TranslationRow } from '@/lib/translations/utils';
import { exportTranslationsToExcel, importTranslationsFromExcel, exportTranslationsToCSV } from '@/lib/translations/importExport';
import { translationsApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

// Page size options for translations table
const TRANSLATION_PAGE_SIZE_OPTIONS = [100, 150, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 100;

export default function TranslationEditor() {
  const { t, isRTL } = useLanguage();
  const [translations, setTranslations] = useState<TranslationRow[]>([]);
  const [originalTranslations, setOriginalTranslations] = useState<TranslationRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Load translations on mount
  useEffect(() => {
    try {
      const flattened = flattenTranslations();
      setTranslations(flattened);
      setOriginalTranslations(flattened);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast.error('Failed to load translations');
      setIsLoading(false);
    }
  }, []);

  // Filter translations
  const filteredTranslations = useMemo(() => {
    if (!search.trim()) return translations;
    const term = search.toLowerCase();
    return translations.filter(t => 
      t.key.toLowerCase().includes(term) ||
      t.en.toLowerCase().includes(term) ||
      t.ps.toLowerCase().includes(term) ||
      t.fa.toLowerCase().includes(term) ||
      t.ar.toLowerCase().includes(term)
    );
  }, [translations, search]);

  // Paginate filtered translations
  const paginatedTranslations = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTranslations.slice(startIndex, endIndex);
  }, [filteredTranslations, page, pageSize]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(filteredTranslations.length / pageSize);
  const from = filteredTranslations.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, filteredTranslations.length);

  // Reset to first page when search changes or page size changes
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(translations) !== JSON.stringify(originalTranslations);
    setHasChanges(changed);
  }, [translations, originalTranslations]);

  // Handle cell edit
  const handleCellClick = (rowIndex: number, col: string) => {
    // rowIndex is relative to paginated data, convert to absolute index in filteredTranslations
    const absoluteIndex = (page - 1) * pageSize + rowIndex;
    const row = filteredTranslations[absoluteIndex];
    setEditingCell({ row: absoluteIndex, col });
    setEditValue(row[col as keyof TranslationRow] as string);
    
    // Focus input after state update
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  // Save cell edit
  const handleCellSave = () => {
    if (!editingCell) return;
    
    const newTranslations = [...translations];
    const originalIndex = translations.findIndex(t => t.key === filteredTranslations[editingCell.row].key);
    
    if (originalIndex !== -1) {
      newTranslations[originalIndex] = {
        ...newTranslations[originalIndex],
        [editingCell.col]: editValue,
      };
      setTranslations(newTranslations);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  // Cancel cell edit
  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      exportTranslationsToExcel();
      toast.success('Translations exported to Excel');
    } catch (error) {
      toast.error('Failed to export translations');
      console.error(error);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    try {
      exportTranslationsToCSV();
      toast.success('Translations exported to CSV');
    } catch (error) {
      toast.error('Failed to export translations');
      console.error(error);
    }
  };

  // Import from Excel
  const handleImportExcel = async () => {
    if (!importFile) return;
    
    try {
      const imported = await importTranslationsFromExcel(importFile);
      
      // Merge with existing translations (keep existing keys, update with imported values)
      const existingKeys = new Set(translations.map(t => t.key));
      const importedMap = new Map(imported.map(t => [t.key, t]));
      
      const merged = translations.map(t => {
        const importedRow = importedMap.get(t.key);
        if (importedRow) {
          return {
            key: t.key,
            en: importedRow.en || t.en,
            ps: importedRow.ps || t.ps,
            fa: importedRow.fa || t.fa,
            ar: importedRow.ar || t.ar,
          };
        }
        return t;
      });
      
      // Add any new keys from imported file
      for (const importedRow of imported) {
        if (!existingKeys.has(importedRow.key)) {
          merged.push(importedRow);
        }
      }
      
      setTranslations(merged.sort((a, b) => a.key.localeCompare(b.key)));
      setShowImportDialog(false);
      setImportFile(null);
      toast.success('Translations imported successfully');
    } catch (error) {
      toast.error('Failed to import translations. Please check the file format.');
      console.error(error);
    }
  };

  // Reset changes
  const handleReset = () => {
    setTranslations([...originalTranslations]);
    setHasChanges(false);
    toast.info('Changes reset');
  };

  // Copy translations as JSON for manual file update
  const handleCopyJSON = () => {
    const nested = nestTranslations(translations);
    const jsonString = JSON.stringify(nested, null, 2);
    
    // Copy to clipboard
    navigator.clipboard.writeText(jsonString).then(() => {
      toast.success('Translations copied to clipboard as JSON. You can paste this into the translation files.');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  // Download as JSON file
  const handleDownloadJSON = () => {
    const nested = nestTranslations(translations);
    const jsonString = JSON.stringify(nested, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `translations_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Translations downloaded as JSON');
  };

  // Save translations to files via API
  const handleSave = async () => {
    if (!hasChanges) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const nested = nestTranslations(translations);
      
      await translationsApi.save({
        en: nested.en as Record<string, unknown>,
        ps: nested.ps as Record<string, unknown>,
        fa: nested.fa as Record<string, unknown>,
        ar: nested.ar as Record<string, unknown>,
      });

      // Update original translations to reflect saved state
      setOriginalTranslations([...translations]);
      setHasChanges(false);
      toast.success('Translations saved successfully to files');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save translations';
      toast.error(errorMessage);
      console.error('Failed to save translations:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Sync missing keys - add missing translation keys to all languages
  const handleSyncMissingKeys = () => {
    try {
      const synced = syncMissingKeys();
      const missingCount = synced.length - translations.length;
      
      if (missingCount > 0) {
        setTranslations(synced);
        setOriginalTranslations(synced);
        toast.success(`Added ${missingCount} missing translation key(s). English text used as placeholder.`);
      } else {
        // Check if any existing keys have missing translations
        let filledCount = 0;
        const updated = translations.map(row => {
          const syncedRow = synced.find(s => s.key === row.key);
          if (syncedRow) {
            const updatedRow = { ...row };
            if (!row.ps && syncedRow.ps) {
              updatedRow.ps = syncedRow.ps;
              filledCount++;
            }
            if (!row.fa && syncedRow.fa) {
              updatedRow.fa = syncedRow.fa;
              filledCount++;
            }
            if (!row.ar && syncedRow.ar) {
              updatedRow.ar = syncedRow.ar;
              filledCount++;
            }
            return updatedRow;
          }
          return row;
        });
        
        if (filledCount > 0) {
          setTranslations(updated);
          toast.success(`Filled ${filledCount} missing translation(s) with English text.`);
        } else {
          toast.info('All translation keys are already synced!');
        }
      }
    } catch (error) {
      toast.error('Failed to sync missing keys');
      console.error('Error syncing missing keys:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-[1800px]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Translation Editor
              </CardTitle>
              <CardDescription>
                Edit translations in an Excel-like interface. Click any cell to edit. Changes are saved locally until you export.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyJSON}>
                <FileText className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSyncMissingKeys}
                title="Add missing translation keys to all language files (uses English as placeholder)"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Missing Keys
              </Button>
              {hasChanges && (
                <>
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Badge variant="destructive" className="ml-2">
                    Unsaved Changes
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search translations by key or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 border-b">
                  <TableRow>
                    <TableHead className="w-[300px] font-semibold bg-muted/50">Translation Key</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">English (en)</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Pashto (ps)</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Farsi (fa)</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Arabic (ar)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTranslations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No translations found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTranslations.map((row, rowIndex) => {
                      // Calculate absolute index for editing cell comparison
                      const absoluteIndex = (page - 1) * pageSize + rowIndex;
                      return (
                        <TableRow key={row.key} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-sm bg-muted/30 sticky left-0 z-0">
                            {row.key}
                          </TableCell>
                          {(['en', 'ps', 'fa', 'ar'] as const).map((lang) => (
                            <TableCell
                              key={lang}
                              className="cursor-pointer hover:bg-muted/50 min-w-[200px] p-0"
                              onClick={() => handleCellClick(rowIndex, lang)}
                            >
                              {editingCell?.row === absoluteIndex && editingCell?.col === lang ? (
                                <div className="p-2">
                                  <Textarea
                                    ref={editInputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        handleCellSave();
                                      }
                                      if (e.key === 'Escape') {
                                        e.preventDefault();
                                        handleCellCancel();
                                      }
                                    }}
                                    className="min-h-[80px] resize-none"
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                    <span>Press Ctrl+Enter to save, Esc to cancel</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-2 px-3 min-h-[40px] whitespace-pre-wrap break-words">
                                  {row[lang] || <span className="text-muted-foreground italic">Empty</span>}
                                </div>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className={cn('mt-4 space-y-4', isRTL && 'rtl')}>
            {/* Total count and page size selector */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredTranslations.length > 0 ? (
                  <>
                    {t('pagination.showing') || 'Showing'} {from} {t('pagination.to') || 'to'} {to} {t('pagination.of') || 'of'}{' '}
                    {filteredTranslations.length} {t('pagination.entries') || 'entries'}
                    {search && (
                      <span className="ml-2">
                        ({t('pagination.filtered') || 'filtered'} {t('pagination.from') || 'from'} {translations.length} {t('pagination.total') || 'total'})
                      </span>
                    )}
                  </>
                ) : (
                  <>{t('pagination.noEntries') || 'No entries'}</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('pagination.rowsPerPage') || 'Rows per page'}:
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATION_PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pagination buttons */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) {
                          setPage(page - 1);
                        }
                      }}
                      className={cn(
                        page <= 1 && 'pointer-events-none opacity-50',
                        'cursor-pointer'
                      )}
                      aria-disabled={page <= 1}
                      href="#"
                    />
                  </PaginationItem>

                  {(() => {
                    const pages: (number | 'ellipsis')[] = [];
                    const maxVisible = 7;

                    if (totalPages <= maxVisible) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);

                      let start = Math.max(2, page - 1);
                      let end = Math.min(totalPages - 1, page + 1);

                      if (page <= 3) {
                        start = 2;
                        end = 4;
                      }

                      if (page >= totalPages - 2) {
                        start = totalPages - 3;
                        end = totalPages - 1;
                      }

                      if (start > 2) {
                        pages.push('ellipsis');
                      }

                      for (let i = start; i <= end; i++) {
                        pages.push(i);
                      }

                      if (end < totalPages - 1) {
                        pages.push('ellipsis');
                      }

                      pages.push(totalPages);
                    }

                    return pages.map((pageNum, index) => {
                      if (pageNum === 'ellipsis') {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }

                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(pageNum);
                            }}
                            isActive={pageNum === page}
                            className="cursor-pointer"
                            href="#"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    });
                  })()}

                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) {
                          setPage(page + 1);
                        }
                      }}
                      className={cn(
                        page >= totalPages && 'pointer-events-none opacity-50',
                        'cursor-pointer'
                      )}
                      aria-disabled={page >= totalPages}
                      href="#"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}

            {/* Unsaved changes warning */}
            {hasChanges && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ You have unsaved changes. Export or copy JSON to save your work.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Translations from Excel</DialogTitle>
            <DialogDescription>
              Select an Excel file (.xlsx) exported from this editor. The file must have columns: key, en, ps, fa, ar.
              Imported translations will be merged with existing ones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Excel File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {importFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImportExcel} disabled={!importFile}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

