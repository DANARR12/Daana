import discord
from discord.ext import commands
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
if not DISCORD_TOKEN:
    raise RuntimeError("Set DISCORD_TOKEN in .env")

intents = discord.Intents.all()
bot = commands.Bot(command_prefix="/", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")
    
    # Streaming presence
    activity = discord.Streaming(
        name="Advanced Kurdish AI",   # status text
        url="https://twitch.tv/daana_ai"  # required for streaming status
    )
    
    await bot.change_presence(status=discord.Status.online, activity=activity)
    print(f"🎥 Now streaming: Advanced Kurdish AI")

bot.run(DISCORD_TOKEN)