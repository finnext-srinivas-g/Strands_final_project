# Strands Backend with AG-UI Protocol Integration

## Overview
This project integrates an AWS Strands agent with the AG-UI protocol, exposing it via a FastAPI backend for frontend consumption.

## Structure
- `main.py`: FastAPI server, agent setup, AG-UI integration
- `models/proverbs.py`: Pydantic models for proverbs
- `tools/proverbs_tools.py`: Agent tools
- `state/proverbs_state.py`: State management functions
- `config/agent_config.py`: Shared state config
- `.env`: Environment variables (e.g., `OPENAI_API_KEY`)
- `requirements.txt`: Python dependencies

## Setup
1. Install dependencies:
   ```
   uv pip install -r requirements.txt
   ```
2. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=your-key-here
   ```
3. Run the server:
   ```
   uvicorn main:app --reload
   ```

## Endpoint
- The agent is available at: http://localhost:8000
