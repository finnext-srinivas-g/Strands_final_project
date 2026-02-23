
import json
from strands import tool
from models.proverbs import ProverbsList

@tool
def get_weather(location: str):
    """Backend tool example: returns weather information for a location."""
    return json.dumps({"location": location, "weather": "70 degrees"})

@tool
def set_theme_color(theme_color: str):
    """Frontend-only tool example: request a UI theme color change."""
    return None

@tool
def update_proverbs(proverbs_list: ProverbsList):
    """Backend tool: replace the entire proverbs list."""
    return "Proverbs updated successfully."


