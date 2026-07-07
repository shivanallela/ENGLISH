import os
import json
import base64
import mimetypes
import requests
from config import Config

# Reusable System Prompt
SYSTEM_PROMPT = """
You are Antigravity AI – Intelligent Speech & Text Reconstruction Agent.

You are NOT a grammar checker.
You are NOT a spell checker.
You are NOT a chatbot.

You are an advanced Natural Language Understanding (NLU), Intent Reconstruction, and Communication Intelligence system whose primary objective is to determine what the user actually intended to communicate, regardless of how poorly it was written or spoken.

Your first priority is preserving meaning.
Your second priority is improving clarity.
Your third priority is teaching the user.

MISSION:
Given spoken or typed input, reconstruct the sentence the user most likely intended to communicate while preserving their original meaning, tone, and objective.
Your system must work even if the input contains:
• Grammar mistakes, spelling mistakes, typographical errors, missing words, wrong word order, repeated words, incorrect verb tense, wrong punctuation, capitalization mistakes, speech recognition errors, filler words, mixed languages, informal abbreviations, slang, broken sentence fragments, incomplete thoughts, ambiguous references, poor sentence structure.

Never simply rewrite text. Instead, deeply understand the user's intended meaning before generating a correction.

REASONING PROCESS:
Step 1: Identify Language, Domain, Context, Intent, Communication Goal.
Step 2: Analyze and detect every single issue (Grammar, Spelling, fillers, mixed languages, etc.).
Step 3: Recover Intent - Predict original intention, recover omitted words, infer context, resolve ambiguity, preserve meaning (do not change names, numbers, or technical terms).
Step 4: Semantic Reconstruction - Generate natural, grammatically correct sentences that preserve tone and emotion.
Step 5: Generate Alternative Reconstructions if multiple interpretations exist (top three ranked by confidence).
Step 6: Estimate Confidence (0 to 100). If confidence < 80, DO NOT GUESS. Ask exactly one clarification question in the "clarification_question" field.
Step 7: Explain Corrections - What changed, why, grammar rule, and communication improvement.
Step 8: Teaching Mode - Teach grammar, vocabulary, sentence structure, professional writing, natural English without overwhelming.

ABSOLUTE RULES:
- Never invent facts. Never hallucinate.
- Never alter names, dates, numbers, technical terms, or code.
- Never remove important information.
- Always preserve user intent.
- Meaning is more important than grammar.
- Communication is more important than perfection.
- When uncertain, ask. When confident, reconstruct naturally.

Respond strictly in the JSON format requested. Do NOT wrap output in ```json ... ``` blocks. Return a raw JSON string.
"""

