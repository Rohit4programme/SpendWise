import { prisma } from '../lib/prisma';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

// Define all agentic tools available to the AI
export const AGENTIC_TOOLS: ToolDefinition[] = [
  {
    name: "add_transaction",
    description: "Add a new financial transaction (expense or income) to track spending",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "The amount of the transaction." },
        categoryName: { type: "string", description: "The category name (e.g., Food, Transport, Salary, Rent)." },
        description: { type: "string", description: "A brief description of the transaction." },
        type: { type: "string", enum: ["EXPENSE", "INCOME"], description: "EXPENSE or INCOME" },
        date: { type: "string", description: "Date in ISO format (optional, defaults to today)" }
      },
      required: ["amount", "categoryName", "type"]
    }
  },
  {
    name: "set_budget",
    description: "Set or update a monthly budget limit for a spending category",
    parameters: {
      type: "object",
      properties: {
        categoryName: { type: "string", description: "The category name (e.g., Food, Transport, Rent)." },
        limit: { type: "number", description: "The monthly budget limit amount." }
      },
      required: ["categoryName", "limit"]
    }
  },
  {
    name: "get_spending_summary",
    description: "Get a summary of spending for the current month by category",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_budget_status",
    description: "Get the current budget status showing spent vs limit for each category",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "create_category",
    description: "Create a new spending category",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the category" },
        color: { type: "string", description: "Color code for the category (e.g., #FF5733)" },
        icon: { type: "string", description: "Icon name for the category (e.g., ShoppingCart, Utensils)" },
        type: { type: "string", enum: ["EXPENSE", "INCOME"], description: "Category type" }
      },
      required: ["name", "color", "icon"]
    }
  },
  {
    name: "add_recurring_transaction",
    description: "Set up a recurring transaction (e.g., monthly rent, salary)",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "The amount of the recurring transaction" },
        categoryName: { type: "string", description: "The category name" },
        description: { type: "string", description: "Description of the recurring transaction" },
        type: { type: "string", enum: ["EXPENSE", "INCOME"], description: "EXPENSE or INCOME" },
        frequency: { type: "string", enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], description: "How often it recurs" },
        startDate: { type: "string", description: "Start date in ISO format" }
      },
      required: ["amount", "categoryName", "frequency", "startDate"]
    }
  },
  {
    name: "get_recent_transactions",
    description: "Get the most recent transactions",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of recent transactions to fetch (default 10)" }
      }
    }
  },
  {
    name: "add_debt",
    description: "Record a debt/loan that needs to be paid off",
    parameters: {
      type: "object",
      properties: {
        personName: { type: "string", description: "Name of the creditor/lender" },
        amount: { type: "number", description: "Total debt amount" },
        type: { type: "string", description: "Type of debt (e.g., Personal Loan, Credit Card, Mortgage)" },
        dueDate: { type: "string", description: "Due date in ISO format (optional)" },
        notes: { type: "string", description: "Additional notes about the debt" }
      },
      required: ["personName", "amount"]
    }
  },
  {
    name: "get_debts",
    description: "Get all outstanding debts",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "add_bill",
    description: "Add a bill reminder for upcoming payments",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the bill (e.g., Electricity, Internet)" },
        amount: { type: "number", description: "Bill amount" },
        dueDate: { type: "string", description: "Due date in ISO format (e.g., 2026-05-31)" },
        categoryName: { type: "string", description: "Category for this bill (optional, defaults to Bills)" }
      },
      required: ["name", "amount", "dueDate"]
    }
  },
  {
    name: "get_bills",
    description: "Get all upcoming bills",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "update_transaction",
    description: "Update an existing transaction",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "The ID of the transaction to update" },
        amount: { type: "number", description: "New amount (optional)" },
        categoryName: { type: "string", description: "New category (optional)" },
        description: { type: "string", description: "New description (optional)" },
        date: { type: "string", description: "New date in ISO format (optional)" }
      },
      required: ["transactionId"]
    }
  },
  {
    name: "delete_transaction",
    description: "Delete a transaction",
    parameters: {
      type: "object",
      properties: {
        transactionId: { type: "string", description: "The ID of the transaction to delete" }
      },
      required: ["transactionId"]
    }
  }
];

