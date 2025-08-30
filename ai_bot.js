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
    // 3) prefix: "!translate " -> translation
    const mentioned = msg.mentions.has(client.user);
    const prefixMatch = msg.content.trim().startsWith('!ai ');
    const translateMatch = msg.content.trim().startsWith('!translate ');

    if (!mentioned && !prefixMatch && !translateMatch) return;

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
    let isTranslation = false;
    
    if (mentioned) {
      // remove mention from content
      const mentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
      userText = userText.replace(mentionRegex, '').trim();
    } else if (translateMatch) {
      userText = userText.slice(11).trim(); // after "!translate "
      isTranslation = true;
    } else {
      userText = userText.slice(4).trim(); // after "!ai "
    }
    
    if (!userText) {
      const helpText = isTranslation ? 
        'Send text to translate after `!translate`. Example: `!translate to English: سڵاو چۆنی؟`' :
        'Send a message after the mention or `!ai` with what you want me to do.';
      await msg.reply(helpText);
      return;
    }

    // Build system prompt based on request type
    let systemPrompt;
    if (isTranslation) {
      systemPrompt = `You are a professional translator. 
Translate the given text accurately while preserving meaning and context.
You excel at translating Kurdish (Sorani, Badini), Arabic, English, Persian, Turkish, and other languages.
Always specify the detected source language and target language.
Provide only the translation unless asked for explanation.`;
    } else {
      systemPrompt = `You are a helpful, polite assistant and translator. 
Always detect the user's language and reply in that language. 
You must fully support Kurdish (Sorani, Badini) and answer naturally in it. 
You can translate between any languages including Kurdish, Arabic, English, Persian, Turkish, and others.
If asked to translate, provide accurate translations and specify the source and target languages.
Keep replies concise unless the user asks for more detail.`;
    }

    // Call OpenAI Chat Completion with Streaming
    await msg.channel.sendTyping();
    
    // Create initial embed
    const embedTitle = isTranslation ? `🌐 ${BOT_NAME} - Translator` : `🇰🇼 ${BOT_NAME}`;
    const embed = new EmbedBuilder()
      .setAuthor({ name: embedTitle })
      .setDescription(isTranslation ? '*Translating...*' : '*Thinking...*')
      .setFooter({ text: `Reply to ${msg.author.username}` })
      .setColor(isTranslation ? 0x4A90E2 : 0x00FF41); // Blue for translation, Kurdish green for general

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
          .setAuthor({ name: embedTitle })
          .setDescription(snippet + ' ✍️')
          .setFooter({ text: `Reply to ${msg.author.username} • ${isTranslation ? 'Translating...' : 'Streaming...'}` })
          .setColor(isTranslation ? 0x4A90E2 : 0x00FF41);
        
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
      .setAuthor({ name: embedTitle })
      .setDescription(finalSnippet)
      .setFooter({ text: `Reply to ${msg.author.username}` })
      .setColor(isTranslation ? 0x4A90E2 : 0x00FF41);

    await reply.edit({ embeds: [finalEmbed] });
  } catch (err) {
    console.error('Error handling message:', err);
    try { await msg.reply('Sorry — something went wrong while processing your request.'); } catch {}
  }
});

client.login(DISCORD_TOKEN);