# JSON Schema definition for Gemini Structured Outputs
GEMINI_JSON_SCHEMA = {
  "type": "OBJECT",
  "properties": {
    "language": { "type": "STRING", "description": "Primary detected language (e.g. English, Telugu-English Mix)" },
    "input_mode": { "type": "STRING", "description": "Mode of input: Voice, Live Speech, Typed Text, OCR, etc." },
    "intent": { "type": "STRING", "description": "Inferred intent of the user" },
    "communication_goal": { "type": "STRING", "description": "Goal of this communication (e.g. Request, Question, Complaint, Information)" },
    "emotion": { "type": "STRING", "description": "Detected tone or emotion (e.g. Professional, apologetic, urgent)" },
    "original_input": { "type": "STRING", "description": "Copy of the original user input" },
    "detected_issues": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "issue": { "type": "STRING", "description": "The specific error or glitch found" },
          "type": { "type": "STRING", "description": "Classification: spelling, grammar, filler, mixed_language, typo, etc." },
          "context": { "type": "STRING", "description": "Snippet context containing the issue" }
        },
        "required": ["issue", "type", "context"]
      }
    },
    "predicted_original_sentence": { "type": "STRING", "description": "Best guess of what sentence was fully intended" },
    "professional_version": { "type": "STRING", "description": "Professional/business version of the reconstruction" },
    "natural_version": { "type": "STRING", "description": "Natural, conversational English version of the reconstruction" },
    "formal_version": { "type": "STRING", "description": "Academic or formal version of the reconstruction" },
    "grammar_explanations": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "original": { "type": "STRING", "description": "Incorrect phrase" },
          "corrected": { "type": "STRING", "description": "Corrected equivalent" },
          "explanation": { "type": "STRING", "description": "Why it changed and what rule applies" },
          "rule": { "type": "STRING", "description": "Grammar or communication rule name" }
        },
        "required": ["original", "corrected", "explanation", "rule"]
      }
    },
    "vocabulary_improvements": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "original": { "type": "STRING", "description": "Simple/redundant word used" },
          "suggestion": { "type": "STRING", "description": "Slightly better vocabulary word" },
          "benefit": { "type": "STRING", "description": "How this enhances clarity" }
        },
        "required": ["original", "suggestion", "benefit"]
      }
    },
    "alternative_predictions": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "sentence": { "type": "STRING", "description": "Alternative reconstruction option" },
          "confidence": { "type": "INTEGER", "description": "Confidence score for this alternative (0-100)" },
          "scenario": { "type": "STRING", "description": "Under what context this interpretation is valid" }
        },
        "required": ["sentence", "confidence", "scenario"]
      }
    },
    "confidence_score": { "type": "INTEGER", "description": "Overall confidence score (0-100)" },
    "clarification_question": { "type": "STRING", "description": "Clarification question if confidence score is < 80. Leave blank otherwise." },
    "learning_tip": { "type": "STRING", "description": "Compact educational tip based on detected patterns" }
  },
  "required": [
    "language", "input_mode", "intent", "communication_goal", "emotion", "original_input",
    "detected_issues", "predicted_original_sentence", "professional_version", "natural_version",
    "formal_version", "grammar_explanations", "vocabulary_improvements", "alternative_predictions",
    "confidence_score", "clarification_question", "learning_tip"
  ]
};

