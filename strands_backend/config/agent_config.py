from ag_ui_strands import StrandsAgentConfig, ToolBehavior
from state.proverbs_state import build_proverbs_prompt, proverbs_state_from_args

shared_state_config = StrandsAgentConfig(
    state_context_builder=build_proverbs_prompt,
    tool_behaviors={
        "update_proverbs": ToolBehavior(
            skip_messages_snapshot=True,
            state_from_args=proverbs_state_from_args,
        )
    },
)
