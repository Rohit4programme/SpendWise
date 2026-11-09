import { ReactNode, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Download, FileJson, FileText, Copy, Check, Loader, FileOutput } from 'lucide-react';
import { exportService, type ExportSummary } from '@/services/exportService';

interface ExportDialogProps {
  trigger?: ReactNode;
}

export function ExportDialog({ trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ExportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchSummary();
    }
  }, [open]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await exportService.getExportSummary();
      setSummary(data);
    } catch (error) {
      toast.error('Failed to load export summary');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: string, type: string) => {
    setDownloading(`${format}-${type}`);
    try {
      if (type === 'all' && format === 'json') {
        exportService.downloadAllJSON();
      } else if (type === 'all' && format === 'pdf') {
        await exportService.downloadAllPDF();
      } else if (format === 'csv') {
        if (type === 'transactions') {
          exportService.downloadTransactionsCSV();
        } else if (type === 'budgets') {
          exportService.downloadBudgetsCSV();
        } else if (type === 'debts') {
          exportService.downloadDebtsCSV();
        }
      }
      toast.success(`Downloaded ${type} as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Failed to download ${type}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyToClipboard = async () => {
    setCopiedFormat('json');
    const success = await exportService.copyToClipboard('all');
    if (success) {
      toast.success('Data copied to clipboard');
    } else {
      toast.error('Failed to copy to clipboard');
    }
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            Export Your Data
          </DialogTitle>
          <DialogDescription>
            Download your financial data in CSV, JSON, or PDF format for backup, analysis, or import elsewhere
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-3"
            >
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-600">{summary.transactions}</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Transactions</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{summary.budgets}</p>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Budgets</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">{summary.debts}</p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">Debts</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* CSV Format */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold">CSV Format</h3>
                <Badge variant="outline" className="ml-auto">Best for Excel</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download individual data types as CSV files, compatible with Excel and Google Sheets
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('csv', 'transactions')}
                  disabled={downloading === 'csv-transactions'}
                  className="w-full"
                >
                  {downloading === 'csv-transactions' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Transactions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('csv', 'budgets')}
                  disabled={downloading === 'csv-budgets'}
                  className="w-full"
                >
                  {downloading === 'csv-budgets' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Budgets
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload('csv', 'debts')}
                  disabled={downloading === 'csv-debts'}
                  className="w-full"
                >
                  {downloading === 'csv-debts' ? (
                    <Loader className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Download className="w-3 h-3 mr-1" />
                  )}
                  Debts
                </Button>
              </div>
            </motion.div>

            {/* JSON Format */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">JSON Format</h3>
                <Badge variant="outline" className="ml-auto">Best for Backup</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download all your data in a single JSON file. Perfect for backups, import, or API integrations
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
                  size="sm"
                  onClick={() => handleDownload('json', 'all')}
                  disabled={downloading === 'json-all'}
                >
                  {downloading === 'json-all' ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download All Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  className="gap-2"
                  disabled={copiedFormat === 'json'}
                >
                  {copiedFormat === 'json' ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* PDF Format */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border rounded-lg p-4 space-y-3 bg-orange-50/30 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900"
            >
              <div className="flex items-center gap-2">
                <FileOutput className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-900 dark:text-orange-100">Financial Report (PDF)</h3>
                <Badge className="ml-auto bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">Statistics Included</Badge>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate a professional PDF report including spending statistics, balance overview, and recent activity
              </p>
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                size="sm"
                onClick={() => handleDownload('pdf', 'all')}
                disabled={downloading === 'pdf-all'}
              >
                {downloading === 'pdf-all' ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <FileOutput className="w-4 h-4" />
                )}
                Generate PDF Report
              </Button>
            </motion.div>

            {/* Information */}
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>💡 Tip:</strong> Regularly export your data for backup purposes. Your data remains secure and is only processed on your device.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Failed to load export information
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