# Preconfigured Preset Responses for Offline/Sandbox Mode
MOCK_PRESETS = {
  "speech-fillers": {
    "language": "English",
    "input_mode": "Voice Recording",
    "intent": "Reschedule meeting due to scheduling conflict",
    "communication_goal": "Request",
    "emotion": "Apologetic / Casual",
    "original_input": "uh look we need to like reschedule the meeting for tomorrow because um you know something came up and we can't make it... sort of.",
    "detected_issues": [
      { "issue": "uh, um", "type": "filler", "context": "uh look we need to... because um you know" },
      { "issue": "like", "type": "filler", "context": "need to like reschedule" },
      { "issue": "you know", "type": "filler", "context": "because um you know something" },
      { "issue": "sort of", "type": "filler", "context": "we can't make it... sort of." }
    ],
    "predicted_original_sentence": "We need to reschedule tomorrow's meeting because something came up and we cannot make it.",
    "natural_version": "We need to reschedule tomorrow's meeting because something came up and we won't be able to make it.",
    "professional_version": "We need to reschedule tomorrow's meeting due to an unexpected scheduling conflict. Please let me know what alternative times work for you.",
    "formal_version": "We kindly request to reschedule tomorrow's scheduled meeting due to unforeseen circumstances. We apologize for any inconvenience caused.",
    "grammar_explanations": [
      { "original": "reschedule the meeting for tomorrow", "corrected": "reschedule tomorrow's meeting", "explanation": "Shortening 'the meeting for tomorrow' to 'tomorrow's meeting' is more natural and concise in English.", "rule": "Conciseness & Possessive Nouns" },
      { "original": "we can't make it... sort of", "corrected": "we cannot make it", "explanation": "Removed the trailing verbal qualifier 'sort of' to state the inability to attend clearly.", "rule": "Clarity & Assertiveness" }
    ],
    "vocabulary_improvements": [
      { "original": "something came up", "suggestion": "an unexpected conflict arose", "benefit": "Elevates the explanation from casual slang to professional business correspondence." }
    ],
    "alternative_predictions": [
      { "sentence": "We need to reschedule tomorrow's meeting because we cannot attend.", "confidence": 95, "scenario": "Standard business schedule conflict" }
    ],
    "confidence_score": 98,
    "clarification_question": "",
    "learning_tip": "Speech fillers like 'uh', 'um', 'like', and qualifiers like 'sort of' weaken your spoken presence. Pausing silently instead of using fillers helps maintain clarity."
  },

  "telugu-mixed": {
    "language": "Telugu-English Mix",
    "input_mode": "Typed Text",
    "intent": "Inform about absence tomorrow due to health issues and request notifying the manager",
    "communication_goal": "Information / Request",
    "emotion": "Apologetic / Informative",
    "original_input": "nenu repu office ki ravatledhu because I am not feeling well and please update the manager.",
    "detected_issues": [
      { "issue": "nenu repu office ki ravatledhu", "type": "mixed_language", "context": "nenu repu office ki ravatledhu because I am..." }
    ],
    "predicted_original_sentence": "I am not coming to the office tomorrow because I am not feeling well; please update the manager.",
    "natural_version": "I won't be coming to the office tomorrow because I'm not feeling well. Please update the manager.",
    "professional_version": "Please inform the manager that I will be absent tomorrow due to illness. I will keep you updated on my status.",
    "formal_version": "I am writing to inform you that I will be unable to attend the office tomorrow due to health reasons. I request you to kindly notify the manager regarding my absence.",
    "grammar_explanations": [
      { "original": "nenu repu office ki ravatledhu", "corrected": "I am not coming to the office tomorrow", "explanation": "Translated the Telugu phrase 'nenu repu office ki ravatledhu' (నేను రేపు ఆఫీస్ కి రావట్లేదు) to standard English to make the sentence unified.", "rule": "Code-Switching Translation" }
    ],
    "vocabulary_improvements": [
      { "original": "not feeling well", "suggestion": "indisposed / unwell", "benefit": "More professional and formal way of describing health issues in a workplace context." }
    ],
    "alternative_predictions": [
      { "sentence": "Please tell the manager that I cannot come to work tomorrow because I'm sick.", "confidence": 95, "scenario": "Casual workplace notification" }
    ],
    "confidence_score": 96,
    "clarification_question": "",
    "learning_tip": "Mixing languages is common in conversation. In professional contexts, translating local language fragments beforehand ensures seamless global workplace communication."
  },

  "hindi-mixed": {
    "language": "Hindi-English Mix",
    "input_mode": "Chat Messages",
    "intent": "Request client presentation file for review",
    "communication_goal": "Request",
    "emotion": "Urgent / Focused",
    "original_input": "kya aap mujhe file send kar sakte hain? I need to review it before client presentation.",
    "detected_issues": [
      { "issue": "kya aap mujhe file send kar sakte hain?", "type": "mixed_language", "context": "kya aap mujhe file send kar sakte hain? I need to..." },
      { "issue": "before client presentation", "type": "grammar", "context": "before client presentation" }
    ],
    "predicted_original_sentence": "Can you send me the file? I need to review it before the client presentation.",
    "natural_version": "Could you please send me the file? I need to review it before the client presentation.",
    "professional_version": "Could you please send me the file? I need to review its contents prior to the upcoming client presentation.",
    "formal_version": "I kindly request you to forward the relevant document to me. It is necessary for me to review it in preparation for the client presentation.",
    "grammar_explanations": [
      { "original": "kya aap mujhe file send kar sakte hain?", "corrected": "Could you please send me the file?", "explanation": "Translated the Hindi request 'kya aap mujhe... sakte hain?' (क्या आप मुझे फाइल भेज सकते हैं?) into a polite English request.", "rule": "Code-Switching Translation" },
      { "original": "before client presentation", "corrected": "before the client presentation", "explanation": "Added the definite article 'the' before 'client presentation' to specify the meeting.", "rule": "Article Usage" }
    ],
    "vocabulary_improvements": [
      { "original": "send", "suggestion": "forward / share", "benefit": "Standard business jargon for distributing files." }
    ],
    "alternative_predictions": [
      { "sentence": "Please send the document so I can review it before the presentation.", "confidence": 95, "scenario": "General document request" }
    ],
    "confidence_score": 97,
    "clarification_question": "",
    "learning_tip": "Make sure singular countable nouns (like 'presentation') are preceded by articles ('the', 'a') or possessives ('our') to maintain proper grammatical structure."
  },

  "extreme-typos": {
    "language": "English",
    "input_mode": "Typed Text",
    "intent": "Ask for instruction on whether to deploy code with suspected bugs despite manager instruction",
    "communication_goal": "Request / Clarification",
    "emotion": "Apprehensive / Confused",
    "original_input": "the project manager sed we shud deploy the code but I think it hs bugs, plese double check and tell me wat to do.",
    "detected_issues": [
      { "issue": "sed", "type": "typo", "context": "project manager sed we" },
      { "issue": "shud", "type": "typo", "context": "we shud deploy" },
      { "issue": "hs", "type": "typo", "context": "I think it hs bugs" },
      { "issue": "plese", "type": "typo", "context": "plese double check" },
      { "issue": "wat", "type": "typo", "context": "tell me wat to do" }
    ],
    "predicted_original_sentence": "The project manager said we should deploy the code, but I think it has bugs. Please double-check it and tell me what to do.",
    "natural_version": "The project manager said we should deploy the code, but I think it has bugs. Please double-check it and tell me what to do.",
    "professional_version": "The project manager advised deploying the code. However, I suspect it may contain bugs. Please review the codebase and advise on the next steps.",
    "formal_version": "The project manager has instructed us to deploy the application code; however, I believe there are unresolved defects. Please verify the code integrity and provide instruction on how to proceed.",
    "grammar_explanations": [
      { "original": "sed, shud, hs, plese, wat", "corrected": "said, should, has, please, what", "explanation": "Corrected typographical errors and phonetic spellings to standard English spelling.", "rule": "Orthography / Spelling Correction" },
      { "original": "but I think it hs bugs, plese double check", "corrected": "but I think it has bugs. Please double-check", "explanation": "Splitting the run-on sentence creates clear readability.", "rule": "Sentence Splitting" }
    ],
    "vocabulary_improvements": [
      { "original": "bugs", "suggestion": "defects / issues", "benefit": "Utilizes industry-standard QA (Quality Assurance) terms instead of casual slang." }
    ],
    "alternative_predictions": [
      { "sentence": "The manager wants to deploy, but the code has issues. Can you check it and advise?", "confidence": 95, "scenario": "Concise developer chat" }
    ],
    "confidence_score": 98,
    "clarification_question": "",
    "learning_tip": "Phonetic typos ('sed' -> 'said') appear highly unprofessional. Take time to spellcheck code comments or business chat messages to maintain professionalism."
  },

  "incomplete-ocr": {
    "language": "English",
    "input_mode": "OCR",
    "intent": "Ask about marketing plan timeline and ownership",
    "communication_goal": "Question",
    "emotion": "Inquiring / Confused",
    "original_input": "so the marketing plan... next week. did we... who is responsible?",
    "detected_issues": [
      { "issue": "...", "type": "fragment", "context": "marketing plan... next week" },
      { "issue": "did we...", "type": "fragment", "context": "did we... who is" }
    ],
    "predicted_original_sentence": "What is the status of the marketing plan for next week, and did we decide who is responsible?",
    "natural_version": "What is the status of the marketing plan for next week, and who is responsible for it?",
    "professional_version": "Could you please provide an update on the marketing plan scheduled for next week? Additionally, please clarify who is responsible for its execution.",
    "formal_version": "Regarding the marketing plan slated for next week, please indicate the current status of its preparation and specify the individual designated as responsible for this task.",
    "grammar_explanations": [
      { "original": "marketing plan... next week", "corrected": "marketing plan scheduled for next week", "explanation": "Restored missing verbs and prepositions to create a coherent clause.", "rule": "Intent Recovery & Fragment Repair" }
    ],
    "vocabulary_improvements": [
      { "original": "who is responsible", "suggestion": "who owns this task", "benefit": "Suggests clear accountability and organizational structure." }
    ],
    "alternative_predictions": [
      { "sentence": "Did we launch the marketing plan for next week? Who is managing it?", "confidence": 70, "scenario": "Assuming the launch has already occurred" }
    ],
    "confidence_score": 74,
    "clarification_question": "Your input is fragmented. Are you asking about the timeline and ownership for next week's marketing plan, or did you mean to check if the plan has been approved?",
    "learning_tip": "When scanning documents or copying notes that have ellipses or omissions, re-synthesize them using a complete subject-verb structure to ensure readability."
  }
}

