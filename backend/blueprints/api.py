import os
import json
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from backend.database import db
from backend.models import ReconstructionRecord
from backend.utils import allowed_file, call_gemini_api

api_bp = Blueprint("api", __name__, url_prefix="/api")

@api_bp.route("/analyze", methods=["POST"])
def analyze_intent():
    """
    POST /api/analyze
    Perform full semantic reconstruction on raw input text.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    
    if not text:
        return jsonify({"error": "Original input text cannot be empty"}), 400
        
    mode = data.get("mode", "business")
    lang_profile = data.get("language_profile", "auto")
    input_mode = data.get("input_mode", "Typed Text")
    
    try:
        # Run Server-Side Gemini API call
        res_data = call_gemini_api(
            text=text, 
            mode=mode, 
            language_profile=lang_profile, 
            input_mode=input_mode
        )
        
        # Save record in SQLite database for history tracking
        record = ReconstructionRecord(
            original_input=text,
            predicted_sentence=res_data.get("predicted_original_sentence", ""),
            natural_version=res_data.get("natural_version", ""),
            professional_version=res_data.get("professional_version", ""),
            formal_version=res_data.get("formal_version", ""),
            detected_language=res_data.get("language", "English"),
            input_mode=input_mode,
            intent=res_data.get("intent", ""),
            communication_goal=res_data.get("communication_goal", ""),
            emotion=res_data.get("emotion", ""),
            confidence_score=res_data.get("confidence_score", 100),
            detected_issues_json=json.dumps(res_data.get("detected_issues", [])),
            grammar_explanations_json=json.dumps(res_data.get("grammar_explanations", [])),
            vocabulary_improvements_json=json.dumps(res_data.get("vocabulary_improvements", [])),
            learning_tip=res_data.get("learning_tip", "")
        )
        db.session.add(record)
        db.session.commit()
        
        # Include record ID in response for client-side deletion/referencing
        res_data["record_id"] = record.id
        return jsonify(res_data), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in /api/analyze: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route("/speech", methods=["POST"])
def analyze_speech():
    """
    POST /api/speech
    Saves uploaded audio file securely and analyzes it through the Gemini audio interface.
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided in request"}), 400
        
    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"error": "Filename is empty"}), 400
        
    mode = request.form.get("mode", "business")
    lang_profile = request.form.get("language_profile", "auto")
    
    if file and allowed_file(file.filename):
        # Generate secure unique name to avoid duplicates
        ext = file.filename.rsplit(".", 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Ensure uploads folder exists
        upload_path = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_path, exist_ok=True)
        
        file_filepath = os.path.join(upload_path, filename)
        file.save(file_filepath)
        
        try:
            # Send file to Gemini Audio interface
            res_data = call_gemini_api(
                audio_path=file_filepath,
                mode=mode,
                language_profile=lang_profile,
                input_mode="Voice Recording"
            )
            
            # Save record in SQLite database
            record = ReconstructionRecord(
                original_input=res_data.get("original_input", "[Speech Audio]"),
                predicted_sentence=res_data.get("predicted_original_sentence", ""),
                natural_version=res_data.get("natural_version", ""),
                professional_version=res_data.get("professional_version", ""),
                formal_version=res_data.get("formal_version", ""),
                detected_language=res_data.get("language", "English"),
                input_mode="Voice Recording",
                intent=res_data.get("intent", ""),
                communication_goal=res_data.get("communication_goal", ""),
                emotion=res_data.get("emotion", ""),
                confidence_score=res_data.get("confidence_score", 100),
                detected_issues_json=json.dumps(res_data.get("detected_issues", [])),
                grammar_explanations_json=json.dumps(res_data.get("grammar_explanations", [])),
                vocabulary_improvements_json=json.dumps(res_data.get("vocabulary_improvements", [])),
                learning_tip=res_data.get("learning_tip", "")
            )
            db.session.add(record)
            db.session.commit()
            
            res_data["record_id"] = record.id
            res_data["audio_url"] = f"/static/uploads/{filename}"
            
            return jsonify(res_data), 200
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error in /api/speech analysis: {e}")
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "File type not allowed"}), 400


@api_bp.route("/grammar", methods=["POST"])
def analyze_grammar_only():
    """
    POST /api/grammar
    Quick spelling, typos and grammar checks on input text.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    
    if not text:
        return jsonify({"error": "Original input text cannot be empty"}), 400
        
    try:
        res_data = call_gemini_api(text=text, mode="business", language_profile="auto", input_mode="Grammar Checker")
        grammar_only = {
            "language": res_data.get("language", "English"),
            "predicted_original_sentence": res_data.get("predicted_original_sentence", ""),
            "confidence_score": res_data.get("confidence_score", 100),
            "detected_issues": res_data.get("detected_issues", []),
            "grammar_explanations": res_data.get("grammar_explanations", [])
        }
        return jsonify(grammar_only), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/intent", methods=["POST"])
def analyze_intent_only():
    """
    POST /api/intent
    Extract communication goal, intent, and primary emotional classifications.
    """
    data = request.get_json() or {}
    text = data.get("text", "").strip()
    
    if not text:
        return jsonify({"error": "Original input text cannot be empty"}), 400
        
    try:
        res_data = call_gemini_api(text=text, mode="business", language_profile="auto", input_mode="Intent Checker")
        intent_only = {
            "language": res_data.get("language", "English"),
            "intent": res_data.get("intent", ""),
            "communication_goal": res_data.get("communication_goal", ""),
            "emotion": res_data.get("emotion", ""),
            "confidence_score": res_data.get("confidence_score", 100)
        }
        return jsonify(intent_only), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@api_bp.route("/history", methods=["GET"])
def get_history():
    """
    GET /api/history
    Retrieve saved reconstruction records, ordered by created date (newest first).
    """
    try:
        records = ReconstructionRecord.query.order_by(ReconstructionRecord.created_at.desc()).limit(30).all()
        return jsonify([rec.to_dict() for rec in records]), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching history: {e}")
        return jsonify({"error": str(e)}), 500


@api_bp.route("/history/<int:record_id>", methods=["DELETE"])
def delete_history_item(record_id):
    """
    DELETE /api/history/<record_id>
    Remove a history record from the database.
    """
    try:
        record = ReconstructionRecord.query.get(record_id)
        if not record:
            return jsonify({"error": "Record not found"}), 404
            
        db.session.delete(record)
        db.session.commit()
        return jsonify({"message": f"Successfully deleted record {record_id}"}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting record {record_id}: {e}")
        return jsonify({"error": str(e)}), 500
