import React, { useState, useRef } from 'react';
import { FaPlayCircle } from 'react-icons/fa';
import './OPICPractice.css'; // Import CSS for styling

const OPICPractice = () => {
  const [step, setStep] = useState('intro');
  const [level, setLevel] = useState('IH');
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [questionHistory, setQuestionHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAnswers, setRecordedAnswers] = useState([]);
  const mediaRecorderRef = useRef(null);

  const topics = ['sports', 'movies', 'cooking', 'reading'];

  const questions = {
    sports: {
      IH: [
        { text: "Why is sports participation important for mental health?" },
        { text: "How can sports build community relationships?" },
        { text: "What are the main benefits of playing team sports?" },
        { text: "How has technology changed how people engage in sports?" },
      ],
    },
  };

  const handleTopicSelection = (topicId) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter(id => id !== topicId));
    } else {
      if (selectedTopics.length < 5) {
        setSelectedTopics([...selectedTopics, topicId]);
      } else {
        alert('최대 5개까지만 선택할 수 있습니다.');
      }
    }
  };

  const handleSurveyComplete = () => {
    if (selectedTopics.length >= 3) {
      setLoading(true);
      setTimeout(() => {
        setStep('practice');
        selectRandomQuestion();
        setLoading(false);
      }, 1000);
    } else {
      alert('최소 3개 이상의 주제를 선택해주세요.');
    }
  };

  const selectRandomQuestion = () => {
    let availableQuestions = [];
    selectedTopics.forEach(topicId => {
      if (questions[topicId] && questions[topicId][level]) {
        availableQuestions = [...availableQuestions, ...questions[topicId][level]];
      }
    });

    const unusedQuestions = availableQuestions.filter(q => !questionHistory.includes(q.text));

    if (unusedQuestions.length > 0) {
      const randomQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
      setCurrentQuestion(randomQuestion);
      setQuestionHistory([...questionHistory, randomQuestion.text]);
      speakQuestion(randomQuestion.text);
    } else {
      alert('모든 질문을 완료했습니다.');
    }
  };

  const speakQuestion = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedAnswers((prev) => [...prev, { question: currentQuestion.text, audioUrl: url }]);
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const handlePlayAudio = (url) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <div className="container">
      {step === 'intro' && (
        <div>
          <h1>OPIc 연습 프로그램</h1>
          <button className="btn" onClick={() => setStep('survey')}>시작하기</button>
        </div>
      )}

      {step === 'survey' && (
        <div>
          <h2>주제를 선택하세요 (최소 3개, 최대 5개)</h2>
          {topics.map(topic => (
            <button
              key={topic}
              className={`btn ${selectedTopics.includes(topic) ? 'selected' : ''}`}
              onClick={() => handleTopicSelection(topic)}
            >
              {topic}
            </button>
          ))}
          <button className="btn submit-btn" onClick={handleSurveyComplete}>설문 완료</button>
        </div>
      )}

      {step === 'practice' && currentQuestion && (
        <div>
          <h2>
            질문: {currentQuestion.text}
            <FaPlayCircle
              className="icon"
              onClick={() => speakQuestion(currentQuestion.text)}
            />
          </h2>
          {!isRecording && <button className="btn record-btn" onClick={startRecording}>녹음 시작</button>}
          {isRecording && <button className="btn stop-btn" onClick={stopRecording}>녹음 종료</button>}
          <button className="btn next-btn" onClick={selectRandomQuestion}>다음 질문</button>
        </div>
      )}

      {recordedAnswers.length > 0 && (
        <div>
          <h3>녹음된 답변 목록</h3>
          {recordedAnswers.map((answer, index) => (
            <div key={index}>
              <p>
                <strong>질문:</strong> {answer.question}
                <FaPlayCircle
                  className="icon answer-icon"
                  onClick={() => handlePlayAudio(answer.audioUrl)}
                />
              </p>
              <audio controls src={answer.audioUrl}></audio>
            </div>
          ))}
        </div>
      )}

      {loading && <p>로딩 중...</p>}
    </div>
  );
};

export default OPICPractice;



