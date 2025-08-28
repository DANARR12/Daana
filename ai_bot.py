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

SYSTEM_PROMPT = ("You are a helpful, polite assistant. "
                 "Always detect the user's language and reply in that language. "
                 "You must fully support Kurdish (Sorani, Kurmanji, Badini) and answer naturally in it. "
                 "Keep replies concise unless the user asks for more detail.")

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

    # Streaming response with Kurdish AI branding
    try:
        # Create initial embed
        embed = discord.Embed(
            title="🇰🇼 Daana - Advanced Kurdish AI", 
            description="*Thinking...*", 
            color=0x00FF41  # Kurdish green
        )
        embed.set_footer(text=f"Reply to {ctx.author.display_name}")
        message = await ctx.send(embed=embed)
        
        # Stream the response
        stream = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text}
            ],
            max_tokens=600,
            temperature=0.7,
            stream=True
        )
        
        assistant_text = ""
        last_update = 0
        update_interval = 1.5  # Update every 1.5 seconds
        
        import time
        for chunk in stream:
            if chunk.choices[0].delta.content:
                assistant_text += chunk.choices[0].delta.content
                
                # Update message periodically during streaming
                current_time = time.time()
                if current_time - last_update > update_interval and assistant_text.strip():
                    display_text = assistant_text[:1900] + "…" if len(assistant_text) > 1900 else assistant_text
                    
                    streaming_embed = discord.Embed(
                        title="🇰🇼 Daana - Advanced Kurdish AI", 
                        description=display_text + " ✍️", 
                        color=0x00FF41
                    )
                    streaming_embed.set_footer(text=f"Reply to {ctx.author.display_name} • Streaming...")
                    
                    try:
                        await message.edit(embed=streaming_embed)
                        last_update = current_time
                    except:
                        pass  # Ignore edit errors
        
        # Final update
        final_text = assistant_text[:1900] + "…" if len(assistant_text) > 1900 else assistant_text or "No response."
        final_embed = discord.Embed(
            title="🇰🇼 Daana - Advanced Kurdish AI", 
            description=final_text, 
            color=0x00FF41
        )
        final_embed.set_footer(text=f"Reply to {ctx.author.display_name}")
        await message.edit(embed=final_embed)
    except Exception as e:
        await ctx.send(f"Error: {e}")

bot.run(DISCORD_TOKEN)