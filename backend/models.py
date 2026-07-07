import json
from datetime import datetime
from backend.database import db

class ReconstructionRecord(db.Model):
    """
    Stores history of text reconstructions, API diagnostics, and learning tips.
    SQLite is used for local development, easily migratable to PostgreSQL.
    """
    __tablename__ = "reconstruction_records"

    id = db.Column(db.Integer, primary_key=True)
    original_input = db.Column(db.Text, nullable=False)
    predicted_sentence = db.Column(db.Text, nullable=False)
    natural_version = db.Column(db.Text)
    professional_version = db.Column(db.Text)
    formal_version = db.Column(db.Text)
    
    # Metadata classifications
    detected_language = db.Column(db.String(100))
    input_mode = db.Column(db.String(50))
    intent = db.Column(db.Text)
    communication_goal = db.Column(db.String(100))
    emotion = db.Column(db.String(100))
    confidence_score = db.Column(db.Integer)
    
    # Serialized JSON lists
    detected_issues_json = db.Column(db.Text)
    grammar_explanations_json = db.Column(db.Text)
    vocabulary_improvements_json = db.Column(db.Text)
    
    # Education
    learning_tip = db.Column(db.Text)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert database record to UI/REST API JSON payload."""
        return {
            "id": self.id,
            "original_input": self.original_input,
            "predicted_original_sentence": self.predicted_sentence,
            "natural_version": self.natural_version,
            "professional_version": self.professional_version,
            "formal_version": self.formal_version,
            "language": self.detected_language,
            "input_mode": self.input_mode,
            "intent": self.intent,
            "communication_goal": self.communication_goal,
            "emotion": self.emotion,
            "confidence_score": self.confidence_score,
            "detected_issues": json.loads(self.detected_issues_json) if self.detected_issues_json else [],
            "grammar_explanations": json.loads(self.grammar_explanations_json) if self.grammar_explanations_json else [],
            "vocabulary_improvements": json.loads(self.vocabulary_improvements_json) if self.vocabulary_improvements_json else [],
            "learning_tip": self.learning_tip,
            "created_at": self.created_at.isoformat()
        }
