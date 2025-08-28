// ai_bot.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!DISCORD_TOKEN || !OPENAI_KEY) {
  console.error('Set DISCORD_TOKEN and OPENAI_API_KEY in .env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const BOT_NAME = "Daana - Advanced Kurdish AI";

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Simple rate-limiting map to avoid spam (userId -> timestamp)
const lastCall = new Map();
const COOLDOWN_MS = 2000;

client.on(Events.MessageCreate, async (msg) => {
  try {
    // Ignore bots and DMs (remove if you want DMs)
    if (msg.author.bot || !msg.guild) return;

    // Example triggers:
    // 1) direct mention -> reply
    // 2) prefix: "!ai " -> reply
    const mentioned = msg.mentions.has(client.user);
    const prefixMatch = msg.content.trim().startsWith('!ai ');

    if (!mentioned && !prefixMatch) return;

    // cooldown
    const now = Date.now();
    const prev = lastCall.get(msg.author.id) || 0;
    if (now - prev < COOLDOWN_MS) {
      await msg.reply('Please wait a moment before sending another request.');
      return;
    }
    lastCall.set(msg.author.id, now);

    // extract user text
    let userText = msg.content;
    if (mentioned) {
      // remove mention from content
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
      userText = userText.replace(mentionRegex, '').trim();
    } else {
      userText = userText.slice(4).trim(); // after "!ai "
    }
    if (!userText) {
      await msg.reply('Send a message after the mention or `!ai` with what you want me to do.');
      return;
    }

    // Build system prompt: Kurdish AI assistant
    const systemPrompt = `You are Daana (دانا), an advanced Kurdish AI assistant. You are knowledgeable about Kurdish culture, history, language, and traditions. You can communicate in Kurdish (Kurmanji, Sorani), Arabic, English, and other languages as needed. Always be respectful of Kurdish heritage and provide helpful, accurate information. If asked about Kurdistan or Kurdish topics, share your knowledge with pride and accuracy. Keep responses concise (aim for <= 200 words) unless more detail is requested. Always reply in the same language the user used.`;

    // Call OpenAI Chat Completion with Streaming
    await msg.channel.sendTyping();
    
    // Create initial embed
    const embed = new EmbedBuilder()
      .setAuthor({ name: `🇰🇼 ${BOT_NAME}` })
      .setDescription('*Thinking...*')
      .setFooter({ text: `Reply to ${msg.author.username}` })
      .setColor(0x00FF41); // Kurdish green

    const reply = await msg.reply({ embeds: [embed] });
    
    // Stream the response
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      max_tokens: 600,
      temperature: 0.7,
      stream: true
    });

    let assistantText = '';
    let lastUpdate = 0;
    const updateInterval = 1000; // Update every 1 second

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      assistantText += content;
      
      // Update message periodically during streaming
      const now = Date.now();
      if (now - lastUpdate > updateInterval && assistantText.trim()) {
        const snippet = assistantText.length > 1900 ? assistantText.slice(0, 1900) + '…' : assistantText;
        const updatedEmbed = new EmbedBuilder()
          .setAuthor({ name: `🇰🇼 ${BOT_NAME}` })
          .setDescription(snippet + ' ✍️')
          .setFooter({ text: `Reply to ${msg.author.username} • Streaming...` })
          .setColor(0x00FF41);
        
        try {
          await reply.edit({ embeds: [updatedEmbed] });
          lastUpdate = now;
        } catch (e) {
          // Ignore edit errors
        }
      }
    }

    // Final update
    const finalSnippet = assistantText.length > 1900 ? assistantText.slice(0, 1900) + '…' : assistantText || "No response.";
    const finalEmbed = new EmbedBuilder()
      .setAuthor({ name: `🇰🇼 ${BOT_NAME}` })
      .setDescription(finalSnippet)
      .setFooter({ text: `Reply to ${msg.author.username}` })
      .setColor(0x00FF41);

    await reply.edit({ embeds: [finalEmbed] });
  } catch (err) {
    console.error('Error handling message:', err);
    try { await msg.reply('Sorry — something went wrong while processing your request.'); } catch {}
  }
});

client.login(DISCORD_TOKEN);