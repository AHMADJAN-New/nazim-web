import { Download, Upload, Save, Search, X, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { translationsApi } from '@/lib/api/client';
import { exportTranslationsToExcel, importTranslationsFromExcel, exportTranslationsToCSV } from '@/lib/translations/importExport';
import { flattenTranslations, nestTranslations, syncMissingKeys, type TranslationRow } from '@/lib/translations/utils';
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
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set());
  const [changedKeysFromDb, setChangedKeysFromDb] = useState<Set<string>>(new Set()); // Keys from database (persistent)
  const [builtKeysFromDb, setBuiltKeysFromDb] = useState<Set<string>>(new Set()); // Keys that are built/published
  const [changedFiles, setChangedFiles] = useState<Array<{
    file_name: string;
    language: string;
    keys_changed: number;
    changed_keys: string[];
    last_modified_at: string;
    status?: string;
    built_at?: string;
  }>>([]);
  const [builtFiles, setBuiltFiles] = useState<Array<{
    file_name: string;
    language: string;
    keys_changed: number;
    changed_keys: string[];
    last_modified_at: string;
    built_at: string;
    status: string;
  }>>([]);
  const [totalKeysChanged, setTotalKeysChanged] = useState(0);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Load translations on mount
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const flattened = flattenTranslations();
        setTranslations(flattened);
        setOriginalTranslations(flattened);
        
        // After translations are loaded, fetch changed files and mark changed keys
        await fetchChangedFiles();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading translations:', error);
        toast.error('Failed to load translations');
        setIsLoading(false);
      }
    };
    
    loadTranslations();
  }, []);

  const fetchChangedFiles = async () => {
    try {
      const response = await translationsApi.getChangedFiles();
      setChangedFiles(response.changed_files || response.pending_files || []);
      setBuiltFiles((response as any).built_files || []);
      setTotalKeysChanged(response.total_keys_changed || 0);
      
      // Mark all changed keys from database as "changed" in the UI
      // These keys are changed in the database (pending build), so they should always show as green
      const dbKeys = new Set<string>();
      const builtKeys = new Set<string>();
      
      // Collect pending keys
      const pendingFiles = response.changed_files || response.pending_files || [];
      if (pendingFiles.length > 0) {
        pendingFiles.forEach((file: any) => {
          if (file.changed_keys && Array.isArray(file.changed_keys)) {
            file.changed_keys.forEach((key: string) => {
              dbKeys.add(key);
            });
          }
        });
      }
      
      // Collect built keys (these should NOT show as green)
      const builtFilesList = (response as any).built_files || [];
      if (builtFilesList.length > 0) {
        builtFilesList.forEach((file: any) => {
          if (file.changed_keys && Array.isArray(file.changed_keys)) {
            file.changed_keys.forEach((key: string) => {
              builtKeys.add(key);
            });
          }
        });
      }
      
      // Store database keys separately (these persist across saves)
      setChangedKeysFromDb(dbKeys);
      setBuiltKeysFromDb(builtKeys);
      
      // Always include database keys (pending) - they represent saved changes that haven't been built yet
      // Exclude built keys - they're already published
      // Merge with existing changedKeys (from current session) to preserve unsaved changes
      setChangedKeys((prev) => {
        const merged = new Set(dbKeys); // Start with pending database keys
        prev.forEach((key) => {
          // Only add if not built
          if (!builtKeys.has(key)) {
            merged.add(key);
          }
        });
        // Remove any built keys
        builtKeys.forEach((key) => merged.delete(key));
        return merged;
      });
    } catch (error) {
      console.error('Failed to fetch changed files:', error);
    }
  };

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
    const row = filteredTranslations[editingCell.row];
    const originalIndex = translations.findIndex(t => t.key === row.key);
    const originalRow = originalTranslations.find(t => t.key === row.key);
    
    if (originalIndex !== -1) {
      const newValue = editValue.trim();
      const oldValue = (originalRow?.[editingCell.col as keyof TranslationRow] as string || '').trim();
      
      // Update the translation first
      newTranslations[originalIndex] = {
        ...newTranslations[originalIndex],
        [editingCell.col]: newValue,
      };
      
      // Track if this key changed - check after update
      // Note: Don't remove keys that are in the database (changedKeysFromDb) - they should always stay marked
      const newChangedKeys = new Set(changedKeys);
      const isInDatabase = changedKeysFromDb.has(row.key);
      
      if (newValue !== oldValue) {
        // Value changed - mark as changed
        newChangedKeys.add(row.key);
      } else {
        // Value matches original - check if all values match original (after update)
        const allMatch = ['en', 'ps', 'fa', 'ar'].every(lang => {
          const currentValue = (newTranslations[originalIndex][lang as keyof TranslationRow] as string || '').trim();
          const origValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
          return currentValue === origValue;
        });
        if (allMatch && !isInDatabase) {
          // All values match original AND not in database - remove from changed keys
          newChangedKeys.delete(row.key);
        } else if (!allMatch) {
          // Some other language has changes - keep in changed keys
          newChangedKeys.add(row.key);
        }
        // If isInDatabase is true, keep the key even if all values match (it's saved but not built yet)
      }
      
      setTranslations(newTranslations);
      setChangedKeys(newChangedKeys);
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
  const handleExportExcel = async () => {
    try {
      await exportTranslationsToExcel();
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
      
      // Update changedKeys to track imported changes
      const newChangedKeys = new Set<string>();
      merged.forEach(row => {
        const originalRow = originalTranslations.find(t => t.key === row.key);
        if (originalRow) {
          // Check if any language differs from original
          const hasChanges = ['en', 'ps', 'fa', 'ar'].some(lang => {
            const currentValue = row[lang as keyof TranslationRow] as string || '';
            const origValue = originalRow[lang as keyof TranslationRow] as string || '';
            return currentValue !== origValue;
          });
          if (hasChanges) {
            newChangedKeys.add(row.key);
          }
        } else {
          // New key, mark as changed
          newChangedKeys.add(row.key);
        }
      });
      
      setTranslations(merged.sort((a, b) => a.key.localeCompare(b.key)));
      setChangedKeys(newChangedKeys);
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
    setChangedKeys(new Set());
    setHasChanges(false);
    toast.info('Changes reset');
  };

  // Mark files as published (built)
  const handleMarkAsPublished = async (fileNames?: string[], markAll: boolean = false) => {
    try {
      setIsSaving(true);
      await translationsApi.markAsBuilt(fileNames, markAll);
      toast.success(markAll ? 'All files marked as published' : `${fileNames?.length || 0} file(s) marked as published`);
      await fetchChangedFiles(); // Refresh the list
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to mark files as published';
      toast.error(errorMessage);
      console.error('Failed to mark files as published:', error);
    } finally {
      setIsSaving(false);
    }
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

  // Save translations to files via API (incremental - only changed keys)
  const handleSave = async () => {
    if (!hasChanges || changedKeys.size === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      // Build array of only changed translations
      const changes: Array<{ key: string; lang: string; value: string }> = [];
      
      for (const key of changedKeys) {
        const currentRow = translations.find(t => t.key === key);
        const originalRow = originalTranslations.find(t => t.key === key);
        
        if (currentRow && originalRow) {
          // Check each language for changes
          for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
            const currentValue = currentRow[lang] || '';
            const originalValue = originalRow[lang] || '';
            
            if (currentValue !== originalValue) {
              changes.push({
                key,
                lang,
                value: currentValue
              });
            }
          }
        }
      }
      
      if (changes.length === 0) {
        toast.info('No changes to save');
        setIsSaving(false);
        return;
      }
      
      // Send only changes to backend
      await translationsApi.saveChanges(changes);

      // Update original translations to reflect saved state
      setOriginalTranslations([...translations]);
      
      // Refresh changed files list first (this will repopulate changedKeys from database)
      await fetchChangedFiles();
      
      // Note: Don't clear changedKeys here - fetchChangedFiles will repopulate them
      // with keys from the database, so saved keys will still show as "changed" 
      // until they're built
      setHasChanges(false);
      
      toast.success(`Saved ${changes.length} translation change(s) successfully`);
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
        // New keys added - mark them as changed
        const newChangedKeys = new Set(changedKeys);
        synced.forEach(row => {
          const existing = translations.find(t => t.key === row.key);
          if (!existing) {
            newChangedKeys.add(row.key);
          }
        });
        setTranslations(synced);
        setOriginalTranslations(synced);
        setChangedKeys(newChangedKeys);
        toast.success(`Added ${missingCount} missing translation key(s). English text used as placeholder.`);
      } else {
        // Check if any existing keys have missing translations
        let filledCount = 0;
        const newChangedKeys = new Set(changedKeys);
        const updated = translations.map(row => {
          const syncedRow = synced.find(s => s.key === row.key);
          if (syncedRow) {
            const updatedRow = { ...row };
            let rowChanged = false;
            if (!row.ps && syncedRow.ps) {
              updatedRow.ps = syncedRow.ps;
              filledCount++;
              rowChanged = true;
            }
            if (!row.fa && syncedRow.fa) {
              updatedRow.fa = syncedRow.fa;
              filledCount++;
              rowChanged = true;
            }
            if (!row.ar && syncedRow.ar) {
              updatedRow.ar = syncedRow.ar;
              filledCount++;
              rowChanged = true;
            }
            if (rowChanged) {
              newChangedKeys.add(row.key);
            }
            return updatedRow;
          }
          return row;
        });
        
        if (filledCount > 0) {
          setTranslations(updated);
          setChangedKeys(newChangedKeys);
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
                    {isSaving ? 'Saving...' : `Save Changes (${changedKeys.size} keys)`}
                  </Button>
                  <Badge variant="destructive" className="ml-2">
                    {changedKeys.size} Unsaved Change{changedKeys.size !== 1 ? 's' : ''}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Changed Files Status */}
          <div className="mb-4 space-y-4">
            {/* Pending Files */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Pending Build</h3>
                <div className="flex items-center gap-2">
                  {changedFiles.length > 0 && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                      {changedFiles.length} file(s) pending
                    </Badge>
                  )}
                  {changedFiles.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsPublished(undefined, true)}
                      disabled={isSaving}
                      className="h-7 text-xs"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Mark All as Published
                    </Button>
                  )}
                </div>
              </div>
              
              {changedFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files pending build</p>
              ) : (
                <div className="space-y-2">
                  {changedFiles.map((file) => (
                    <div 
                      key={file.file_name} 
                      className="flex items-center justify-between p-2 bg-background rounded border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="font-mono text-sm">{file.file_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {file.keys_changed} key(s) changed
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {new Date(file.last_modified_at).toLocaleString()}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsPublished([file.file_name], false)}
                          disabled={isSaving}
                          className="h-7 text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Mark as Published
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Total: {totalKeysChanged} translation key(s) changed across {changedFiles.length} file(s)
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ These changes will be included in the next daily build
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Built/Published Files */}
            {builtFiles.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Published Files</h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                    {builtFiles.length} file(s) published
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {builtFiles.map((file) => (
                    <div 
                      key={file.file_name} 
                      className="flex items-center justify-between p-2 bg-background rounded border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-mono text-sm">{file.file_name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {file.keys_changed} key(s)
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Published: {new Date(file.built_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                      const isChanged = changedKeys.has(row.key);
                      const isPublished = builtKeysFromDb.has(row.key);
                      
                      return (
                        <TableRow 
                          key={row.key} 
                          className={cn(
                            "hover:bg-muted/30",
                            isPublished && "bg-blue-50 dark:bg-blue-950/20 border-l-4 border-l-blue-500",
                            isChanged && !isPublished && "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500"
                          )}
                        >
                          <TableCell className="font-mono text-sm bg-muted/30 sticky left-0 z-0">
                            <div className="flex items-center gap-2">
                              {row.key}
                              {isPublished && (
                                <Badge variant="outline" className="bg-blue-500 text-white border-blue-600 text-xs">
                                  Published
                                </Badge>
                              )}
                              {isChanged && !isPublished && (
                                <Badge variant="outline" className="bg-green-500 text-white border-green-600 text-xs">
                                  Changed
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          {(['en', 'ps', 'fa', 'ar'] as const).map((lang) => {
                            const originalRow = originalTranslations.find(t => t.key === row.key);
                            const isLangChanged = isChanged && !isPublished && 
                              (row[lang] !== (originalRow?.[lang] || ''));
                            
                            return (
                              <TableCell
                                key={lang}
                                className={cn(
                                  "cursor-pointer hover:bg-muted/50 min-w-[200px] p-0",
                                  isPublished && "bg-blue-100 dark:bg-blue-900/30",
                                  isLangChanged && !isPublished && "bg-green-100 dark:bg-green-900/30"
                                )}
                                onClick={() => handleCellClick(rowIndex, lang)}
                              >
                                {editingCell?.row === absoluteIndex && editingCell?.col === lang ? (
                                  <div className="p-2">
                                    <Textarea
                                      ref={editInputRef}
                                      value={editValue}
                                      onChange={(e) => {
                                        setEditValue(e.target.value);
                                        // Update changedKeys in real-time as user types
                                        const originalRow = originalTranslations.find(t => t.key === row.key);
                                        const currentRow = translations.find(t => t.key === row.key);
                                        const newValue = e.target.value.trim();
                                        const oldValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
                                        const isInDatabase = changedKeysFromDb.has(row.key);
                                        
                                        const newChangedKeys = new Set(changedKeys);
                                        
                                        // Check if the edited value differs from original
                                        if (newValue !== oldValue) {
                                          // Value changed - mark as changed
                                          newChangedKeys.add(row.key);
                                        } else {
                                          // Value matches original - check if all other values also match
                                          const allMatch = ['en', 'ps', 'fa', 'ar'].every(l => {
                                            const origVal = (originalRow?.[l as keyof TranslationRow] as string || '').trim();
                                            // For the language being edited, use the new value (which matches original)
                                            if (l === lang) {
                                              return true; // Already checked above
                                            }
                                            // For other languages, check current value
                                            const currentVal = (currentRow?.[l as keyof TranslationRow] as string || '').trim();
                                            return currentVal === origVal;
                                          });
                                          if (allMatch && !isInDatabase) {
                                            // All values match original AND not in database - remove from changed keys
                                            newChangedKeys.delete(row.key);
                                          } else if (!allMatch) {
                                            // Some other language has changes - keep in changed keys
                                            newChangedKeys.add(row.key);
                                          }
                                          // If isInDatabase is true, keep the key even if all values match (it's saved but not built yet)
                                        }
                                        setChangedKeys(newChangedKeys);
                                      }}
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
                            );
                          })}
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
                    {t('library.showing') || 'Showing'} {from} {t('events.to') || 'to'} {to} {t('events.of') || 'of'}{' '}
                    {filteredTranslations.length} {t('pagination.entries') || 'entries'}
                    {search && (
                      <span className="ml-2">
                        ({t('pagination.filtered') || 'filtered'} {t('events.from') || 'from'} {translations.length} {t('events.total') || 'total'})
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

