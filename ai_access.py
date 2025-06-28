import openai
import os

# Set API Key
openai.api_key = os.getenv("OPENAI_API_KEY")

def ai_generate_ruling(arguments: str) -> str:
    prompt = f"""
You are an AI judge reviewing a legal case. Based on the provided case details below, write a very brief legal reasoning (1–2 lines max), then give a clear ruling.

Case Facts:
{arguments}
Look through Constitutional acts, laws, Legal precedant(ONLY CANADA and then further the PROVINCE mentioned) before ruling and here are some links
| Data Type       | Source & URL                                                                                                 | Use Case                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| Constitution    | [https://laws-lois.justice.gc.ca/eng/Const/index.html](https://laws-lois.justice.gc.ca/eng/Const/index.html) | Reference core constitutional law |
| Federal Acts    | [https://laws-lois.justice.gc.ca/eng/](https://laws-lois.justice.gc.ca/eng/)                                 | Reference federal statutes        |
| Provincial Acts | e.g., Ontario: [https://www.ontario.ca/laws](https://www.ontario.ca/laws)                                    | Provincial legal rules            |
| Case Law        | [https://www.canlii.org/en/](https://www.canlii.org/en/)                                                     | Retrieve precedents for rulings   |
| Supreme Court   | [https://scc-csc.lexum.com/scc-csc/en/nav.do](https://scc-csc.lexum.com/scc-csc/en/nav.do)                   | Highest authority precedents      |

Respond ONLY with the following format:
1. A 1-2 line legal reasoning.
2. Final ruling starting with "Ruling: ..."
3. cite what law/precedent was used

"""

    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a legal assistant AI trained to generate official legal rulings."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=300
        )
        result = response.choices[0].message.content.strip()
        print("AI ruling generated:", result)  # Optional: for debug
        return result
    except Exception as e:
        return f"Error generating AI ruling: {e}"
