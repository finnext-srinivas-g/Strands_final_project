from pydantic import BaseModel, Field
from typing import List

class ProverbsList(BaseModel):
    """Pydantic model representing the entire proverbs list.
    The `proverbs` field is a list of strings describing the stored proverbs.
    """
    proverbs: List[str] = Field(description="The complete list of proverbs")
