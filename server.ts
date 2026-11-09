import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { prisma } from './src/lib/prisma';
import { hashPassword, comparePassword, generateToken, verifyToken, generateResetToken, compareResetToken, setupEncryption, deriveKeyFromPassword } from './src/lib/auth';
import { sendResetPasswordEmail } from './src/lib/mail';
import { validateEmail, validatePassword, validateAmount, validateMonth, validateYear, validateTransactionType, validateCategoryType, validateDebtType, validateReminderDays, parseAmount } from './src/lib/validation';
import { registerAIRoutes } from './src/server/routes/aiRoutes';
import { registerExportRoutes } from './src/server/routes/exportRoutes';
import { registerNotificationRoutes } from './src/server/routes/notificationRoutes';

async function startServer() {
  const app = express();
  const DEFAULT_PORT = Number(process.env.PORT || 3000);
  const HOST = process.env.HOST || '0.0.0.0';
  let activePort = DEFAULT_PORT;
  const usePhpApi = process.env.API_BACKEND === 'php';
  const phpApiBase = (process.env.PHP_API_BASE_URL || 'http://127.0.0.1:8000/php').replace(/\/$/, '');

  app.use(express.json());

  // Rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many attempts, please try again later',
  });

  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per hour
    message: 'Too many password reset attempts, please try again later',
  });

  // API routes
  app.get('/api/health', async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });

  if (usePhpApi) {
    console.log(`PHP API bridge enabled: ${phpApiBase}`);

    app.use('/api', async (req, res, next) => {
      // Keep health local so we can still verify Node + Prisma quickly.
      if (req.path === '/health') {
        return next();
      }

      try {
        let upstreamPath = req.originalUrl;

        // Frontend uses /signup while PHP currently exposes /register.
        if (upstreamPath.startsWith('/api/auth/signup')) {
          upstreamPath = upstreamPath.replace('/api/auth/signup', '/api/auth/register');
        }

        const targetUrl = `${phpApiBase}${upstreamPath}`;
        const method = req.method.toUpperCase();
        const hasBody = !['GET', 'HEAD'].includes(method);
        const body = hasBody && req.body && Object.keys(req.body).length > 0
          ? JSON.stringify(req.body)
          : undefined;

        const outboundHeaders: Record<string, string> = {};
        for (const [name, value] of Object.entries(req.headers)) {
          if (!value) continue;
          if (name === 'host' || name === 'content-length') continue;
          outboundHeaders[name] = Array.isArray(value) ? value.join(', ') : value;
        }

        if (body && !outboundHeaders['content-type']) {
          outboundHeaders['content-type'] = 'application/json';
        }

        const upstreamRes = await fetch(targetUrl, {
          method,
          headers: outboundHeaders,
          body,
        });

        // Fall back to Node routes when PHP doesn't implement an endpoint.
        if (upstreamRes.status === 404) {
          return next();
        }

        const contentType = upstreamRes.headers.get('content-type');
        if (contentType) {
          res.setHeader('content-type', contentType);
        }

        res.status(upstreamRes.status).send(await upstreamRes.text());
      } catch (error) {
        console.error('PHP API bridge error:', error);
        next();
      }
    });
  }

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Invalid token' });

    req.user = payload;
    next();
  };

  // Auth Routes
  app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await hashPassword(password);
      const encryption = setupEncryption(password);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          encryptionSalt: encryption.salt,
          recoveryKeyEncrypted: encryption.recoveryKeyEncrypted,
          settings: { create: {} },
          categories: {
            create: [
              { name: 'Food', color: '#F59E0B', icon: 'Utensils', type: 'EXPENSE' },
              { name: 'Transport', color: '#3B82F6', icon: 'Car', type: 'EXPENSE' },
              { name: 'Entertainment', color: '#8B5CF6', icon: 'Gamepad', type: 'EXPENSE' },
              { name: 'Shopping', color: '#EC4899', icon: 'ShoppingBag', type: 'EXPENSE' },
              { name: 'Health', color: '#10B981', icon: 'Heart', type: 'EXPENSE' },
              { name: 'Salary', color: '#10B981', icon: 'Briefcase', type: 'INCOME' },
              { name: 'Freelancing', color: '#3B82F6', icon: 'Smartphone', type: 'INCOME' },
              { name: 'Pocket Money', color: '#F59E0B', icon: 'Gift', type: 'INCOME' },
              { name: 'Business', color: '#8B5CF6', icon: 'Zap', type: 'INCOME' },
              { name: 'Other Income', color: '#71717A', icon: 'Star', type: 'INCOME' },
            ],
          },
        },
      });

      const token = generateToken({ id: user.id, email: user.email });
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name },
        encryptionSalt: user.encryptionSalt || ''
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log(`Login attempt for: ${email}`);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        console.log(`User not found: ${email}`);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        console.log(`Invalid password for: ${email}`);
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ id: user.id, email: user.email });
      console.log(`Login successful for: ${email}`);
      
      // Include encryption salt for client-side key derivation
      const encryptionSalt = user.encryptionSalt || '';
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, name: user.name },
        encryptionSalt
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      
      if (user) {
        const resetToken = generateResetToken();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
          where: { id: user.id },
          data: { resetToken, resetTokenExpiry },
        });

        const resetLink = `http://localhost:${activePort}/reset-password?token=${resetToken}`;
        await sendResetPasswordEmail(email, resetLink);
      }

      // Always return success to prevent email enumeration
      res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/reset-password', passwordResetLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      
      const user = await prisma.user.findFirst({
        where: {
          resetToken: { not: null },
          resetTokenExpiry: { gt: new Date() },
        },
      });

      if (!user || !user.resetToken || !compareResetToken(token, user.resetToken)) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const hashedPassword = await hashPassword(password);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      res.json({ message: 'Password has been reset successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/change-password', authenticate, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });

      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) return res.status(400).json({ error: 'Invalid current password' });

      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, name: true, settings: true },
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Transaction Routes
  app.get('/api/transactions', authenticate, async (req: any, res) => {
    try {
      const transactions = await prisma.transaction.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: { date: 'desc' },
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/transactions', authenticate, async (req: any, res) => {
    try {
      const { amount, encryptedAmount, categoryId, description, encryptedDescription, date, type } = req.body;
      
      // Support both plaintext (legacy) and encrypted data
      const amountValue = encryptedAmount || amount;
      if (!amountValue) {
        return res.status(400).json({ error: 'Missing amount' });
      }
      
      if (!categoryId || !type || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!['EXPENSE', 'INCOME'].includes(type)) {
        return res.status(400).json({ error: 'Invalid transaction type' });
      }

      // Category Ownership Check
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || (category.userId !== null && category.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Invalid category' });
      }

      const transaction = await prisma.transaction.create({
        data: {
          amount: encryptedAmount ? undefined : parseFloat(amount),
          encryptedAmount: encryptedAmount || undefined,
          categoryId,
          description: encryptedDescription ? undefined : description,
          encryptedDescription: encryptedDescription || undefined,
          date: new Date(date),
          type,
          userId: req.user.id,
        },
        include: { category: true },
      });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/transactions/:id', authenticate, async (req: any, res) => {
    try {
      const { amount, encryptedAmount, categoryId, description, encryptedDescription, date, type } = req.body;
      
      const amountValue = encryptedAmount || amount;
      if (!amountValue) {
        return res.status(400).json({ error: 'Missing amount' });
      }
      if (!categoryId || !type || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!['EXPENSE', 'INCOME'].includes(type)) {
        return res.status(400).json({ error: 'Invalid transaction type' });
      }
      
      const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
      });
      
      if (!transaction || transaction.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Category Ownership Check
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || (category.userId !== null && category.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Invalid category' });
      }

      const updated = await prisma.transaction.update({
        where: { id: req.params.id },
        data: {
          amount: encryptedAmount ? undefined : parseFloat(amount),
          encryptedAmount: encryptedAmount || undefined,
          categoryId,
          description: encryptedDescription ? undefined : description,
          encryptedDescription: encryptedDescription || undefined,
          date: new Date(date),
          type,
        },
        include: { category: true },
      });
      res.json(updated);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/transactions/:id', authenticate, async (req: any, res) => {
    try {
      const transactionCheck = await prisma.transaction.findUnique({
        where: { id: req.params.id }
      });
      if (!transactionCheck || transactionCheck.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.transaction.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Category Routes
  app.get('/api/categories', authenticate, async (req: any, res) => {
    try {
      const { type } = req.query;
      const categories = await prisma.category.findMany({
        where: {
          OR: [{ userId: req.user.id }, { userId: null }],
          ...(type ? { type: type as string } : {}),
        },
      });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/categories', authenticate, async (req: any, res) => {
    try {
      const { name, color, icon, type } = req.body;
      const categoryType = type || 'EXPENSE';
      
      if (!['EXPENSE', 'INCOME'].includes(categoryType)) {
        return res.status(400).json({ error: 'Invalid category type' });
      }
      
      const category = await prisma.category.create({
        data: {
          name,
          color,
          icon,
          type: categoryType,
          userId: req.user.id,
        },
      });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/categories/:id', authenticate, async (req: any, res) => {
    try {
      const { name, color, icon, type } = req.body;
      
      if (type && !['EXPENSE', 'INCOME'].includes(type)) {
        return res.status(400).json({ error: 'Invalid category type' });
      }
      
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
      });
      
      if (!category || !category.userId || category.userId !== req.user.id) {
        return res.status(403).json({ error: 'Cannot modify default categories' });
      }

      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: { name, color, icon, type },
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/categories', authenticate, async (req: any, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid IDs' });

      const categories = await prisma.category.findMany({
        where: { id: { in: ids } },
        select: { id: true, userId: true }
      });

      if (categories.some(cat => cat.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.category.deleteMany({
        where: {
          id: { in: ids },
          userId: req.user.id,
        },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete categories:', error);
      res.status(500).json({ error: 'Failed to delete categories. They may be in use by transactions or budgets.' });
    }
  });

  // Budget Routes
  app.get('/api/budgets', authenticate, async (req: any, res) => {
    try {
      const { month, year } = req.query;
      let targetMonth = parseInt(month as string);
      if (month && (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12)) {
        return res.status(400).json({ error: 'Invalid month' });
      }
      targetMonth = targetMonth || new Date().getMonth() + 1;
      
      let targetYear = parseInt(year as string);
      if (year && (isNaN(targetYear) || targetYear < 2000)) {
        return res.status(400).json({ error: 'Invalid year' });
      }
      targetYear = targetYear || new Date().getFullYear();

      const budgets = await prisma.budget.findMany({
        where: { 
          userId: req.user.id,
          month: targetMonth,
          year: targetYear
        },
        include: { category: true },
      });

      const budgetsWithSpent = await Promise.all(
        budgets.map(async (budget) => {
          // Calculate spent for this specific budget's month/year
          const spent = await prisma.transaction.aggregate({
            where: {
              userId: req.user.id,
              categoryId: budget.categoryId,
              type: 'EXPENSE',
              date: {
                gte: new Date(budget.year, budget.month - 1, 1),
                lt: new Date(budget.month === 12 ? budget.year + 1 : budget.year, budget.month === 12 ? 0 : budget.month, 1),
              },
            },
            _sum: {
              amount: true,
            },
          });

          let rolloverAmount = 0;
          if (budget.rollover) {
            // Find previous month's budget for the same category
            const prevMonth = budget.month === 1 ? 12 : budget.month - 1;
            const prevYear = budget.month === 1 ? budget.year - 1 : budget.year;

            const prevBudget = await prisma.budget.findFirst({
              where: {
                userId: req.user.id,
                categoryId: budget.categoryId,
                month: prevMonth,
                year: prevYear
              }
            });

            if (prevBudget) {
              const prevSpent = await prisma.transaction.aggregate({
                where: {
                  userId: req.user.id,
                  categoryId: budget.categoryId,
                  type: 'EXPENSE',
                  date: {
                    gte: new Date(prevYear, prevMonth - 1, 1),
                    lt: new Date(prevMonth === 12 ? prevYear + 1 : prevYear, prevMonth === 12 ? 0 : prevMonth, 1),
                  },
                },
                _sum: {
                  amount: true,
                },
              });
              
              // This is recursive in theory, but for now we just look at one month back
              // A more robust solution would be a recursive calculation or storing the rollover
              rolloverAmount = Math.max(0, prevBudget.limit - (prevSpent._sum.amount || 0));
            }
          }

          return {
            ...budget,
            spent: spent._sum.amount || 0,
            rolloverAmount
          };
        })
      );

      res.json(budgetsWithSpent);
    } catch (error) {
      console.error('Failed to fetch budgets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/budgets', authenticate, async (req: any, res) => {
    try {
      const { categoryId, limit, encryptedLimit, month, year, rollover } = req.body;
      const parsedMonth = parseInt(month);
      const parsedYear = parseInt(year);
      const limitValue = encryptedLimit || limit;
      
      if (!categoryId || !limitValue || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 || isNaN(parsedYear)) {
        return res.status(400).json({ error: 'Invalid input data' });
      }

      // Category Ownership Check
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || (category.userId !== null && category.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Invalid category' });
      }
      
      // Check if budget already exists for this category/month/year
      const existingBudget = await prisma.budget.findFirst({
        where: {
          userId: req.user.id,
          categoryId,
          month: parsedMonth,
          year: parsedYear
        }
      });

      if (existingBudget) {
        const budget = await prisma.budget.update({
          where: { id: existingBudget.id },
          data: { 
            limit: encryptedLimit ? undefined : parseFloat(limit),
            encryptedLimit: encryptedLimit || undefined,
            rollover: !!rollover
          },
          include: { category: true }
        });
        return res.json(budget);
      }

      const budget = await prisma.budget.create({
        data: {
          categoryId,
          limit: encryptedLimit ? undefined : parseFloat(limit),
          encryptedLimit: encryptedLimit || undefined,
          month: parsedMonth,
          year: parsedYear,
          rollover: !!rollover,
          userId: req.user.id,
        },
        include: { category: true }
      });
      res.json(budget);
    } catch (error) {
      console.error('Failed to create budget:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Bill Routes
  app.get('/api/bills', authenticate, async (req: any, res) => {
    try {
      const bills = await prisma.bill.findMany({
        where: { userId: req.user.id },
        include: { category: true },
        orderBy: { dueDate: 'asc' },
      });
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/bills', authenticate, async (req: any, res) => {
    try {
      const { name, amount, encryptedAmount, dueDate, encryptedDueDate, categoryId } = req.body;
      const amountValue = encryptedAmount || amount;
      const dueDateValue = encryptedDueDate || dueDate;
      
      if (!name || !amountValue || !dueDateValue || !categoryId) {
        return res.status(400).json({ error: 'Invalid input data' });
      }

      // Category Ownership Check
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || (category.userId !== null && category.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Invalid category' });
      }

      const bill = await prisma.bill.create({
        data: {
          name,
          amount: encryptedAmount ? undefined : parseFloat(amount),
          encryptedAmount: encryptedAmount || undefined,
          dueDate: new Date(dueDate),
          encryptedDueDate: encryptedDueDate || undefined,
          categoryId,
          userId: req.user.id,
        },
        include: { category: true },
      });
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/bills/:id/pay', authenticate, async (req: any, res) => {
    try {
      const billToPay = await prisma.bill.findUnique({ where: { id: req.params.id } });
      if (!billToPay || billToPay.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const bill = await prisma.bill.update({
        where: { id: req.params.id },
        data: { isPaid: true },
      });
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/bills/:id', authenticate, async (req: any, res) => {
    try {
      const { name, amount, dueDate, categoryId } = req.body;
      const parsedAmount = parseFloat(amount);
      
      if (!name || !amount || isNaN(parsedAmount) || parsedAmount < 0 || !dueDate || !categoryId) {
        return res.status(400).json({ error: 'Invalid input data' });
      }

      const billToUpdate = await prisma.bill.findUnique({ where: { id: req.params.id } });
      if (!billToUpdate || billToUpdate.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category || (category.userId !== null && category.userId !== req.user.id)) {
        return res.status(403).json({ error: 'Invalid category' });
      }

      const bill = await prisma.bill.update({
        where: { id: req.params.id },
        data: {
          name,
          amount: parsedAmount,
          dueDate: new Date(dueDate),
          categoryId,
        },
        include: { category: true },
      });
      res.json(bill);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/bills/:id', authenticate, async (req: any, res) => {
    try {
      const billToDelete = await prisma.bill.findUnique({ where: { id: req.params.id } });
      if (!billToDelete || billToDelete.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.bill.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Debt Routes
  app.get('/api/debts', authenticate, async (req: any, res) => {
    try {
      const debts = await prisma.debt.findMany({
        where: { userId: req.user.id },
        include: { repayments: { orderBy: { date: 'desc' } } },
        orderBy: { date: 'desc' },
      });
      res.json(debts);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/debts', authenticate, async (req: any, res) => {
    try {
      const { personName, amount, encryptedAmount, type, date, dueDate, notes, encryptedNotes } = req.body;
      const amountValue = encryptedAmount || amount;
      
      if (!personName || !amountValue || !type || !date) {
        return res.status(400).json({ error: 'Invalid input data' });
      }
      if (!['LENT', 'BORROWED'].includes(type)) {
        return res.status(400).json({ error: 'Invalid debt type' });
      }

      const debt = await prisma.debt.create({
        data: {
          personName,
          amount: encryptedAmount ? undefined : parseFloat(amount),
          encryptedAmount: encryptedAmount || undefined,
          type,
          date: new Date(date),
          dueDate: dueDate ? new Date(dueDate) : null,
          notes: encryptedNotes ? undefined : notes,
          encryptedNotes: encryptedNotes || undefined,
          userId: req.user.id,
        },
      });
      res.json(debt);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.patch('/api/debts/:id/pay', authenticate, async (req: any, res) => {
    try {
      const debtToPay = await prisma.debt.findUnique({ where: { id: req.params.id } });
      if (!debtToPay || debtToPay.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const debt = await prisma.debt.update({
        where: { id: req.params.id },
        data: { status: 'PAID' },
      });
      res.json(debt);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/debts/:id/repayments', authenticate, async (req: any, res) => {
    try {
      const { amount, encryptedAmount, date, notes, encryptedNotes } = req.body;
      const amountValue = encryptedAmount || amount;
      
      if (!amountValue) {
        return res.status(400).json({ error: 'Invalid repayment amount' });
      }
      
      const debtCheck = await prisma.debt.findUnique({ where: { id: req.params.id } });
      if (!debtCheck || debtCheck.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const repayment = await prisma.$transaction(async (tx) => {
        const rep = await tx.repayment.create({
          data: {
            amount: encryptedAmount ? undefined : parseFloat(amount),
            encryptedAmount: encryptedAmount || undefined,
            date: new Date(date),
            notes: encryptedNotes ? undefined : notes,
            encryptedNotes: encryptedNotes || undefined,
            debtId: req.params.id,
          },
        });
        
        const debt = await tx.debt.findUnique({
          where: { id: req.params.id },
          include: { repayments: true }
        });
        
        if (debt) {
          const totalRepaid = (debt.repayments || []).reduce((acc, r) => acc + (r.amount || 0), 0);
          if (totalRepaid >= debt.amount) {
            await tx.debt.update({
              where: { id: req.params.id },
              data: { status: 'PAID' }
            });
          }
        }
        return rep;
      });

      res.json(repayment);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/api/debts/:id', authenticate, async (req: any, res) => {
    try {
      const debtCheck = await prisma.debt.findUnique({
        where: { id: req.params.id }
      });
      if (!debtCheck || debtCheck.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await prisma.debt.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Settings Routes
  app.get('/api/settings', authenticate, async (req: any, res) => {
    try {
      const settings = await prisma.settings.findUnique({
        where: { userId: req.user.id },
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put('/api/settings', authenticate, async (req: any, res) => {
    try {
      const { name, currency, notifications, theme, billReminders, budgetAlerts, weeklySummaries, reminderDays } = req.body;
      
      const parsedDays = parseInt(reminderDays);
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return res.status(400).json({ error: 'Reminder days must be between 1 and 365' });
      }
      
      const settings = await prisma.settings.update({
        where: { userId: req.user.id },
        data: { 
          currency, 
          notifications, 
          theme,
          billReminders,
          budgetAlerts,
          weeklySummaries,
          reminderDays: parsedDays
        },
      });

      if (name !== undefined) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { name }
        });
      }

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  registerAIRoutes(app, { authenticate });
  registerExportRoutes(app, { authenticate, prisma });
  registerNotificationRoutes(app, { authenticate });
  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const maxPortAttempts = 10;
  const listenWithRetry = (port: number, attempt = 0) => {
    const server = app.listen(port, HOST, () => {
      activePort = port;
      console.log(`Server running on http://localhost:${port}`);
    });

    server.on('error', (error: any) => {
      if (error?.code === 'EADDRINUSE' && attempt < maxPortAttempts) {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Retrying on ${nextPort}...`);
        server.close(() => listenWithRetry(nextPort, attempt + 1));
        return;
      }

      console.error('Failed to start server:', error);
      process.exit(1);
    });
  };

  listenWithRetry(DEFAULT_PORT);
}

startServer();
