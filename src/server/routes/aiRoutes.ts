import type { Express } from 'express';
import { aiServiceBackend } from '../../services/aiServiceBackend';
import { prisma } from '../../lib/prisma';
import { AGENTIC_TOOLS, executeAgenticTool } from '../../services/agenticToolsService';

interface AIRoutesDeps {
  authenticate: (req: any, res: any, next: any) => void;
}

export function registerAIRoutes(app: Express, { authenticate }: AIRoutesDeps) {
  app.get('/api/ai/history', authenticate, async (req: any, res) => {
    try {
      const chatSessions = await prisma.chatSession.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
      res.json({ sessions: chatSessions });
    } catch (error) {
      console.error('AI History API error:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  app.post('/api/ai/categorize', authenticate, async (req, res) => {
    try {
      const { description, categories } = req.body;

      if (!description || !categories || !Array.isArray(categories)) {
        return res.status(400).json({ error: 'Invalid input: description and categories array required' });
      }

      const result = await aiServiceBackend.categorizeExpense(description, categories);
      res.json({ categoryId: result });
    } catch (error) {
      console.error('AI Categorization API error:', error);
      res.status(500).json({ error: 'Failed to categorize expense' });
    }
  });

  app.post('/api/ai/insights', authenticate, async (req: any, res) => {
    try {
      const { transactions, budgets } = req.body;

      if (!Array.isArray(transactions) || !Array.isArray(budgets)) {
        console.error('Invalid input to insights API');
        return res.status(400).json({ error: 'Invalid input: transactions and budgets arrays required', insights: [] });
      }

      console.log('Generating insights for user', req.user?.id, 'with', transactions.length, 'transactions');
      const insights = await aiServiceBackend.getSpendingInsights(transactions, budgets);
      console.log('Generated', insights?.length || 0, 'insights');
      res.json({ insights: insights || [] });
    } catch (error) {
      console.error('AI Insights API error:', error);
      res.status(500).json({ error: 'Failed to generate insights', insights: [] });
    }
  });

  app.post('/api/ai/advice', authenticate, async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Invalid input: query string required' });
      }

      const advice = await aiServiceBackend.generateAdvice(query);
      res.json({ advice });
    } catch (error) {
      console.error('AI Advice API error:', error);
      res.status(500).json({ error: 'Failed to generate advice' });
    }
  });

  app.post('/api/ai/chat', authenticate, async (req: any, res) => {
    try {
      const { message, context, sessionId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Invalid input: message string required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured');
        const fallbackReply = 'I\'m currently in demo mode. To enable AI features, please set your GEMINI_API_KEY in the .env.local file. Get a free key at https://aistudio.google.com/apikey';
        return res.json({ reply: fallbackReply });
      }

      // 1. Manage/Create Chat Session
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const session = await prisma.chatSession.create({
          data: {
            userId: req.user.id,
            title: message.substring(0, 50),
          }
        });
        currentSessionId = session.id;
      } else {
        await prisma.chatSession.update({
          where: { id: currentSessionId },
          data: { updatedAt: new Date() }
        });
      }

      // 2. Fetch history if sessionId exists
      let historyPart = '';
      if (sessionId) {
        const pastMessages = await prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
        historyPart = pastMessages
          .reverse()
          .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
          .join('\n');
      }

      // 3. Save User Message
      await prisma.chatMessage.create({
        data: {
          sessionId: currentSessionId,
          role: 'user',
          text: message
        }
      });

      // --- Agentic Tools Definition ---
      const tools = [{ function_declarations: AGENTIC_TOOLS }];

      const contextStr = context ? JSON.stringify(context).substring(0, 500) : '';
      const systemPrompt = `You are SpendWise AI, an intelligent personal finance assistant with the ability to perform real financial tasks. You can:
✓ Add, update, and delete transactions
✓ Set and manage budgets by category
✓ Create and manage spending categories
✓ Set up recurring transactions (e.g., monthly rent, salary)
✓ Record and track debts
✓ Manage bills and payment reminders
✓ Provide spending summaries and budget status
✓ Retrieve transaction history

When a user asks you to perform a task, use the appropriate tool to execute it. Always provide clear feedback about what actions you've taken.

Guidelines:
- Be proactive in helping users manage their finances
- When adding transactions, ask for clarification if category is unclear
- When setting budgets, suggest reasonable limits based on spending patterns
- Always confirm successful actions with specific amounts and categories
- Suggest related actions (e.g., "Would you also like to set a budget for this category?")
- If a category doesn't exist, offer to create it
- Be encouraging and supportive of good financial habits

Current user context: ${contextStr}`;

      const messageToSend = `${historyPart ? `History:\n${historyPart}\n\n` : ''}User: ${message}`;

      try {
        const modelPriority = (process.env.GEMINI_MODEL_PRIORITY || 'gemini-2.0-flash,gemini-1.5-flash,gemini-1.5-pro')
          .split(',')
          .map((modelName) => modelName.trim())
          .filter(Boolean);

        let lastStatus = 0;

        for (const model of modelPriority) {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${messageToSend}` }] }],
              tools: [{ function_declarations: AGENTIC_TOOLS }],
              tool_config: { function_calling_config: { mode: "AUTO" } }
            }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log(`Gemini response for model ${model}:`, JSON.stringify(result, null, 2).substring(0, 500));
            
            const candidate = result.candidates?.[0];
            const part = candidate?.content?.parts?.[0];

            let reply = part?.text || "";

            // Handle Function Calls (Agentic Execution)
            if (part?.functionCall) {
              const { name, args } = part.functionCall;
              
              console.log(`Executing tool: ${name} with args:`, args);
              
              // Execute the tool
              let toolResult = '';
              try {
                toolResult = await executeAgenticTool({ name, args }, req.user.id);
                console.log(`Tool ${name} result:`, toolResult);
              } catch (toolError) {
                console.error(`Tool ${name} execution error:`, toolError);
                toolResult = `Error executing ${name}: ${toolError instanceof Error ? toolError.message : 'Unknown error'}`;
              }

              // Generate follow-up response based on tool result
              const secondResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    { role: "user", parts: [{ text: message }] },
                    candidate.content,
                    {
                      role: "function",
                      parts: [{ 
                        functionResponse: {
                          name: name,
                          response: { result: toolResult }
                        }
                      }]
                    }
                  ]
                }),
              });
              
              if (secondResponse.ok) {
                const secondResult = await secondResponse.json();
                reply = secondResult.candidates?.[0]?.content?.parts?.[0]?.text || toolResult;
              } else {
                reply = toolResult;
              }
            }

            if (!reply) reply = "I couldn't generate a response.";

            // 4. Save Model Response
            await prisma.chatMessage.create({
              data: {
                sessionId: currentSessionId,
                role: 'model',
                text: reply
              }
            });

            return res.json({ reply, sessionId: currentSessionId });
          }

          lastStatus = response.status;
          const lastErrorText = await response.text();
          console.error(`Gemini API error (${model}):`, response.status, lastErrorText);

          if (response.status === 401 || response.status === 403) {
            return res.json({ reply: 'Your API key appears to be invalid or expired. Please check your GEMINI_API_KEY in .env.local. Get a new key at https://aistudio.google.com/apikey' });
          }

          // Continue to next model on 429 or 503
          if (response.status === 429 || response.status === 503) {
            continue;
          }

          break;
        }

        if (lastStatus === 429 || lastStatus === 503) {
          return res.json({ reply: "SpendWise AI is currently experiencing high demand. Please try again in a few moments." });
        }

        return res.json({ reply: "I'm having trouble processing your request. Please try again." });
      } catch (error) {
        console.error('Gemini request failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Detailed error:', errorMessage);
        return res.json({ reply: 'Sorry, I encountered an error. Please try again.' });
      }
    } catch (error) {
      console.error('AI Chat API error:', error);
      res.status(500).json({ error: 'Failed to process chat' });
    }
  });
}
