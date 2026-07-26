/**
 * Lunchbox Minimal AI Assistant ("Pippy / Mama Bento Buddy")
 * 
 * Implements: "Have a minimal AI assistant that uses these data in these notebooks 
 * to give you suggestions so it's personalized."
 */

class LunchboxAI {
  constructor() {
    this.chatHistory = [
      {
        sender: 'ai',
        text: "Hi there! I'm your Lunchbox Buddy 🦉. I read through all your notebooks so you don't have to hold it all in your head! Ask me for movie recommendations, task priorities, or quick reminders.",
        timestamp: 'Just now'
      }
    ];
  }

  getChatHistory() {
    return this.chatHistory;
  }

  addMessage(sender, text) {
    const msg = {
      sender,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.chatHistory.push(msg);
    this.renderChat();
    return msg;
  }

  async processUserQuery(userQuery) {
    this.addMessage('user', userQuery);
    this.showTypingIndicator(true);

    const settings = window.store.getSettings();
    let reply = '';

    try {
      if (settings.aiApiKey && settings.aiApiKey.trim().length > 10) {
        // Use external API if user provided a key
        reply = await this.queryExternalAI(userQuery, settings.aiApiKey);
      } else {
        // Use built-in smart personalized reasoning engine
        await new Promise(r => setTimeout(r, 600)); // Simulate thoughtful processing
        reply = this.generatePersonalizedSuggestion(userQuery);
      }
    } catch (e) {
      console.warn('AI query failed, falling back to built-in reasoning:', e);
      reply = this.generatePersonalizedSuggestion(userQuery);
    }

    this.showTypingIndicator(false);
    this.addMessage('ai', reply);
    if (window.notificationEngine) {
      window.notificationEngine.playSound('pop');
    }
  }

  // --- Built-in Personalized Heuristic Engine ---
  generatePersonalizedSuggestion(query) {
    const q = query.toLowerCase();
    const allItems = window.store.getAllItems();
    const activeItems = allItems.filter(i => !i.completed);
    const completedItems = allItems.filter(i => i.completed);

    // 1. Movie / TV Show Recommendation
    if (q.includes('movie') || q.includes('watch') || q.includes('tv') || q.includes('show') || q.includes('film') || q.includes('tonight')) {
      const watchItems = activeItems.filter(i => 
        i.notebookId === 'nb-movies' || 
        i.category.toLowerCase().includes('movie') || 
        i.category.toLowerCase().includes('tv') ||
        i.title.toLowerCase().includes('season') ||
        i.title.toLowerCase().includes('dune') ||
        i.title.toLowerCase().includes('severance')
      );

      if (watchItems.length === 0) {
        return "I checked your **Movies & TV Watchlist** notebook, but you've watched everything or haven't added new shows! Want to add a classic like *The Matrix* or *Succession*?";
      }
      
      const pick = watchItems[Math.floor(Math.random() * watchItems.length)];
      return `🎬 **Personalized Movie Night Pick:** Based on your watchlist, you should check out **"${pick.title}"** today!\n\n📌 *Why this?* You marked it as **${pick.priority.toUpperCase()}** priority${pick.due ? ` (due: ${pick.due})` : ''}. ${pick.notes ? `\n💬 *Your note:* "${pick.notes}"` : ''}\n\nShall I remind you about this again at 8:00 PM?`;
    }

    // 2. What should I do first / priorities / tasks
    if (q.includes('first') || q.includes('priority') || q.includes('do') || q.includes('task') || q.includes('work') || q.includes('action') || q.includes('busy')) {
      const highPriority = activeItems.filter(i => i.priority === 'high' || i.due.toLowerCase().includes('today'));
      
      if (highPriority.length === 0) {
        if (activeItems.length === 0) {
          return "🎉 **Your Lunchbox is completely unpacked!** You have zero pending tasks. Why not grab a book or watch a movie from your list?";
        }
        const firstActive = activeItems[0];
        return `📋 You don't have any 'High Priority' items marked for today. A great easy win to tackle first from your **${firstActive.notebookTitle}** would be:\n\n👉 **"${firstActive.title}"**\n\nTake 10 minutes and knock it out!`;
      }

      const topItem = highPriority[0];
      const otherCount = highPriority.length - 1;
      return `🍱 **Mama Bento's Priority Advice:**\nYou have **${highPriority.length} urgent reminder${highPriority.length === 1 ? '' : 's'}** packed today.\n\n🔥 **Start with this right now:**\n1. **${topItem.title}** *(in ${topItem.notebookTitle})*\n   *Due:* ${topItem.due} — *Notes:* ${topItem.notes || 'No extra notes.'}\n\n${otherCount > 0 ? `After finishing that, you still have **${otherCount} other high-priority task${otherCount === 1 ? '' : 's'}** waiting.` : 'Once you finish this, you can relax for the evening!'}`;
    }

    // 3. Books / Reading
    if (q.includes('book') || q.includes('read') || q.includes('author') || q.includes('study')) {
      const bookItems = activeItems.filter(i => i.notebookId === 'nb-books' || i.category.toLowerCase().includes('book') || i.category.toLowerCase().includes('read') || i.category.toLowerCase().includes('sci-fi'));
      if (bookItems.length === 0) {
        return "📚 Your **Books to Read** notebook has all items completed! Have you checked out any recent bestsellers like *Tomorrow, and Tomorrow, and Tomorrow*?";
      }
      const book = bookItems[0];
      return `📚 **Reading Suggestion:** Let's spend 20 minutes before bed reading **"${book.title}"**!\n\n📖 *Progress/Status:* ${book.due}\n💡 *Your note:* ${book.notes || 'Enjoy the journey!'}`;
    }

    // 4. Ideas & Sparks
    if (q.includes('idea') || q.includes('spark') || q.includes('gift') || q.includes('project') || q.includes('creative')) {
      const ideaItems = activeItems.filter(i => i.notebookId === 'nb-ideas' || i.category.toLowerCase().includes('idea') || i.category.toLowerCase().includes('gift'));
      if (ideaItems.length === 0) return "💡 No active sparks in your Ideas notebook right now! Got a sudden burst of inspiration? Add it with the + button above!";
      const idea = ideaItems[Math.floor(Math.random() * ideaItems.length)];
      return `💡 **Spark from your Remembrance Vault:**\nRemember when you wrote down: **"${idea.title}"**?\n\n✨ *Why not explore this today?* ${idea.notes ? `(${idea.notes})` : ''}`;
    }

    // 5. Quiz / Test remembrance
    if (q.includes('quiz') || q.includes('test') || q.includes('remember') || q.includes('memory') || q.includes('challenge')) {
      if (activeItems.length === 0) return "Not enough items in your Lunchbox to quiz you! Add some tasks or movies first.";
      const randomItem = activeItems[Math.floor(Math.random() * activeItems.length)];
      return `🧠 **Remembrance Quiz Time!**\nWithout peaking at your notebooks... do you remember what you wrote for this item in your **${randomItem.notebookTitle}** notebook?\n\n❓ **"${randomItem.title.substring(0, 15)}..."**\n\n*(Hint: It's marked as ${randomItem.priority.toUpperCase()} priority and due ${randomItem.due})*`;
    }

    // 6. Summary of Lunchbox / Day
    if (q.includes('summary') || q.includes('summarize') || q.includes('overview') || q.includes('day') || q.includes('everything') || q.includes('status')) {
      const total = allItems.length;
      const completed = completedItems.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const urgent = activeItems.filter(i => i.priority === 'high').length;

      return `🍱 **Your Lunchbox Summary Report:**\n\n📊 **Overall Remembrance Status:**\n- **Total Items Packed:** ${total}\n- **Completed / Unpacked:** ${completed} (${percent}% done!)\n- **Urgent Items Remaining:** ${urgent}\n\n⭐ **Top Recommendation:** You have made awesome progress! Focus on your ${urgent} urgent items today, then treat yourself to a movie from your Watchlist!`;
    }

    // 7. Grocery / Checklist / Packing
    if (q.includes('grocery') || q.includes('pack') || q.includes('shop') || q.includes('food') || q.includes('buy')) {
      const groceryItems = activeItems.filter(i => i.notebookId === 'nb-grocery' || i.category.toLowerCase().includes('food') || i.category.toLowerCase().includes('essential'));
      if (groceryItems.length === 0) return "🛒 Your grocery and packing checklist is completely clear! Nothing left to buy.";
      return `🛒 **Don't Forget These Essentials:**\nYou still have **${groceryItems.length} items** to get in your checklist:\n` + 
             groceryItems.map(i => `- **${i.title}** (${i.notes || i.category})`).join('\n');
    }

    // Default intelligent conversational response
    const randomActive = activeItems.length > 0 ? activeItems[Math.floor(Math.random() * activeItems.length)] : null;
    if (randomActive) {
      return `🦉 I'm analyzing your Lunchbox data! You currently have **${activeItems.length} uncompleted items** across your notebooks.\n\nDid you know you have **"${randomActive.title}"** sitting in your **${randomActive.notebookTitle}** notebook? Would you like me to help you prioritize or check it off?`;
    } else {
      return "🦉 Your Lunchbox is looking clean and organized! You can ask me things like:\n- *\"What movie should I watch tonight?\"*\n- *\"What's my #1 priority today?\"*\n- *\"Quiz me on my notes!\"*\n- *\"Summarize my Lunchbox\"*";
    }
  }

  // --- External AI Integration (if user provides Gemini / API key) ---
  async queryExternalAI(query, apiKey) {
    const allItems = window.store.getAllItems();
    const prompt = `You are "Pippy the Lunchbox Buddy", a playful, loving, slightly parental AI assistant for a productivity & remembrance app called Lunchbox (named after how parents remind us not to forget our lunchboxes).
Here is the JSON data of the user's current notebooks and items:
${JSON.stringify(allItems.slice(0, 30), null, 2)}

User asks: "${query}"

Provide a warm, playful, concise (2-3 paragraphs max), and personalized response based strictly on the items in their notebooks. Use emojis and markdown formatting.`;

    // Try Google Gemini API endpoint format if key looks like Gemini key
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic engine', err);
    }
    // Fallback if API fails
    return this.generatePersonalizedSuggestion(query);
  }

