import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";
import ReviewReportModal from "../components/ReviewReportModal";
import "../styles/learningFlow.css";
import "../styles/learningFlowExtras.css";

function Reviews() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [course, setCourse] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    // Form inputs
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editingRating, setEditingRating] = useState(5);
    const [editingComment, setEditingComment] = useState("");
    const [selectedReviewForReport, setSelectedReviewForReport] = useState(null);

    useEffect(() => {
        // Fetch course details
        API.get(`courses/${courseId}/`)
            .then(res => setCourse(res.data))
            .catch(console.log);

        // Fetch current user details
        API.get("accounts/profile/")
            .then(res => setCurrentUser(res.data))
            .catch(console.log);

        fetchReviews();
    }, [courseId]);

    const fetchReviews = () => {
        API.get("reviews/")
            .then(res => {
                const courseRev = res.data.filter(r => r.course === Number(courseId));
                setReviews(courseRev);
            })
            .catch(console.log);
    };

    const handleAddReview = (e) => {
        e.preventDefault();
        if (!comment.trim()) return;

        API.post("reviews/", {
            course: Number(courseId),
            rating: Number(rating),
            comment: comment
        })
            .then(() => {
                setComment("");
                setRating(5);
                fetchReviews();
            })
            .catch((err) => {
                console.log(err);
                alert("Failed to submit review. Ensure you are enrolled and haven't reviewed yet.");
            });
    };

    const handleStartEdit = (r) => {
        setEditingReviewId(r.id);
        setEditingRating(r.rating);
        setEditingComment(r.comment);
    };

    const handleSaveEdit = (id) => {
        if (!editingComment.trim()) return;

        API.put(`reviews/${id}/`, {
            course: Number(courseId),
            rating: Number(editingRating),
            comment: editingComment
        })
            .then(() => {
                setEditingReviewId(null);
                fetchReviews();
            })
            .catch(console.log);
    };

    const handleDelete = (id) => {
        if (!window.confirm("Delete this review?")) return;

        API.delete(`reviews/${id}/`)
            .then(() => {
                fetchReviews();
            })
            .catch(console.log);
    };

    const handleReportSubmit = (data) => {
        if (!selectedReviewForReport) return Promise.resolve();
        return API.post(`reviews/${selectedReviewForReport.id}/report/`, data)
            .then(() => {
                alert("Thank you. The review has been reported for moderation.");
                setSelectedReviewForReport(null);
            })
            .catch((err) => {
                console.error(err);
                if (err.response && err.response.data && err.response.data.error) {
                    alert(err.response.data.error);
                } else {
                    alert("Failed to submit report.");
                }
            });
    };

    // Calculate metrics
    const averageRating = course && course.average_rating !== undefined ? course.average_rating : "N/A";

    return (
        <>
            <Navbar />
            <div className="reviews-container">
                <div style={{ marginBottom: "20px" }}>
                    <button className="btn-secondary" onClick={() => navigate(`/courses/${courseId}`)}>
                        ← Back to Course Details
                    </button>
                </div>

                <div className="qa-header">
                    <h1>Course Reviews</h1>
                    {course && <p style={{ color: "var(--text)" }}>Course: {course.title}</p>}
                </div>

                {/* Rating Summary */}
                <div className="reviews-summary">
                    <div className="reviews-score">
                        <h1>{averageRating}</h1>
                        <p>Average Rating</p>
                    </div>
                    <div>
                        <p style={{ color: "var(--text-h)", fontWeight: "500", margin: "0" }}>
                            Based on {reviews.length} reviews
                        </p>
                    </div>
                </div>

                {/* Write a Review (Only Students) */}
                {currentUser && currentUser.role === "student" && !editingReviewId && (
                    <form className="review-form" onSubmit={handleAddReview}>
                        <h3 style={{ margin: "0 0 15px 0" }}>Write a Review</h3>
                        
                        <label>Rating</label>
                        <select value={rating} onChange={(e) => setRating(e.target.value)}>
                            <option value="5">5 Stars (Excellent)</option>
                            <option value="4">4 Stars (Good)</option>
                            <option value="3">3 Stars (Average)</option>
                            <option value="2">2 Stars (Poor)</option>
                            <option value="1">1 Star (Very Poor)</option>
                        </select>

                        <label>Review Description</label>
                        <textarea
                            placeholder="Share your thoughts about this course..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                        <button type="submit" className="btn-primary-flow">
                            Submit Review
                        </button>
                    </form>
                )}

                {/* Reviews List */}
                <div className="reviews-list">
                    {reviews.filter(r => !r.is_hidden || (currentUser && currentUser.role === "admin")).length === 0 ? (
                        <p style={{ color: "var(--text)" }}>No reviews posted yet.</p>
                    ) : (
                        reviews.filter(r => !r.is_hidden || (currentUser && currentUser.role === "admin")).map(r => {
                            const isOwnReview = currentUser && r.student === currentUser.id;
                            const isAdmin = currentUser && currentUser.role === "admin";

                            return (
                                <div key={r.id} className="review-card">
                                    <div className="review-meta">
                                        <span>
                                            Student <strong>{r.student_name || `User #${r.student}`}</strong>
                                        </span>
                                        <span style={{ color: "#f59e0b", fontWeight: "600" }}>
                                            {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                                        </span>
                                        {r.is_hidden && (
                                            <span style={{ marginLeft: "10px", padding: "2px 6px", backgroundColor: "#fee2e2", color: "#dc2626", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "600" }}>
                                                Hidden by Moderator
                                            </span>
                                        )}
                                    </div>

                                    {editingReviewId === r.id ? (
                                        <div>
                                            <select 
                                                value={editingRating} 
                                                onChange={(e) => setEditingRating(e.target.value)}
                                                style={{ padding: "6px", borderRadius: "6px", border: "1px solid var(--border)", marginBottom: "10px" }}
                                            >
                                                <option value="5">5 Stars</option>
                                                <option value="4">4 Stars</option>
                                                <option value="3">3 Stars</option>
                                                <option value="2">2 Stars</option>
                                                <option value="1">1 Star</option>
                                            </select>
                                            <textarea
                                                style={{ width: "100%", height: "80px", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", marginBottom: "10px" }}
                                                value={editingComment}
                                                onChange={(e) => setEditingComment(e.target.value)}
                                            />
                                            <div className="qa-actions">
                                                <button className="qa-btn-link" onClick={() => handleSaveEdit(r.id)}>
                                                    Save
                                                </button>
                                                <button className="qa-btn-link" onClick={() => setEditingReviewId(null)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="review-comment">{r.comment}</div>
                                            <div className="qa-actions">
                                                {isOwnReview && (
                                                    <button className="qa-btn-link" onClick={() => handleStartEdit(r)}>
                                                        Edit
                                                    </button>
                                                )}
                                                {(isOwnReview || isAdmin) && (
                                                    <button className="qa-btn-link qa-btn-delete" onClick={() => handleDelete(r.id)}>
                                                        Delete
                                                    </button>
                                                )}
                                                {!isOwnReview && currentUser && (
                                                    <button className="qa-btn-link" style={{ color: "#dc2626" }} onClick={() => setSelectedReviewForReport(r)}>
                                                        Report
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {selectedReviewForReport && (
                    <ReviewReportModal 
                        review={selectedReviewForReport} 
                        onClose={() => setSelectedReviewForReport(null)} 
                        onSubmit={handleReportSubmit} 
                    />
                )}
            </div>
        </>
    );
}

export default Reviews;
