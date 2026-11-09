// Frontend AI Service - Calls backend API endpoints
// The backend securely manages the Gemini API key

export const aiService = {
  async categorizeExpense(description: string, categories: { id: string; name: string }[]) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ description, categories })
      });

      if (!response.ok) {
        console.error('Categorization failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.categoryId;
    } catch (error) {
      console.error('AI Categorization failed', error);
      return null;
    }
  },

  async getSpendingInsights(transactions: any[], budgets: any[]) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No auth token for insights');
        return [];
      }

      console.log('Fetching insights for', transactions.length, 'transactions and', budgets.length, 'budgets');

      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactions, budgets })
      });

      if (!response.ok) {
        console.error('Insights API failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      console.log('Insights response:', data);
      const insights = data.insights || [];
      console.log('Returning', insights.length, 'insights');
      return insights;
    } catch (error) {
      console.error('AI Insights failed', error);
      return [];
    }
  },

  async generateAdvice(query: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return null;
      }

      const response = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        console.error('Advice generation failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.advice;
    } catch (error) {
      console.error('AI Advice generation failed', error);
      return null;
    }
  },

  async chatWithAssistant(message: string, history: any[], context: any, sessionId?: string) {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        return "Please log in to use the AI assistant.";
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, history, context, sessionId })
      });

      if (!response.ok) {
        console.error('Chat failed:', response.statusText);
        return { reply: "Sorry, I encountered an error. Please try again." };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('AI Chat failed', error);
      return { reply: "Sorry, I'm having trouble connecting. Please check your internet connection." };
    }
  },

  async getChatHistory() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { sessions: [] };

      const response = await fetch('/api/ai/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return { sessions: [] };
      return await response.json();
    } catch (error) {
      console.error('AI History failed', error);
      return { sessions: [] };
    }
  }
};
