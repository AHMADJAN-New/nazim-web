import { useQuery } from '@tanstack/react-query';
import { Download, Upload, Save, Search, X, FileText, RefreshCw, CheckCircle2, Languages, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

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
import { showToast } from '@/lib/toast';
import { exportTranslationsToExcel, importTranslationsFromExcel, exportTranslationsToCSV } from '@/lib/translations/importExport';
import { flattenTranslations, nestTranslations, syncMissingKeys, type TranslationRow } from '@/lib/translations/utils';
import { cn } from '@/lib/utils';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';


// Page size options for translations table
const TRANSLATION_PAGE_SIZE_OPTIONS = [100, 150, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 100;

export default function TranslationsManagement() {
  const { t, isRTL } = useLanguage();
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

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
  const [changedKeysFromDb, setChangedKeysFromDb] = useState<Set<string>>(new Set());
  const [builtKeysFromDb, setBuiltKeysFromDb] = useState<Set<string>>(new Set());
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
  const [showPublishedDialog, setShowPublishedDialog] = useState(false);
  const [expandedPublishedKeys, setExpandedPublishedKeys] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Load translations on mount
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const flattened = flattenTranslations();
        setTranslations(flattened);
        setOriginalTranslations(flattened);
        
        await fetchChangedFiles();
        
        setIsLoading(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error loading translations:', error);
        }
        showToast.error('Failed to load translations');
        setIsLoading(false);
      }
    };
    
    if (!permissionsLoading && hasAdminPermission) {
      loadTranslations();
    }
  }, [permissionsLoading, hasAdminPermission]);

  const fetchChangedFiles = async () => {
    try {
      const response = await translationsApi.getChangedFiles();
      setChangedFiles(response.changed_files || response.pending_files || []);
      setBuiltFiles((response as any).built_files || []);
      setTotalKeysChanged(response.total_keys_changed || 0);
      
      const dbKeys = new Set<string>();
      const builtKeys = new Set<string>();
      
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
      
      setChangedKeysFromDb(dbKeys);
      setBuiltKeysFromDb(builtKeys);
      
      // Merge changed keys: include pending keys, exclude built keys that are not in pending
      setChangedKeys((prev) => {
        const merged = new Set(dbKeys); // Start with pending keys from DB
        prev.forEach((key) => {
          // Only add if it's not built (or if it was built but is now pending again)
          if (!builtKeys.has(key) || dbKeys.has(key)) {
            merged.add(key);
          }
        });
        // Remove keys that are built and not in pending
        builtKeys.forEach((key) => {
          if (!dbKeys.has(key)) {
            merged.delete(key);
          }
        });
        return merged;
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to fetch changed files:', error);
      }
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

  const totalPages = Math.ceil(filteredTranslations.length / pageSize);
  const from = filteredTranslations.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, filteredTranslations.length);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    const changed = JSON.stringify(translations) !== JSON.stringify(originalTranslations);
    setHasChanges(changed);
  }, [translations, originalTranslations]);

  const handleCellClick = (rowIndex: number, col: string) => {
    const absoluteIndex = (page - 1) * pageSize + rowIndex;
    const row = filteredTranslations[absoluteIndex];
    setEditingCell({ row: absoluteIndex, col });
    setEditValue(row[col as keyof TranslationRow] as string);
    
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const newTranslations = [...translations];
    const row = filteredTranslations[editingCell.row];
    const originalIndex = translations.findIndex(t => t.key === row.key);
    const originalRow = originalTranslations.find(t => t.key === row.key);
    
    if (originalIndex !== -1) {
      const newValue = editValue.trim();
      const oldValue = (originalRow?.[editingCell.col as keyof TranslationRow] as string || '').trim();
      
      newTranslations[originalIndex] = {
        ...newTranslations[originalIndex],
        [editingCell.col]: newValue,
      };
      
      const newChangedKeys = new Set(changedKeys);
      const isInDatabase = changedKeysFromDb.has(row.key);
      const isPublished = builtKeysFromDb.has(row.key);
      
      // If a published key is edited, it should go back to pending
      if (newValue !== oldValue) {
        newChangedKeys.add(row.key);
        // If it was published, remove it from builtKeysFromDb (it's now pending again)
        if (isPublished) {
          setBuiltKeysFromDb(prev => {
            const updated = new Set(prev);
            updated.delete(row.key);
            return updated;
          });
        }
      } else {
        const allMatch = ['en', 'ps', 'fa', 'ar'].every(lang => {
          const currentValue = (newTranslations[originalIndex][lang as keyof TranslationRow] as string || '').trim();
          const origValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
          return currentValue === origValue;
        });
        if (allMatch && !isInDatabase && !isPublished) {
          newChangedKeys.delete(row.key);
        } else if (!allMatch) {
          newChangedKeys.add(row.key);
          // If it was published and now changed, remove from builtKeysFromDb
          if (isPublished) {
            setBuiltKeysFromDb(prev => {
              const updated = new Set(prev);
              updated.delete(row.key);
              return updated;
            });
          }
        }
      }
      
      setTranslations(newTranslations);
      setChangedKeys(newChangedKeys);
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleExportExcel = async () => {
    try {
      await exportTranslationsToExcel();
      showToast.success('Translations exported to Excel');
    } catch (error) {
      showToast.error('Failed to export translations');
      if (import.meta.env.DEV) {
        console.error(error);
      }
    }
  };

  const handleExportCSV = () => {
    try {
      exportTranslationsToCSV();
      showToast.success('Translations exported to CSV');
    } catch (error) {
      showToast.error('Failed to export translations');
      if (import.meta.env.DEV) {
        console.error(error);
      }
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) return;
    
    try {
      const imported = await importTranslationsFromExcel(importFile);
      
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
      
      for (const importedRow of imported) {
        if (!existingKeys.has(importedRow.key)) {
          merged.push(importedRow);
        }
      }
      
      const newChangedKeys = new Set<string>();
      merged.forEach(row => {
        const originalRow = originalTranslations.find(t => t.key === row.key);
        if (originalRow) {
          const hasChanges = ['en', 'ps', 'fa', 'ar'].some(lang => {
            const currentValue = row[lang as keyof TranslationRow] as string || '';
            const origValue = originalRow[lang as keyof TranslationRow] as string || '';
            return currentValue !== origValue;
          });
          if (hasChanges) {
            newChangedKeys.add(row.key);
          }
        } else {
          newChangedKeys.add(row.key);
        }
      });
      
      setTranslations(merged.sort((a, b) => a.key.localeCompare(b.key)));
      setChangedKeys(newChangedKeys);
      setShowImportDialog(false);
      setImportFile(null);
      showToast.success('Translations imported successfully');
    } catch (error) {
      showToast.error('Failed to import translations. Please check the file format.');
      if (import.meta.env.DEV) {
        console.error(error);
      }
    }
  };

  const handleReset = () => {
    setTranslations([...originalTranslations]);
    setChangedKeys(new Set());
    setHasChanges(false);
    showToast.info('Changes reset');
  };

  const handleMarkAsPublished = async (fileNames?: string[], markAll: boolean = false) => {
    try {
      setIsSaving(true);
      await translationsApi.markAsBuilt(fileNames, markAll);
      showToast.success(markAll ? 'All files marked as published' : `${fileNames?.length || 0} file(s) marked as published`);
      await fetchChangedFiles();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to mark files as published';
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('Failed to mark files as published:', error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyJSON = () => {
    const nested = nestTranslations(translations);
    const jsonString = JSON.stringify(nested, null, 2);
    
    navigator.clipboard.writeText(jsonString).then(() => {
      showToast.success('Translations copied to clipboard as JSON');
    }).catch(() => {
      showToast.error('Failed to copy to clipboard');
    });
  };

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
    showToast.success('Translations downloaded as JSON');
  };

  const handleSave = async () => {
    if (!hasChanges || changedKeys.size === 0) {
      showToast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const changes: Array<{ key: string; lang: string; value: string }> = [];
      
      for (const key of changedKeys) {
        const currentRow = translations.find(t => t.key === key);
        const originalRow = originalTranslations.find(t => t.key === key);
        
        if (currentRow && originalRow) {
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
        showToast.info('No changes to save');
        setIsSaving(false);
        return;
      }
      
      await translationsApi.saveChanges(changes);

      setOriginalTranslations([...translations]);
      
      await fetchChangedFiles();
      
      setHasChanges(false);
      
      showToast.success(`Saved ${changes.length} translation change(s) successfully`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save translations';
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('Failed to save translations:', error);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncMissingKeys = () => {
    try {
      const synced = syncMissingKeys();
      const missingCount = synced.length - translations.length;
      
      if (missingCount > 0) {
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
        showToast.success(`Added ${missingCount} missing translation key(s). English text used as placeholder.`);
      } else {
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
          showToast.success(`Filled ${filledCount} missing translation(s) with English text.`);
        } else {
          showToast.info('All translation keys are already synced!');
        }
      }
    } catch (error) {
      showToast.error('Failed to sync missing keys');
      if (import.meta.env.DEV) {
        console.error('Error syncing missing keys:', error);
      }
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Translations Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage application translations for all supported languages
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Keys</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{translations.length}</div>
            <p className="text-xs text-muted-foreground">Translation keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
              {changedFiles.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKeysChanged}</div>
            <p className="text-xs text-muted-foreground">Keys pending build</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
              {builtFiles.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{builtFiles.reduce((sum, f) => sum + f.keys_changed, 0)}</div>
            <p className="text-xs text-muted-foreground">Keys published</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Translation Editor
              </CardTitle>
              <CardDescription>
                Edit translations in an Excel-like interface. Click any cell to edit.
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
                title="Add missing translation keys to all language files"
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
                    {isSaving ? 'Saving...' : `Save (${changedKeys.size})`}
                  </Button>
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
                    <>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                        {changedFiles.length} file(s) pending
                      </Badge>
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
                    </>
                  )}
                </div>
              </div>
              
              {changedFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files pending build</p>
              ) : (
                <div className="space-y-2">
                  {changedFiles.map((file, index) => (
                    <div 
                      key={`pending-${file.file_name}-${file.language}-${index}`} 
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
                  </div>
                </div>
              )}
            </div>

            {/* Built/Published Files */}
            {builtFiles.length > 0 && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Published Files</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200">
                      {builtFiles.length} file(s) published
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPublishedDialog(true)}
                      className="h-7 text-xs"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Published Keys
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {builtFiles.map((file, index) => (
                    <div 
                      key={`built-${file.file_name}-${file.language}-${index}`} 
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
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
              <div className="min-w-[800px]">
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
                                        const originalRow = originalTranslations.find(t => t.key === row.key);
                                        const currentRow = translations.find(t => t.key === row.key);
                                        const newValue = e.target.value.trim();
                                        const oldValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
                                        const isInDatabase = changedKeysFromDb.has(row.key);
                                        const isPublished = builtKeysFromDb.has(row.key);
                                        
                                        const newChangedKeys = new Set(changedKeys);
                                        
                                        if (newValue !== oldValue) {
                                          newChangedKeys.add(row.key);
                                          // If it was published, remove it from builtKeysFromDb (it's now pending again)
                                          if (isPublished) {
                                            setBuiltKeysFromDb(prev => {
                                              const updated = new Set(prev);
                                              updated.delete(row.key);
                                              return updated;
                                            });
                                          }
                                        } else {
                                          const allMatch = ['en', 'ps', 'fa', 'ar'].every(l => {
                                            const origVal = (originalRow?.[l as keyof TranslationRow] as string || '').trim();
                                            if (l === lang) {
                                              return true;
                                            }
                                            const currentVal = (currentRow?.[l as keyof TranslationRow] as string || '').trim();
                                            return currentVal === origVal;
                                          });
                                          if (allMatch && !isInDatabase && !isPublished) {
                                            newChangedKeys.delete(row.key);
                                          } else if (!allMatch) {
                                            newChangedKeys.add(row.key);
                                            // If it was published and now changed, remove from builtKeysFromDb
                                            if (isPublished) {
                                              setBuiltKeysFromDb(prev => {
                                                const updated = new Set(prev);
                                                updated.delete(row.key);
                                                return updated;
                                              });
                                            }
                                          }
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
          </div>

          {/* Pagination Controls */}
          <div className={cn('mt-4 space-y-4', isRTL && 'rtl')}>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {filteredTranslations.length > 0 ? (
                  <>
                    Showing {from} to {to} of {filteredTranslations.length} entries
                    {search && (
                      <span className="ml-2">
                        (filtered from {translations.length} total)
                      </span>
                    )}
                  </>
                ) : (
                  <>No entries</>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
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

            {hasChanges && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ You have unsaved changes
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Published Keys Dialog */}
      <Dialog open={showPublishedDialog} onOpenChange={setShowPublishedDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              Published Translation Keys
            </DialogTitle>
            <DialogDescription>
              These translation keys have been published and are included in the build. Editing them will move them back to pending.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {builtFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No published files</p>
            ) : (
              builtFiles.map((file, fileIndex) => (
                <Card key={`published-file-${fileIndex}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {file.file_name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {file.keys_changed} key(s)
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Published: {new Date(file.built_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {file.changed_keys && file.changed_keys.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedPublishedKeys(prev => {
                              const updated = new Set(prev);
                              // Add all keys for this file
                              file.changed_keys.forEach((key, keyIndex) => {
                                const keyId = `${file.file_name}-${key}-${keyIndex}`;
                                updated.add(keyId);
                              });
                              return updated;
                            });
                          }}
                          className="h-7 text-xs"
                        >
                          <ChevronsDownUp className="h-3 w-3 mr-1" />
                          Expand All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedPublishedKeys(prev => {
                              const updated = new Set(prev);
                              // Remove all keys for this file
                              file.changed_keys.forEach((key, keyIndex) => {
                                const keyId = `${file.file_name}-${key}-${keyIndex}`;
                                updated.delete(keyId);
                              });
                              return updated;
                            });
                          }}
                          className="h-7 text-xs"
                        >
                          <ChevronsUpDown className="h-3 w-3 mr-1" />
                          Collapse All
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {file.changed_keys && file.changed_keys.length > 0 ? (
                      <div className="space-y-2">
                        {file.changed_keys.map((key, keyIndex) => {
                          const keyId = `${file.file_name}-${key}-${keyIndex}`;
                          const isExpanded = expandedPublishedKeys.has(keyId);
                          const translationRow = translations.find(t => t.key === key);
                          const originalRow = originalTranslations.find(t => t.key === key);
                          
                          // Determine which languages have changes
                          const changedLanguages = ['en', 'ps', 'fa', 'ar'].filter(lang => {
                            const currentValue = (translationRow?.[lang as keyof TranslationRow] as string || '').trim();
                            const origValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
                            return currentValue !== origValue;
                          });
                          
                          return (
                            <div
                              key={keyId}
                              className="border rounded-lg overflow-hidden"
                            >
                              <button
                                onClick={() => {
                                  setExpandedPublishedKeys(prev => {
                                    const updated = new Set(prev);
                                    if (updated.has(keyId)) {
                                      updated.delete(keyId);
                                    } else {
                                      updated.add(keyId);
                                    }
                                    return updated;
                                  });
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="font-mono text-xs break-all">{key}</span>
                                  {changedLanguages.length > 0 && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {changedLanguages.length} language(s)
                                    </Badge>
                                  )}
                                </div>
                              </button>
                              {isExpanded && translationRow && (
                                <div className="border-t bg-muted/30 p-3 space-y-3">
                                  {/* English (reference) */}
                                  <div>
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">English (en)</div>
                                    <div className="text-sm p-2 bg-background rounded border">
                                      {translationRow.en || <span className="text-muted-foreground italic">Empty</span>}
                                    </div>
                                  </div>
                                  
                                  {/* File's language (the language this file represents) */}
                                  {file.language && file.language !== 'en' && (
                                    <div>
                                      <div className="text-xs font-semibold text-muted-foreground mb-1">
                                        {file.language === 'ps' ? 'Pashto (ps)' : 
                                         file.language === 'fa' ? 'Farsi (fa)' : 
                                         file.language === 'ar' ? 'Arabic (ar)' : 
                                         `${file.language.toUpperCase()} (${file.language})`}
                                      </div>
                                      <div className="p-2 bg-background rounded border space-y-1">
                                        <div className="text-xs text-muted-foreground">Current value:</div>
                                        <div className="text-sm">
                                          {(translationRow[file.language as keyof TranslationRow] as string || '').trim() || 
                                           <span className="text-muted-foreground italic">Empty</span>}
                                        </div>
                                        {originalRow && (originalRow[file.language as keyof TranslationRow] as string || '').trim() && (
                                          <>
                                            <div className="text-xs text-muted-foreground mt-2">Original value:</div>
                                            <div className="text-sm line-through text-muted-foreground">
                                              {(originalRow[file.language as keyof TranslationRow] as string || '').trim()}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Other changed languages (if any) */}
                                  {changedLanguages.filter(lang => lang !== file.language && lang !== 'en').length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-xs font-semibold text-muted-foreground">Other Changed Languages</div>
                                      {changedLanguages.filter(lang => lang !== file.language && lang !== 'en').map(lang => {
                                        const currentValue = (translationRow[lang as keyof TranslationRow] as string || '').trim();
                                        const origValue = (originalRow?.[lang as keyof TranslationRow] as string || '').trim();
                                        const langLabels: Record<string, string> = {
                                          'ps': 'Pashto (ps)',
                                          'fa': 'Farsi (fa)',
                                          'ar': 'Arabic (ar)',
                                        };
                                        
                                        return (
                                          <div key={lang}>
                                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                                              {langLabels[lang] || lang}
                                            </div>
                                            <div className="p-2 bg-background rounded border space-y-1">
                                              <div className="text-xs text-muted-foreground">New value:</div>
                                              <div className="text-sm">{currentValue || <span className="text-muted-foreground italic">Empty</span>}</div>
                                              {origValue && (
                                                <>
                                                  <div className="text-xs text-muted-foreground mt-2">Original value:</div>
                                                  <div className="text-sm line-through text-muted-foreground">{origValue}</div>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No keys listed</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishedDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Translations from Excel</DialogTitle>
            <DialogDescription>
              Select an Excel file (.xlsx) exported from this editor. The file must have columns: key, en, ps, fa, ar.
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