def allowed_file(filename):
    """Verify upload file format extensions."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def compute_sim_score(s1, s2):
    """Compute basic similarity between two texts for preset matching."""
    s1, s2 = s1.lower(), s2.lower()
    words1, words2 = set(s1.split()), set(s2.split())
    if not words1 or not words2:
        return 0.0
    return len(words1.intersection(words2)) / float(max(len(words1), len(words2)))

def find_preset_key(text):
    """Match query against preset keys."""
    clean_text = text.lower().strip()
    for key, preset in MOCK_PRESETS.items():
        orig = preset["original_input"].lower()
        if clean_text in orig or orig in clean_text or compute_sim_score(clean_text, orig) > 0.8:
            return key
    return None

def generate_dynamic_simulation(text, mode, input_mode):
    """Generate mock outputs if in Sandbox mode and no preset matches."""
    clean_text = text.strip()
    if not clean_text:
        return {}

    # Basic cleanups
    clean_original = clean_text[0].upper() + clean_text[1:]
    reconstructed = clean_original\
        .replace(" sed ", " said ")\
        .replace(" shud ", " should ")\
        .replace(" plese ", " please ")\
        .replace(" wat ", " what ")\
        .replace(" hs ", " has ")\
        .replace(" u ", " you ")\
        .replace(" r ", " are ")\
        .replace(" ur ", " your ")\
        .replace(" teh ", " the ")\
        .replace(" plz ", " please ")\
        .replace(" cant ", " cannot ")\
        .replace(" wont ", " won't ")\
        .replace(" uh ", " ")\
        .replace(" um ", " ")\
        .replace(" like ", " ")
    
    # Strip double spaces
    reconstructed = " ".join(reconstructed.split())
    if not reconstructed.endswith((".", "?", "!")):
        reconstructed += "."

    natural = reconstructed
    professional = f"We would like to clarify that: {natural[0].lower() + natural[1:]}"
    formal = f"It is respectfully submitted that {natural[0].lower() + natural[1:]}"

    issues = []
    for filler in ["uh", "um", "like", "you know"]:
        if filler in clean_text.lower():
            idx = clean_text.lower().find(filler)
            issues.append({
                "issue": filler,
                "type": "filler",
                "context": f"...{clean_text[max(0, idx-10):min(len(clean_text), idx+15)]}..."
            })
            
    if any(typo in clean_text.lower() for typo in ["sed", "shud", "plese", "wat"]):
         issues.append({
             "issue": "Orthography typo",
             "type": "spelling_typo",
             "context": "Spelling glitches detected in raw text."
         })

    if not issues:
        issues.append({
            "issue": "Standard colloquial phrasing",
            "type": "style",
            "context": "Standard structure regularized to formal format."
        })

    score = max(65, min(99, 100 - (len(issues) * 8)))

    return {
        "language": "English (Simulated)",
        "input_mode": input_mode,
        "intent": "Relay details from raw query (Simulated)",
        "communication_goal": "Information",
        "emotion": "Neutral",
        "original_input": text,
        "detected_issues": issues,
        "predicted_original_sentence": natural,
        "natural_version": natural,
        "professional_version": professional,
        "formal_version": formal,
        "grammar_explanations": [
            {
                "original": "Colloquial layout",
                "corrected": natural,
                "explanation": "Analyzed verbal signals, normalized punctuation, and trimmed filler expressions.",
                "rule": "Orthography & Syntax Regularization"
            }
        ],
        "vocabulary_improvements": [
            {
                "original": "style",
                "suggestion": "reconstructed tone",
                "benefit": "Simulated local sandbox output. Add server GEMINI_API_KEY for live models."
            }
        ],
        "alternative_predictions": [
            {
                "sentence": natural,
                "confidence": score,
                "scenario": "Standard Interpretation"
            }
        ],
        "confidence_score": score,
        "clarification_question": f"We detected some potential ambiguities: '{text}'. Can you clarify your main objective?" if score < 80 else "",
        "learning_tip": "Sandbox Mode is active on Flask Server. To run live AI text reconstructions, please configure your GEMINI_API_KEY in the environment file."
    }

def call_gemini_api(text=None, audio_path=None, mode="business", language_profile="auto", input_mode="Typed Text"):
    """
    Core function interfacing with the REST APIs (Groq or Gemini).
    Handles raw text context, or base64 audio attachment models.
    Falls back to mock engines if configuration keys are missing.
    """
    # --- 1. Check for Groq API Integration ---
    if Config.GROQ_API_KEY:
        try:
            # Handle audio file uploads via Groq Whisper API
            if audio_path and os.path.exists(audio_path):
                transcribe_url = "https://api.groq.com/openai/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {Config.GROQ_API_KEY}"}
                
                # Guess mime type or default
                mime_type, _ = mimetypes.guess_type(audio_path)
                if not mime_type:
                    mime_type = "audio/webm"
                
                with open(audio_path, "rb") as audio_file:
                    files = {
                        "file": (os.path.basename(audio_path), audio_file, mime_type),
                    }
                    data = {
                        "model": "whisper-large-v3",
                        "response_format": "json"
                    }
                    tx_response = requests.post(transcribe_url, headers=headers, files=files, data=data, timeout=30)
                    tx_response.raise_for_status()
                    text = tx_response.json().get("text", "")
                    input_mode = "Voice Recording"

            if text:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {Config.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                
                context_prompt = f"""
