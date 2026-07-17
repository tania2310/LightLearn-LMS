import { useState } from "react";

function ReviewReportModal({ review, onClose, onSubmit }) {
    const [reason, setReason] = useState("Spam");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitting(true);
        onSubmit({ reason, description })
            .finally(() => setSubmitting(false));
    };

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: "var(--card-bg, #ffffff)",
                padding: "25px",
                borderRadius: "8px",
                width: "450px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                border: "1px solid var(--border)"
            }}>
                <h3 style={{ margin: "0 0 15px 0" }}>Report Review</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "15px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Reason</label>
                        <select 
                            value={reason} 
                            onChange={(e) => setReason(e.target.value)}
                            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--card-bg)" }}
                        >
                            <option value="Spam">Spam</option>
                            <option value="Offensive">Offensive</option>
                            <option value="Harassment">Harassment</option>
                            <option value="Fake Review">Fake Review</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", marginBottom: "5px", fontWeight: "600" }}>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Provide additional context..."
                            style={{ width: "100%", height: "80px", padding: "10px", borderRadius: "6px", border: "1px solid var(--border)" }}
                        />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="btn-secondary"
                            style={{ padding: "8px 16px", cursor: "pointer" }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn-primary-flow" 
                            disabled={submitting}
                            style={{ padding: "8px 16px", cursor: "pointer", background: "#ef4444", color: "white" }}
                        >
                            {submitting ? "Submitting..." : "Submit Report"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReviewReportModal;
