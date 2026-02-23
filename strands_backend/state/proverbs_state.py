import json

def build_proverbs_prompt(input_data, user_message: str) -> str:
    state_dict = getattr(input_data, "state", None)
    if isinstance(state_dict, dict) and "proverbs" in state_dict:
        proverbs_json = json.dumps(state_dict["proverbs"], indent=2)
        return f"Current proverbs list:\n{proverbs_json}\n\nUser request: {user_message}"
    return user_message

async def proverbs_state_from_args(context):
    try:
        tool_input = context.tool_input
        if isinstance(tool_input, str):
            tool_input = json.loads(tool_input)
        proverbs_data = tool_input.get("proverbs_list", tool_input)
        if isinstance(proverbs_data, dict):
            proverbs_array = proverbs_data.get("proverbs", [])
        else:
            proverbs_array = []
        return {"proverbs": proverbs_array}
    except Exception:
        return None