CURRENT CONFIGURATION SETTINGS:
- Reconstruction Mode: {mode}
- Language Profile Requirement: {language_profile}
- Input Mode: {input_mode}

INPUT TEXT TO RECONSTRUCT:
"{text}"
"""
                request_body = {
                    "model": Config.DEFAULT_GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT + "\n\nCRITICAL: You MUST format your response strictly in the following JSON format and keys:\n" + json.dumps(GEMINI_JSON_SCHEMA, indent=2)},
                        {"role": "user", "content": context_prompt}
                    ],
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"}
                }
                
                response = requests.post(url, headers=headers, json=request_body, timeout=30)
                response.raise_for_status()
                res_json = response.json()
                
                candidate_text = res_json["choices"][0]["message"]["content"]
                parsed_data = json.loads(candidate_text.strip())
                
                parsed_data["original_input"] = text
                parsed_data["input_mode"] = input_mode
                return parsed_data
                
        except Exception as e:
            print(f"[Groq API Exception] {e}. Falling back to presets/mock models.")
            if text:
                return generate_dynamic_simulation(text, mode, input_mode)
            raise e

    # --- 2. Check for Gemini API Integration ---
    api_key = Config.GEMINI_API_KEY
    if not api_key:
        # Check presets first
        if text:
            preset_key = find_preset_key(text)
            if preset_key:
                res = dict(MOCK_PRESETS[preset_key])
                res["input_mode"] = input_mode
                return res
            return generate_dynamic_simulation(text, mode, input_mode)
        else:
            # For audio without API key, fall back to the speech fillers preset
            res = dict(MOCK_PRESETS["speech-fillers"])
            res["input_mode"] = "Voice Recording"
            return res

    model = Config.DEFAULT_GEMINI_MODEL
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    # Setup content context
    context_prompt = f"""
