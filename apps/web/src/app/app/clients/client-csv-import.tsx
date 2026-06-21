'use client';

import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { clientsApi } from '@/lib/api/clients';
import { Button } from '@/components/ui/button';
import type { CreateClientDto } from '@sterling/shared';

interface ClientCsvImportProps {
  open: boolean;
  onClose: () => void;
}

function parseCsv(text: string): CreateClientDto[] {
  const lines = text.trim().split('\n');
  const headers = lines[0]?.split(',').map((h) => h.trim().replace(/"/g, '')) ?? [];
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return {
      name: row['name'] ?? '',
      type: (row['type'] as 'company' | 'person') || 'company',
      email: row['email'] || undefined,
      phone: row['phone'] || undefined,
      currency: row['currency'] || 'PKR',
      status: (row['status'] as 'active' | 'inactive') || 'active',
      billingCountry: row['billingCountry'] || 'Pakistan',
    };
  });
}

export function ClientCsvImport({ open, onClose }: ClientCsvImportProps) {
  const qc = useQueryClient();
  const [parsed, setParsed] = React.useState<CreateClientDto[]>([]);
  const [fileName, setFileName] = React.useState('');
  const [result, setResult] = React.useState<{ created: number; errors: { row: number; error: string }[] } | null>(null);

  const importMutation = useMutation({
    mutationFn: () => clientsApi.importCsv(parsed),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['clients'] });
      if (data.errors.length === 0) {
        toast.success(`${data.created} client(s) imported`);
      }
    },
    onError: () => toast.error('Import failed'),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParsed(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setParsed([]);
    setFileName('');
    setResult(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Import Clients from CSV</h2>
              <button onClick={handleClose} className="rounded-lg p-1.5 text-muted hover:bg-surface transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted">
              CSV must have headers: <code className="rounded bg-surface px-1 text-xs">name, type, email, phone, currency, status</code>
            </p>

            {/* Upload area */}
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 text-center hover:border-primary/50 transition-colors">
              {fileName ? (
                <>
                  <FileText className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted">{parsed.length} rows detected</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted" />
                  <span className="text-sm text-muted">Click to upload or drag & drop</span>
                  <span className="text-xs text-muted/70">.csv files only</span>
                </>
              )}
              <input type="file" accept=".csv" onChange={handleFile} className="sr-only" />
            </label>

            {/* Result */}
            {result && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.created} client(s) imported successfully
                </div>
                {result.errors.map((err) => (
                  <div key={err.row} className="flex items-start gap-2 text-sm text-danger">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Row {err.row}: {err.error}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                disabled={parsed.length === 0}
                loading={importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import {parsed.length > 0 ? `${parsed.length} rows` : ''}
              </Button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
