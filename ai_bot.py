# ai_bot.py
import os
import discord
from discord import app_commands
from discord.ext import commands
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not DISCORD_TOKEN or not OPENAI_KEY:
    raise RuntimeError("Set DISCORD_TOKEN and OPENAI_API_KEY in .env")

openai_client = OpenAI(api_key=OPENAI_KEY)

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!ai ', intents=intents)

SYSTEM_PROMPT = ("You are a helpful assistant that replies in the same language the user used. "
                 "Keep replies concise and friendly; avoid long-winded explanations unless asked.")

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user} (id: {bot.user.id})")

# Using prefix command: "!ai <text>"
@bot.command(name='')  # because prefix is '!ai ' the command name is empty so the rest is text
async def ai(ctx, *, text: str = None):
    if ctx.author.bot:
        return
    if not text:
        await ctx.send("Write a message after `!ai` with what you'd like.")
        return

    # Simple cooldown per author (per invocation)
    try:
        await ctx.typing()
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ],
            max_tokens=600,
            temperature=0.7
        )
        assistant_text = response.choices[0].message.content.strip()
        # Keep discord message size limits
        if len(assistant_text) > 1900:
            assistant_text = assistant_text[:1900] + "…"
        # Send as embed
        embed = discord.Embed(title="🤖 AI Response", description=assistant_text, color=0x5865F2)
        embed.set_footer(text=f"Reply to {ctx.author.display_name}")
        await ctx.send(embed=embed)
    except Exception as e:
        await ctx.send(f"Error: {e}")

bot.run(DISCORD_TOKEN)