import os
import json
import logging
import time
from google import genai
from google.genai import types

logger = logging.getLogger("forge.llm.gemini")

def init_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        logger.warning("GEMINI_API_KEY is not set or is using the default placeholder. LLM diagnosis will be disabled.")
        return False
    
    try:
        # Client initialized with API key
        global _gemini_client
        _gemini_client = genai.Client(api_key=api_key)
        return True
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        return False

# Initialize on module load
_gemini_client = None
_is_ready = init_gemini()

def generate_diagnosis(machine_id: str, risk_score: float, fault_active: str | None, telemetry_window: list[dict]) -> dict | None:
    """
    Calls the Gemini API to analyze the telemetry window and return a structured JSON diagnosis.
    Returns None if the API key is not configured or if the call fails.
    """
    if not _is_ready or not _gemini_client:
        return None
    
    # We enforce JSON output structure in the prompt
    prompt = f"""
    You are an expert industrial machinery diagnostic AI for the F.O.R.G.E platform.
    An anomaly has been detected on machine: {machine_id}
    Current ML Risk Score: {risk_score:.1f}% (0-100 scale, >85 is critical)
    Injected Fault State: {fault_active or 'None (Organic Anomaly)'}

    Below is the trailing 30-second telemetry window (sampled context) leading up to this anomaly:
    {json.dumps(telemetry_window, indent=2)}

    Analyze the telemetry context and the current state.
    Generate a highly technical and precise root cause analysis and recommended action.

    You MUST respond with a raw JSON object (do not wrap in markdown code blocks) matching exactly this schema:
    {{
      "source": "FORGE-AI-GEMINI",
      "machine_id": "{machine_id}",
      "timestamp": {time.time()},
      "risk_score": {risk_score},
      "fault_type": "{fault_active or 'unknown'}",
      "fault_label": "<A human readable title for the fault, e.g. 'Severe Bearing Wear'>",
      "summary": "<A 1-sentence executive summary of the issue and urgency>",
      "root_cause": "<A detailed 2-3 sentence explanation of the technical root cause based on the telemetry trends (e.g. vibration spiking while RPM drops)>",
      "recommended_action": "<Specific, actionable next steps for the operator or engineer>",
      "prognosis": "<What will happen if this is ignored?>",
      "phase": 2
    }}
    """

    try:
        response = _gemini_client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            )
        )
        
        result_text = response.text
        # Safety fallback to strip markdown if the model hallucinates it despite the config
        if result_text.startswith("```json"):
            result_text = result_text[7:-3]
        elif result_text.startswith("```"):
            result_text = result_text[3:-3]
            
        diagnosis_data = json.loads(result_text.strip())
        return diagnosis_data
        
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}", exc_info=True)
        return None
