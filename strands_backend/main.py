import os
from dotenv import load_dotenv
from strands.models.openai import OpenAIModel
from strands import Agent
from ag_ui_strands import StrandsAgent, create_strands_app
from config.agent_config import shared_state_config
from tools.proverbs_tools import update_proverbs, get_weather, set_theme_color
from tools.csv_tools import get_csv_preview, query_csv_data, answer_csv_question, group_by_csv, get_csv_summary
from fastapi.middleware.cors import CORSMiddleware

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

api_key = os.getenv("OPENAI_API_KEY", "")
model = OpenAIModel(
    client_args={"api_key": api_key},
    model_id="gpt-4o",
)
system_prompt = (
    "You are a helpful and wise assistant. "
    "Use get_csv_preview for full CSV tables. "
    "Use query_csv_data for row filtering. "
    "Use get_csv_summary for dashboard KPI summary of CSV data. "
    "Use group_by_csv for deterministic grouped analytics (count/sum/avg/min/max). "
    "Use answer_csv_question for analytical CSV questions like highest salary, lowest salary, "
    "employee count, department count, and employees per department. "
    "Use update_proverbs only for proverb list management."
)

strands_agent = Agent(
    model=model,
    system_prompt=system_prompt,
    tools=[
        update_proverbs,
        get_weather,
        set_theme_color,
        get_csv_preview,
        query_csv_data,
        get_csv_summary,
        group_by_csv,
        answer_csv_question,
    ],
)

agui_agent = StrandsAgent(
    agent=strands_agent,
    name="proverbs_agent",
    description="A proverbs and data assistant that can query CSV data",
    config=shared_state_config,
)


app = create_strands_app(agui_agent, "/")

from fastapi import FastAPI, UploadFile, File, Request


@app.get("/")
def root():
    return {"message": "Strands Backend is running!"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("SERVER_PORT", 8010))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
