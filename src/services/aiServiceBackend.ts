import { GoogleGenAI, Type } from "@google/genai";

export const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const aiServiceBackend = {
  async categorizeExpense(description: string, categories: { id: string; name: string }[]) {
    try {
      const ai = getAIClient();
      if (!ai) return null;

      const categoryNames = categories.map(c => c.name).join(', ');
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Categorize this expense: "${description}". Available categories: ${categoryNames}. Return only the category name.`,
        config: {
          responseMimeType: "text/plain",
        },
      });

      const result = response.text?.trim() || '';
      const matchedCategory = categories.find(c => c.name.toLowerCase() === result.toLowerCase());
      return matchedCategory ? matchedCategory.id : null;
    } catch (error) {
      console.error("AI Categorization failed", error);
      return null;
    }
  },

  async getSpendingInsights(transactions: any[], budgets: any[]) {
    try {
      const ai = getAIClient();
      if (!ai) {
        // Return fallback insights when AI is not available
        return this.generateFallbackInsights(transactions, budgets);
      }

      // Calculate comprehensive analytics for the AI to analyze
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const currentMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd;
      });

      // If no transactions in current month, provide early insights
      if (currentMonthTransactions.length === 0) {
        return [
          {
            insight: "No transactions recorded this month yet",
            action: "Start tracking your expenses to get detailed financial insights and personalized recommendations"
          }
        ];
      }

      // Category analysis
      const categorySpending: Record<string, any> = {};
      let totalExpense = 0;
      let totalIncome = 0;
      
      currentMonthTransactions.forEach(t => {
        const cat = t.category?.name || 'Uncategorized';
        if (!categorySpending[cat]) {
          categorySpending[cat] = { income: 0, expense: 0, count: 0 };
        }
        if (t.type === 'INCOME') {
          categorySpending[cat].income += t.amount;
          totalIncome += t.amount;
        } else {
          categorySpending[cat].expense += t.amount;
          totalExpense += t.amount;
        }
        categorySpending[cat].count++;
      });

      // Budget overspending analysis
      const budgetOverspending = budgets
        .filter(b => b.spent > b.limit)
        .map(b => ({
          category: b.category?.name,
          limit: b.limit,
          spent: b.spent,
          overage: b.spent - b.limit,
          percentOver: ((b.spent - b.limit) / b.limit * 100).toFixed(1)
        }));

      // Daily average analysis
      const daysInMonth = Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      const dailyExpenseAverage = totalExpense / daysInMonth;
      
      // Spending trends (compare with previous month)
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const prevMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= prevMonthStart && tDate <= prevMonthEnd;
      });
      const prevMonthExpense = prevMonthTransactions
        .filter(t => t.type !== 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      // Highest spending category
      const highestSpendingCat = Object.entries(categorySpending)
        .map(([name, data]: any) => ({ name, expense: data.expense }))
        .sort((a, b) => b.expense - a.expense)[0];

      // Transaction frequency
      const avgTransactionsPerDay = currentMonthTransactions.length / daysInMonth;

      const analysisData = {
        monthSummary: {
          totalExpense,
          totalIncome,
          netCash: totalIncome - totalExpense,
          daysElapsed: daysInMonth,
          transactionCount: currentMonthTransactions.length,
          dailyExpenseAverage: dailyExpenseAverage.toFixed(2),
          avgTransactionsPerDay: avgTransactionsPerDay.toFixed(1)
        },
        categoryBreakdown: Object.entries(categorySpending)
          .map(([name, data]: any) => ({
            name,
            expense: data.expense,
            income: data.income,
            count: data.count
          }))
          .sort((a, b) => b.expense - a.expense),
        budgetStatus: {
          totalBudgets: budgets.length,
          onTrack: budgets.filter(b => b.spent <= b.limit).length,
          overBudget: budgetOverspending,
          utilizationRate: budgets.length > 0 
            ? (budgets.reduce((sum, b) => sum + Math.min(b.spent / b.limit, 1), 0) / budgets.length * 100).toFixed(1)
            : 0
        },
        trends: {
          thisMonthVsPrevious: prevMonthExpense > 0 
            ? ((totalExpense - prevMonthExpense) / prevMonthExpense * 100).toFixed(1)
            : 'N/A',
          highestCategory: highestSpendingCat,
          spendingPattern: avgTransactionsPerDay > 3 ? 'High frequency' : 
                          avgTransactionsPerDay > 1 ? 'Moderate frequency' : 
                          'Low frequency'
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `You are a financial advisor analyzing a user's spending data. Analyze this comprehensive spending data and provide 4-5 concise, actionable insights or recommendations. Be specific about patterns you observe in the charts/data and provide clear actionable tips to save money or improve budget management.

Data Analysis:
${JSON.stringify(analysisData, null, 2)}

Important: 
- Identify spending patterns from the data
- Highlight budget concerns
- Suggest specific areas to reduce spending
- Recognize trends vs previous period
- Consider transaction frequency and daily averages
- Provide practical, implementable advice

Format each insight with a clear observation and specific action the user can take.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                insight: { type: Type.STRING },
                action: { type: Type.STRING }
              },
              required: ["insight", "action"]
            }
          }
        },
      });

      const result = JSON.parse(response.text || '[]');
      return result.length > 0 ? result : this.generateFallbackInsights(transactions, budgets);
    } catch (error) {
      console.error("AI Insights failed", error);
      // Return fallback insights on error
      return this.generateFallbackInsights(transactions, budgets);
    }
  },

  generateFallbackInsights(transactions: any[], budgets: any[]) {
    // Generate basic insights based on simple analysis
    const insights: any[] = [];
    
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
    });

    if (currentMonthTransactions.length === 0) {
      return [{
        insight: "No transactions recorded this month yet",
        action: "Start tracking your expenses to get detailed financial insights and personalized recommendations"
      }];
    }

    // Calculate basic metrics
    let totalExpense = 0;
    let expensesByCategory: Record<string, number> = {};

    currentMonthTransactions.forEach(t => {
      if (t.type !== 'INCOME') {
        totalExpense += t.amount;
        const cat = t.category?.name || 'Uncategorized';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
      }
    });

    // Insight 1: Highest spending category
    const highestCat = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];
    if (highestCat) {
      insights.push({
        insight: `Your highest spending category is ${highestCat[0]} at $${highestCat[1].toFixed(2)}`,
        action: `Review your ${highestCat[0]} expenses and identify areas where you can reduce spending`
      });
    }

    // Insight 2: Budget status
    const overBudgetCount = budgets.filter(b => b.spent > b.limit).length;
    if (overBudgetCount > 0) {
      insights.push({
        insight: `You have ${overBudgetCount} budget(s) that are over limit`,
        action: `Review your over-budget categories and adjust spending habits to stay within limits`
      });
    } else if (budgets.length > 0) {
      insights.push({
        insight: "Great! You're staying within all your budgets",
        action: "Keep up this positive spending behavior and consider increasing savings goals"
      });
    }

    // Insight 3: Transaction frequency
    const daysInMonth = Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
    const avgTransactionsPerDay = currentMonthTransactions.length / daysInMonth;
    if (avgTransactionsPerDay > 3) {
      insights.push({
        insight: "You have high transaction frequency - averaging over 3 transactions per day",
        action: "Consider batching your purchases and planning shopping trips to reduce impulse buying"
      });
    }

    // Insight 4: Daily spending average
    const dailyExpenseAverage = totalExpense / daysInMonth;
    insights.push({
      insight: `Your daily spending average is $${dailyExpenseAverage.toFixed(2)}`,
      action: `Set a daily spending target slightly below this to gradually reduce your overall expenses`
    });

    // Ensure at least 3 insights
    if (insights.length < 3) {
      insights.push({
        insight: "Track more transactions to get more personalized insights",
        action: "Log your daily expenses regularly for better financial awareness and recommendations"
      });
    }

    return insights.slice(0, 5); // Return max 5 insights
  },

  async generateAdvice(query: string) {
    try {
      const ai = getAIClient();
      if (!ai) return null;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Provide financial advice based on this query: "${query}". Keep response concise and actionable.`,
        config: {
          responseMimeType: "text/plain",
        },
      });

      return response.text?.trim() || null;
    } catch (error) {
      console.error("AI Advice generation failed", error);
      return null;
    }
  }
};