// Execute agentic tool calls
export async function executeAgenticTool(toolCall: ToolCall, userId: string): Promise<string> {
  const { name, args } = toolCall;

  try {
    switch (name) {
      case "add_transaction":
        return await addTransaction(userId, args);
      case "set_budget":
        return await setBudget(userId, args);
      case "get_spending_summary":
        return await getSpendingSummary(userId);
      case "get_budget_status":
        return await getBudgetStatus(userId);
      case "create_category":
        return await createCategory(userId, args);
      case "add_recurring_transaction":
        return await addRecurringTransaction(userId, args);
      case "get_recent_transactions":
        return await getRecentTransactions(userId, args);
      case "add_debt":
        return await addDebt(userId, args);
      case "get_debts":
        return await getDebts(userId);
      case "add_bill":
        return await addBill(userId, args);
      case "get_bills":
        return await getBills(userId);
      case "update_transaction":
        return await updateTransaction(userId, args);
      case "delete_transaction":
        return await deleteTransaction(userId, args);
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    return `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Tool implementations
async function addTransaction(userId: string, args: any): Promise<string> {
  const { amount, categoryName, description, type, date } = args;

  if (!amount || !categoryName || !type) {
    return "Missing required fields: amount, categoryName, type";
  }

  try {
    // First, try to find the exact category
    let category = await prisma.category.findFirst({
      where: {
        userId,
        name: { mode: 'insensitive', equals: categoryName }
      }
    });

    // If not found, try to find any category for the user
    if (!category) {
      category = await prisma.category.findFirst({
        where: { userId }
      });
    }

    // If still no category, create a default one
    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: categoryName,
          color: '#3B82F6',
          icon: 'ShoppingCart',
          type: type === 'INCOME' ? 'INCOME' : 'EXPENSE'
        }
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: parseFloat(String(amount)),
        categoryId: category.id,
        type: type.toUpperCase(),
        description: description || `Added via AI: ${categoryName}`,
        date: date ? new Date(date) : new Date()
      },
      include: { category: true }
    });

    return `✓ Successfully added $${amount} ${type.toLowerCase()} to ${category.name}. Transaction recorded.`;
  } catch (error) {
    throw new Error(`Failed to add transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function setBudget(userId: string, args: any): Promise<string> {
  const { categoryName, limit } = args;

  if (!categoryName || !limit) {
    return "Missing required fields: categoryName, limit";
  }

  try {
    const category = await prisma.category.findFirst({
      where: {
        userId,
        name: { mode: 'insensitive', equals: categoryName }
      }
    });

    if (!category) {
      return `Category "${categoryName}" not found. Please create it first.`;
    }

    const now = new Date();
    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryId: category.id,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    });

    if (existingBudget) {
      await prisma.budget.update({
        where: { id: existingBudget.id },
        data: { limit: parseFloat(String(limit)) }
      });
    } else {
      await prisma.budget.create({
        data: {
          userId,
          categoryId: category.id,
          limit: parseFloat(String(limit)),
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      });
    }

    return `✓ Successfully set a budget of $${limit} for ${category.name} this month.`;
  } catch (error) {
    throw new Error(`Failed to set budget: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getSpendingSummary(userId: string): Promise<string> {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.groupBy({
      by: ['categoryId', 'type'],
      where: {
        userId,
        date: { gte: startOfMonth }
      },
      _sum: { amount: true },
      _count: true
    });

    const categoryIds = [...new Set(transactions.map(t => t.categoryId))];
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } }
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    let summary = `📊 Monthly Spending Summary (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}):\n\n`;

    const groupedByCategory = new Map<string, { expenses: number; income: number }>();
    transactions.forEach(t => {
      const cat = categoryMap.get(t.categoryId) || 'Unknown';
      if (!groupedByCategory.has(cat)) {
        groupedByCategory.set(cat, { expenses: 0, income: 0 });
      }
      const data = groupedByCategory.get(cat)!;
      if (t.type === 'EXPENSE') {
        data.expenses += t._sum.amount || 0;
      } else {
        data.income += t._sum.amount || 0;
      }
    });

    let totalExpenses = 0;
    let totalIncome = 0;

    groupedByCategory.forEach((data, cat) => {
      if (data.expenses > 0) {
        summary += `• ${cat}: $${data.expenses.toFixed(2)}\n`;
        totalExpenses += data.expenses;
      }
    });

    summary += `\nTotal Expenses: $${totalExpenses.toFixed(2)}\n`;

    groupedByCategory.forEach((data, cat) => {
      if (data.income > 0) {
        summary += `• Income (${cat}): $${data.income.toFixed(2)}\n`;
        totalIncome += data.income;
      }
    });

    summary += `\nTotal Income: $${totalIncome.toFixed(2)}\nNet: $${(totalIncome - totalExpenses).toFixed(2)}`;

    return summary;
  } catch (error) {
    throw new Error(`Failed to get spending summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getBudgetStatus(userId: string): Promise<string> {
  try {
    const now = new Date();
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      },
      include: { category: true }
    });

    if (budgets.length === 0) {
      return "No budgets set for this month. Would you like me to help you create one?";
    }

    let status = `💰 Budget Status for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}:\n\n`;

    budgets.forEach(budget => {
      const percentage = (budget.spent / budget.limit * 100).toFixed(1);
      const remaining = (budget.limit - budget.spent).toFixed(2);
      const status_icon = budget.spent > budget.limit ? '⚠️' : budget.spent > budget.limit * 0.8 ? '⚡' : '✓';
      
      status += `${status_icon} ${budget.category.name}: $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(2)} (${percentage}%)`;
      if (budget.spent > budget.limit) {
        status += ` - OVER by $${Math.abs(parseFloat(remaining)).toFixed(2)}`;
      } else {
        status += ` - $${remaining} remaining`;
      }
      status += '\n';
    });

    return status;
  } catch (error) {
    throw new Error(`Failed to get budget status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function createCategory(userId: string, args: any): Promise<string> {
  const { name, color, icon, type } = args;

  if (!name || !color || !icon) {
    return "Missing required fields: name, color, icon";
  }

  try {
    const existingCategory = await prisma.category.findFirst({
      where: {
        userId,
        name: { mode: 'insensitive', equals: name }
      }
    });

    if (existingCategory) {
      return `Category "${name}" already exists.`;
    }

    await prisma.category.create({
      data: {
        userId,
        name,
        color,
        icon,
        type: type || 'EXPENSE'
      }
    });

    return `✓ Successfully created new category "${name}".`;
  } catch (error) {
    throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function addRecurringTransaction(userId: string, args: any): Promise<string> {
  const { amount, categoryName, description, type, frequency, startDate } = args;

  if (!amount || !categoryName || !frequency || !startDate) {
    return "Missing required fields: amount, categoryName, frequency, startDate";
  }

  try {
    const category = await prisma.category.findFirst({
      where: {
        userId,
        name: { mode: 'insensitive', equals: categoryName }
      }
    });

    if (!category) {
      return `Category "${categoryName}" not found. Please create it first.`;
    }

    const start = new Date(startDate);
    
    await prisma.recurringTransaction.create({
      data: {
        userId,
        amount: parseFloat(String(amount)),
        categoryId: category.id,
        type: type?.toUpperCase() || 'EXPENSE',
        description: description || categoryName,
        frequency: frequency.toUpperCase(),
        startDate: start,
        dayOfMonth: start.getDate(),
        isActive: true
      }
    });

    return `✓ Successfully set up recurring ${type?.toLowerCase() || 'expense'} of $${amount} ${frequency.toLowerCase()} for ${category.name} starting ${start.toLocaleDateString()}.`;
  } catch (error) {
    throw new Error(`Failed to add recurring transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getRecentTransactions(userId: string, args: any): Promise<string> {
  try {
    const limit = Math.min(args.limit || 10, 20);
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: limit
    });

    if (transactions.length === 0) {
      return "No transactions found.";
    }

    let summary = `📋 Recent Transactions (Last ${limit}):\n\n`;
    transactions.forEach((t, i) => {
      const icon = t.type === 'EXPENSE' ? '📉' : '📈';
      summary += `${i + 1}. ${icon} ${t.category.name}: $${t.amount.toFixed(2)} - ${t.description}\n   ${new Date(t.date).toLocaleDateString()}\n`;
    });

    return summary;
  } catch (error) {
    throw new Error(`Failed to get recent transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function addDebt(userId: string, args: any): Promise<string> {
  const { personName, amount, type, dueDate, notes } = args;

  if (!personName || !amount) {
    return "Missing required fields: personName, amount";
  }

  try {
    await prisma.debt.create({
      data: {
        userId,
        personName,
        amount: parseFloat(String(amount)),
        type: type || 'Personal Loan',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes || undefined
      }
    });

    return `✓ Successfully recorded debt of $${amount} to ${personName}${dueDate ? ` due ${new Date(dueDate).toLocaleDateString()}` : ''}.`;
  } catch (error) {
    throw new Error(`Failed to add debt: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getDebts(userId: string): Promise<string> {
  try {
    const debts = await prisma.debt.findMany({
      where: { userId, status: { not: 'PAID' } },
      orderBy: { dueDate: 'asc' }
    });

    if (debts.length === 0) {
      return "Great news! You have no outstanding debts.";
    }

    let summary = `💳 Outstanding Debts:\n\n`;
    let totalDebt = 0;
    debts.forEach((d, i) => {
      const daysUntilDue = d.dueDate ? Math.ceil((new Date(d.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
      const urgency = daysUntilDue === null ? '⭐' : daysUntilDue < 7 ? '🔴' : daysUntilDue < 14 ? '🟠' : '🟡';
      summary += `${i + 1}. ${urgency} ${d.personName} (${d.type}): $${d.amount.toFixed(2)}`;
      if (d.dueDate) {
        summary += ` (Due: ${new Date(d.dueDate).toLocaleDateString()})`;
      }
      summary += '\n';
      totalDebt += d.amount;
    });

    summary += `\nTotal Debt: $${totalDebt.toFixed(2)}`;
    return summary;
  } catch (error) {
    throw new Error(`Failed to get debts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function addBill(userId: string, args: any): Promise<string> {
  const { name, amount, dueDate, categoryName } = args;

  if (!name || !amount || !dueDate) {
    return "Missing required fields: name, amount, dueDate";
  }

  try {
    let category = await prisma.category.findFirst({
      where: {
        userId,
        name: { mode: 'insensitive', equals: categoryName || 'Bills' }
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          userId,
          name: 'Bills',
          color: '#FF6B6B',
          icon: 'FileText'
        }
      });
    }

    await prisma.bill.create({
      data: {
        userId,
        name,
        amount: parseFloat(String(amount)),
        dueDate: new Date(dueDate),
        categoryId: category.id
      }
    });

    const dueDateObj = new Date(dueDate);
    return `✓ Successfully added bill "${name}" for $${amount} due on ${dueDateObj.toLocaleDateString()}.`;
  } catch (error) {
    throw new Error(`Failed to add bill: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getBills(userId: string): Promise<string> {
  try {
    const now = new Date();
    const bills = await prisma.bill.findMany({
      where: { userId, isPaid: false },
      orderBy: { dueDate: 'asc' }
    });

    if (bills.length === 0) {
      return "No bills set up yet.";
    }

    let summary = `📄 Upcoming Bills:\n\n`;
    let totalMonthly = 0;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    bills.forEach((b, i) => {
      const billDate = new Date(b.dueDate);
      const isOverdue = billDate < now;
      const urgency = isOverdue ? '🔴' : billDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000 ? '🟠' : '🟡';
      
      summary += `${i + 1}. ${urgency} ${b.name}: $${b.amount.toFixed(2)} (Due: ${billDate.toLocaleDateString()})`;
      if (isOverdue) {
        summary += ' - OVERDUE';
      }
      summary += '\n';

      // Only count bills in current month for total
      if (billDate.getMonth() === currentMonth && billDate.getFullYear() === currentYear) {
        totalMonthly += b.amount;
      }
    });

    if (totalMonthly > 0) {
      summary += `\nBills Due This Month: $${totalMonthly.toFixed(2)}`;
    }
    return summary;
  } catch (error) {
    throw new Error(`Failed to get bills: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function updateTransaction(userId: string, args: any): Promise<string> {
  const { transactionId, amount, categoryName, description, date } = args;

  if (!transactionId) {
    return "Transaction ID is required.";
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { user: true }
    });

    if (!transaction || transaction.userId !== userId) {
      return "Transaction not found or you don't have permission to update it.";
    }

    const updateData: any = {};

    if (amount !== undefined) {
      updateData.amount = parseFloat(String(amount));
    }

    if (categoryName) {
      const category = await prisma.category.findFirst({
        where: {
          userId,
          name: { mode: 'insensitive', equals: categoryName }
        }
      });
      if (category) {
        updateData.categoryId = category.id;
      }
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (date !== undefined) {
      updateData.date = new Date(date);
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData
    });

    return `✓ Successfully updated transaction.`;
  } catch (error) {
    throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function deleteTransaction(userId: string, args: any): Promise<string> {
  const { transactionId } = args;

  if (!transactionId) {
    return "Transaction ID is required.";
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.userId !== userId) {
      return "Transaction not found or you don't have permission to delete it.";
    }

    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    return `✓ Successfully deleted transaction.`;
  } catch (error) {
    throw new Error(`Failed to delete transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
