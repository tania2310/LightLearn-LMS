import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api/api";
import Navbar from "../components/Navbar";

function CreateQuestion() {
    const { quizId } = useParams();
    const navigate = useNavigate();
    const [finishAfterSave, setFinishAfterSave] = useState(false);

    const [question, setQuestion] = useState({
        quiz: quizId,
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correct_option: 1,
    });

    const handleChange = (e) => {
        setQuestion({
            ...question,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        API.post("questions/", question)
            .then(() => {
                alert("Question Added!");

                if (finishAfterSave) {
                    navigate("/mentor");
                    return;
                }

                setQuestion({
                    quiz: quizId,
                    question: "",
                    option1: "",
                    option2: "",
                    option3: "",
                    option4: "",
                    correct_option: 1,
                });

                setFinishAfterSave(false);
            })
            .catch(console.log);
    };

    return (
        <>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "700px" }}>
                <h1>Add Question</h1>

                <form onSubmit={handleSubmit}>

                    <textarea
                        name="question"
                        placeholder="Question"
                        value={question.question}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        name="option1"
                        placeholder="Option 1"
                        value={question.option1}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        name="option2"
                        placeholder="Option 2"
                        value={question.option2}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        name="option3"
                        placeholder="Option 3"
                        value={question.option3}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <input
                        name="option4"
                        placeholder="Option 4"
                        value={question.option4}
                        onChange={handleChange}
                    />

                    <br /><br />

                    <label>Correct Option</label>

                    <select
                        name="correct_option"
                        value={question.correct_option}
                        onChange={handleChange}
                    >
                        <option value={1}>Option 1</option>
                        <option value={2}>Option 2</option>
                        <option value={3}>Option 3</option>
                        <option value={4}>Option 4</option>
                    </select>

                    <br /><br />
                    <div
                        style={{
                            marginTop: "20px",
                            display: "flex",
                            gap: "10px",
                        }}
                    >
                        <div
                            style={{
                                marginTop: "25px",
                                display: "flex",
                                gap: "10px",
                            }}
                        >
                            <button
                                type="submit"
                                onClick={() => setFinishAfterSave(false)}
                            >
                                Save & Add Another
                            </button>

                            <button
                                type="submit"
                                onClick={() => setFinishAfterSave(true)}
                            >
                                Save & Finish
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                            >
                                Back
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate("/mentor")}
                            >
                                Finish
                            </button>
                        </div>


                    </div>
                </form>
            </div>
        </>
    );
}

export default CreateQuestion;