  showTypingIndicator(show) {
    const chatContainer = document.getElementById('ai-messages-container');
    if (!chatContainer) return;

    let indicator = document.getElementById('ai-typing-indicator');
    if (show && !indicator) {
      indicator = document.createElement('div');
      indicator.id = 'ai-typing-indicator';
      indicator.className = 'ai-message ai-typing';
      indicator.innerHTML = `
        <div class="ai-avatar">🦉</div>
        <div class="ai-bubble typing-dots">
          <span>.</span><span>.</span><span>.</span>
        </div>
      `;
      chatContainer.appendChild(indicator);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    } else if (!show && indicator) {
      indicator.remove();
    }
  }

  renderChat() {
    const chatContainer = document.getElementById('ai-messages-container');
    if (!chatContainer) return;

    chatContainer.innerHTML = this.chatHistory.map(msg => `
      <div class="ai-message ${msg.sender === 'user' ? 'user-message' : ''}">
        ${msg.sender === 'ai' ? '<div class="ai-avatar" title="Pippy the Lunchbox Buddy">🦉</div>' : ''}
        <div class="ai-bubble">
          <div class="ai-text">${this.formatMarkdown(msg.text)}</div>
          <div class="ai-time">${msg.timestamp}</div>
        </div>
        ${msg.sender === 'user' ? '<div class="user-avatar" title="You">👤</div>' : ''}
      </div>
    `).join('');

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n- /g, '<br/>• ')
      .replace(/\n1\. /g, '<br/>1. ')
      .replace(/\n2\. /g, '<br/>2. ')
      .replace(/\n3\. /g, '<br/>3. ');
  }

  triggerQuickAction(actionType) {
    const queries = {
      summary: "Summarize my Lunchbox priorities for today!",
      movie: "Pick a movie for me from my watchlist tonight!",
      priority: "What is the #1 urgent task I should do first?",
      quiz: "Quiz me on my notes so I don't forget!"
    };
    if (queries[actionType]) {
      const inputEl = document.getElementById('ai-chat-input');
      if (inputEl) inputEl.value = '';
      this.processUserQuery(queries[actionType]);
    }
  }
}

window.lunchboxAI = new LunchboxAI();
