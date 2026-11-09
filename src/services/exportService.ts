import { apiUrl } from '@/lib/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportSummary {
  transactions: number;
  budgets: number;
  debts: number;
  formats: string[];
}

export const exportService = {
  /**
   * Get export data summary
   */
  async getExportSummary(): Promise<ExportSummary | null> {
    try {
      const response = await fetch(apiUrl('/api/export/summary'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export summary');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching export summary:', error);
      return null;
    }
  },

  /**
   * Download transactions as CSV
   */
  downloadTransactionsCSV(): void {
    const token = localStorage.getItem('token');
    // Create fetch request for proper auth header
    fetch(apiUrl('/api/export/transactions/csv'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => console.error('Download failed:', error));
  },

  /**
   * Download budgets as CSV
   */
  downloadBudgetsCSV(): void {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/export/budgets/csv'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `budgets_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => console.error('Download failed:', error));
  },

  /**
   * Download debts as CSV
   */
  downloadDebtsCSV(): void {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/export/debts/csv'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `debts_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => console.error('Download failed:', error));
  },

  /**
   * Download all data as PDF with comprehensive statistics and infrastructure
   */
  async downloadAllPDF(): Promise<void> {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(apiUrl('/api/export/all/json'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch data');
      const fullData = await response.json();
      const { data } = fullData;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Helper for headers
      const addHeader = (title: string, y: number) => {
        doc.setFontSize(18);
        doc.setTextColor(249, 115, 22); // Orange-500
        doc.text(title, 14, y);
        doc.setDrawColor(249, 115, 22);
        doc.line(14, y + 2, pageWidth - 14, y + 2);
        doc.setTextColor(30);
      };

      // --- PAGE 1: EXECUTIVE SUMMARY ---
      // Title
      doc.setFontSize(28);
      doc.setTextColor(249, 115, 22);
      doc.text('SpendWise Financial Report', 14, 25);

      // Date & Metadata
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 35);
      doc.text(`Report Period: Full History`, 14, 40);

      // Summary Statistics Section
      addHeader('Executive Summary', 55);

      const totalIncome = data.transactions
        .filter((t: any) => t.type === 'INCOME')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalExpense = data.transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      const balance = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

      const statsData = [
        ['Metric', 'Value', 'Status'],
        ['Total Income', `$${totalIncome.toLocaleString()}`, 'Source'],
        ['Total Expenses', `$${totalExpense.toLocaleString()}`, 'Outflow'],
        ['Net Savings', `$${balance.toLocaleString()}`, balance >= 0 ? 'Positive' : 'Deficit'],
        ['Savings Rate', `${savingsRate.toFixed(1)}%`, savingsRate > 20 ? 'Healthy' : 'Low'],
        ['Transaction Volume', data.transactions.length.toString(), 'Activity'],
        ['Monitored Budgets', data.budgets.length.toString(), 'Planned'],
        ['Outstanding Debts', data.debts.length.toString(), 'Liabilities']
      ];

      autoTable(doc, {
        head: [statsData[0]],
        body: statsData.slice(1),
        startY: 65,
        theme: 'striped',
        headStyles: { fillColor: [249, 115, 22] },
        columnStyles: {
          1: { fontStyle: 'bold' },
          2: { fontStyle: 'italic' }
        }
      });

      // Spending by Category (Top 10)
      const categoryTotals: Record<string, number> = {};
      const categoryColorMap: Record<string, string> = {};
      
      // Build color map from categories
      data.categories.forEach((c: any) => {
        categoryColorMap[c.name] = c.color;
      });

      data.transactions
        .filter((t: any) => t.type === 'EXPENSE')
        .forEach((t: any) => {
          const catName = t.category;
          categoryTotals[catName] = (categoryTotals[catName] || 0) + t.amount;
        });

      const sortedCategories = Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      addHeader('Top Spending Categories', (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        head: [['', 'Category', 'Total Spent', '% of Total']],
        body: sortedCategories.map(([name, amount]) => [
          '', // For color box
          name,
          `$${amount.toLocaleString()}`,
          `${((amount / totalExpense) * 100).toFixed(1)}%`
        ]),
        startY: (doc as any).lastAutoTable.finalY + 25,
        theme: 'grid',
        headStyles: { fillColor: [75, 85, 99] },
        columnStyles: {
          0: { cellWidth: 10 }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const catName = data.row.cells[1].text[0];
            const color = categoryColorMap[catName];
            if (color && color.startsWith('#')) {
              doc.setFillColor(color);
              doc.rect(data.cell.x + 2, data.cell.y + 2, 6, 6, 'F');
            }
          }
        }
      });

      // --- PAGE 2: BUDGETS & DEBTS ---
      doc.addPage();
      addHeader('Budget Performance', 20);

      const budgetData = data.budgets.map((b: any) => {
        const remaining = b.limit - b.spent;
        const status = b.spent > b.limit ? 'Over' : 'Under';
        return [
          `${b.month}/${b.year}`,
          b.category,
          `$${b.limit.toLocaleString()}`,
          `$${b.spent.toLocaleString()}`,
          `$${remaining.toLocaleString()}`,
          status
        ];
      });

      autoTable(doc, {
        head: [['Period', 'Category', 'Limit', 'Spent', 'Remaining', 'Status']],
        body: budgetData,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [14, 165, 233] }, // Blue-500
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            if (data.cell.raw === 'Over') {
              data.cell.styles.textColor = [220, 38, 38]; // Red-600
            } else {
              data.cell.styles.textColor = [22, 163, 74]; // Green-600
            }
          }
        }
      });

      addHeader('Debts & Liabilities', (doc as any).lastAutoTable.finalY + 15);

      const debtData = data.debts.map((d: any) => {
        const totalRepaid = d.repayments.reduce((sum: number, r: any) => sum + r.amount, 0);
        const remaining = d.amount - totalRepaid;
        return [
          d.personName,
          d.type,
          `$${d.amount.toLocaleString()}`,
          `$${totalRepaid.toLocaleString()}`,
          `$${remaining.toLocaleString()}`,
          d.status
        ];
      });

      autoTable(doc, {
        head: [['Entity', 'Type', 'Initial', 'Repaid', 'Remaining', 'Status']],
        body: debtData,
        startY: (doc as any).lastAutoTable.finalY + 25,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] } // Purple-500
      });

      // --- PAGE 3: INFRASTRUCTURE & RECURRING ---
      doc.addPage();
      addHeader('Financial Infrastructure', 20);

      const categoryDetails = data.categories.map((c: any) => [
        '', // Color box
        c.name,
        c.type,
        c.color || '-'
      ]);

      autoTable(doc, {
        head: [['', 'Category Name', 'Type', 'Hex Code']],
        body: categoryDetails,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [100, 116, 139] },
        columnStyles: {
          0: { cellWidth: 10 }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const color = data.row.cells[3].text[0];
            if (color && color.startsWith('#')) {
              doc.setFillColor(color);
              doc.rect(data.cell.x + 2, data.cell.y + 2, 6, 6, 'F');
            }
          }
        }
      });

      addHeader('Recurring Transactions', (doc as any).lastAutoTable.finalY + 15);

      const recurringData = data.recurringTransactions.map((r: any) => [
        r.category,
        r.type,
        `$${r.amount.toLocaleString()}`,
        r.frequency,
        r.isActive ? 'Active' : 'Paused'
      ]);

      autoTable(doc, {
        head: [['Category', 'Type', 'Amount', 'Frequency', 'Status']],
        body: recurringData,
        startY: (doc as any).lastAutoTable.finalY + 25,
        theme: 'grid',
        headStyles: { fillColor: [20, 184, 166] } // Teal-500
      });

      // --- PAGE 4+: TRANSACTION LOG ---
      doc.addPage();
      addHeader('Recent Transaction Log (Last 100)', 20);

      const transactionData = data.transactions.slice(0, 100).map((t: any) => [
        new Date(t.date).toLocaleDateString(),
        t.category,
        t.type,
        `$${t.amount.toLocaleString()}`,
        t.description || '-'
      ]);

      autoTable(doc, {
        head: [['Date', 'Category', 'Type', 'Amount', 'Description']],
        body: transactionData,
        startY: 30,
        theme: 'striped',
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Footer with Page Numbers
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `SpendWise Financial Report | Generated: ${new Date().toLocaleDateString()}`,
          14,
          pageHeight - 10
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 25,
          pageHeight - 10
        );
      }

      doc.save(`SpendWise_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
      throw error;
    }
  },

  /**
   * Download all data as JSON
   */
  downloadAllJSON(): void {
    const token = localStorage.getItem('token');
    fetch(apiUrl('/api/export/all/json'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `spendwise_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      })
      .catch(error => console.error('Download failed:', error));
  },

  /**
   * Copy data to clipboard as JSON
   */
  async copyToClipboard(dataType: 'transactions' | 'budgets' | 'debts' | 'all'): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      let url = '';

      switch (dataType) {
        case 'all':
          url = apiUrl('/api/export/all/json');
          break;
        default:
          return false;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }

      const data = await response.json();
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  },
};