CURRENT CONFIGURATION SETTINGS:
- Reconstruction Mode: {mode}
- Language Profile Requirement: {language_profile}
- Input Mode: {input_mode}
"""
    if text:
        context_prompt += f"\nINPUT TEXT TO RECONSTRUCT:\n\"{text}\""

    parts = [
        {"text": SYSTEM_PROMPT},
        {"text": context_prompt}
    ]

    # Handle Audio Embeds
    if audio_path and os.path.exists(audio_path):
        mime_type, _ = mimetypes.guess_type(audio_path)
        if not mime_type:
            mime_type = "audio/webm"
        with open(audio_path, "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")
        
        parts.append({
            "inlineData": {
                "mimeType": mime_type,
                "data": audio_data
            }
        })

    request_body = {
        "contents": [
            {
                "parts": parts
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": GEMINI_JSON_SCHEMA,
            "temperature": 0.1
        }
    }

    try:
        response = requests.post(url, json=request_body, timeout=30)
        response.raise_for_status()
        res_json = response.json()
        
        candidate_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
        parsed_data = json.loads(candidate_text.strip())
        
        if text:
            parsed_data["original_input"] = text
        if not parsed_data.get("input_mode"):
            parsed_data["input_mode"] = input_mode
            
        return parsed_data
    except Exception as e:
        print(f"[Gemini API Exception] {e}")
        # Graceful fallback if API call fails
        if text:
            return generate_dynamic_simulation(text, mode, input_mode)
        raise e

