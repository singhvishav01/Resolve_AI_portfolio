import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def ai_generate_ruling(arguments: str) -> str:
    prompt = f"""
You are an AI trained to provide legal reasoning and generate a court ruling based on the following information:

{arguments}

Your task is to:
1. Briefly explain any key legal reasoning (1-2 lines max).
2. Then, clearly state the final ruling starting with "Ruling:"

Do not include disclaimers or legal advice.
"""
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a legal assistant AI."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating AI ruling: {e}"
