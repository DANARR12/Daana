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

const BOT_NAME = "AI Response";

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

    // Build system prompt: ask model to reply in same language and be concise, friendly
    const systemPrompt = `You are a helpful, polite assistant that always replies in the same language the user used. Keep answers concise (aim for <= 200 words) unless user asks for more. If the user input is in a language other than English, respond in that language.`;

    // Call OpenAI Chat Completion
    await msg.channel.sendTyping();
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini", // change to an available model for you (gpt-4o-mini/gpt-4o)
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      max_tokens: 600,
      temperature: 0.7
    });

    const assistantText = resp.choices?.[0]?.message?.content?.trim() || "No response.";
    // Trim longer outputs
    const snippet = assistantText.length > 1900 ? assistantText.slice(0, 1900) + '…' : assistantText;

    // Build embed similar to screenshot
    const embed = new EmbedBuilder()
      .setAuthor({ name: `🤖 ${BOT_NAME}` })
      .setDescription(snippet)
      .setFooter({ text: `Reply to ${msg.author.username}` })
      .setColor(0x5865F2);

    await msg.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Error handling message:', err);
    try { await msg.reply('Sorry — something went wrong while processing your request.'); } catch {}
  }
});

client.login(DISCORD_TOKEN);