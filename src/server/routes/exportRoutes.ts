import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import { convertToCSV } from '../utils/csv';

interface ExportRoutesDeps {
  authenticate: (req: any, res: any, next: any) => void;
  prisma: PrismaClient;
}

export function registerExportRoutes(app: Express, { authenticate, prisma }: ExportRoutesDeps) {
  app.get('/api/export/summary', authenticate, async (req: any, res) => {
    try {
      const transactionCount = await prisma.transaction.count({
        where: { userId: req.user.id },
      });
      const budgetCount = await prisma.budget.count({
        where: { userId: req.user.id },
      });
      const debtCount = await prisma.debt.count({
        where: { userId: req.user.id },
      });

      res.json({
        transactions: transactionCount,
        budgets: budgetCount,
        debts: debtCount,
        formats: ['CSV', 'JSON', 'PDF'],
      });
    } catch (error) {
      console.error('Export summary error:', error);
      res.status(500).json({ error: 'Failed to fetch export summary' });
    }
  });

  app.get('/api/export/transactions/csv', authenticate, async (req: any, res) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
      });

      const data = transactions.map((transaction) => ({
        date: new Date(transaction.date).toISOString().split('T')[0],
        category: transaction.category.name,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || '',
      }));

      const csv = convertToCSV(data, ['date', 'category', 'type', 'amount', 'description']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Transactions CSV export error:', error);
      res.status(500).json({ error: 'Failed to export transactions' });
    }
  });

  app.get('/api/export/budgets/csv', authenticate, async (req: any, res) => {
    try {
      const budgets = await prisma.budget.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const data = budgets.map((budget) => ({
        month: `${budget.month}/${budget.year}`,
        category: budget.category.name,
        limit: budget.limit,
        spent: budget.spent,
        remaining: budget.limit - budget.spent,
        status: budget.spent > budget.limit ? 'Over Budget' : 'Within Budget',
      }));

      const csv = convertToCSV(data, ['month', 'category', 'limit', 'spent', 'remaining', 'status']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="budgets_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Budgets CSV export error:', error);
      res.status(500).json({ error: 'Failed to export budgets' });
    }
  });

  app.get('/api/export/debts/csv', authenticate, async (req: any, res) => {
    try {
      const debts = await prisma.debt.findMany({
        where: { userId: req.user.id },
        include: { repayments: true },
        orderBy: { date: 'desc' },
      });

      const data = debts.map((debt) => {
        const totalRepaid = debt.repayments.reduce((sum, repayment) => sum + repayment.amount, 0);
        return {
          person: debt.personName,
          type: debt.type,
          amount: debt.amount,
          repaid: totalRepaid,
          remaining: Math.max(0, debt.amount - totalRepaid),
          status: debt.status,
          date: new Date(debt.date).toISOString().split('T')[0],
          dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] : '',
          notes: debt.notes || '',
        };
      });

      const csv = convertToCSV(data, ['person', 'type', 'amount', 'repaid', 'remaining', 'status', 'date', 'dueDate', 'notes']);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="debts_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Debts CSV export error:', error);
      res.status(500).json({ error: 'Failed to export debts' });
    }
  });

  app.get('/api/export/all/json', authenticate, async (req: any, res) => {
    try {
      const [transactions, budgets, debts, bills, categories, recurringTransactions] = await Promise.all([
        prisma.transaction.findMany({
          where: { userId: req.user.id },
          include: { category: true },
          orderBy: { date: 'desc' },
        }),
        prisma.budget.findMany({
          where: { userId: req.user.id },
          include: { category: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        }),
        prisma.debt.findMany({
          where: { userId: req.user.id },
          include: { repayments: true },
          orderBy: { date: 'desc' },
        }),
        prisma.bill.findMany({
          where: { userId: req.user.id },
          include: { category: true },
          orderBy: { dueDate: 'asc' },
        }),
        prisma.category.findMany({
          where: { userId: req.user.id },
          orderBy: { name: 'asc' },
        }),
        prisma.recurringTransaction.findMany({
          where: { userId: req.user.id },
          include: { category: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: {
          transactions: transactions.map((transaction) => ({
            id: transaction.id,
            date: transaction.date,
            category: transaction.category.name,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            createdAt: transaction.createdAt,
          })),
          budgets: budgets.map((budget) => ({
            id: budget.id,
            category: budget.category.name,
            month: budget.month,
            year: budget.year,
            limit: budget.limit,
            spent: budget.spent,
            rollover: budget.rollover,
          })),
          debts: debts.map((debt) => ({
            id: debt.id,
            personName: debt.personName,
            type: debt.type,
            amount: debt.amount,
            date: debt.date,
            dueDate: debt.dueDate,
            status: debt.status,
            notes: debt.notes,
            repayments: debt.repayments.map((repayment) => ({
              id: repayment.id,
              amount: repayment.amount,
              date: repayment.date,
              notes: repayment.notes,
            })),
          })),
          bills: bills.map((bill) => ({
            id: bill.id,
            name: bill.name,
            category: bill.category.name,
            amount: bill.amount,
            dueDate: bill.dueDate,
            isPaid: bill.isPaid,
            createdAt: bill.createdAt,
          })),
          categories,
          recurringTransactions: recurringTransactions.map((recurringTransaction) => ({
            id: recurringTransaction.id,
            category: recurringTransaction.category.name,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            frequency: recurringTransaction.frequency,
            description: recurringTransaction.description,
            startDate: recurringTransaction.startDate,
            endDate: recurringTransaction.endDate,
            isActive: recurringTransaction.isActive,
          })),
        },
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="spendwise_export_${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error('Full export error:', error);
      res.status(500).json({ error: 'Failed to export data' });
    }
  });
}
