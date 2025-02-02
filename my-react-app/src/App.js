import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { 
  askQuestion, 
  runTest, 
  makeDiagnosis, 
  createVideo, 
  getVideo, 
  getGameHistory, 
  resetGameHistory, 
  evaluateGamePerformance,
  getProfessionalFeedback 
} from './gameLogic';
import AudioRecorder from './AudioRecorder';

const Firework = ({ x, y, color }) => {
  const particles = [];
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = (i * 360) / particleCount;
    const distance = Math.random() * 100 + 50;
    const xOffset = Math.cos(angle * Math.PI / 180) * distance;
    const yOffset = Math.sin(angle * Math.PI / 180) * distance;
    
    particles.push(
      <div
        key={i}
        className="firework-particle"
        style={{
          '--x': `${xOffset}px`,
          '--y': `${yOffset}px`,
          backgroundColor: color,
        }}
      />
    );
  }
  
  return (
    <div className="firework" style={{ left: x, top: y }}>
      {particles}
    </div>
  );
};

const Sparkles = () => {
  const sparkles = [];
  for (let i = 0; i < 10; i++) {
    const delay = Math.random() * 2;
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    sparkles.push(
      <div
        key={i}
        className="sparkle"
        style={{
          top: `${top}%`,
          left: `${left}%`,
          animationDelay: `${delay}s`
        }}
      />
    );
  }
  return sparkles;
};

function App() {
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [currentMode, setCurrentMode] = useState('question'); // 'question', 'test', or 'diagnosis'
  const [videoLoading, setVideoLoading] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [audioData, setAudioData] = useState(null);
  const [fireworks, setFireworks] = useState([]);
  const maxAttempts = 7;

  const handleSubmit = async (e, audioData = null) => {
    e?.preventDefault(); // Make it optional since audio recording won't have an event
    if ((!inputText.trim() && !audioData) || isLoading) return;

    setIsLoading(true);
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    try {
      let response;
      let transcription = null;
      let newConversation;

      switch (currentMode) {
        case 'question':
          const result = await askQuestion(inputText, !!audioData, audioData);
          response = result.response;
          transcription = result.transcription;
          
          // Generate video first
          setVideoLoading(true);
          try {
            const videoId = await createVideo(result.response);
            console.log("Video created with ID:", videoId);
            console.log("Waiting for video to process...");
            
            const videoUrl = await getVideo(videoId);
            console.log("Final video URL:", videoUrl);
            
            // Update the current video URL
            setCurrentVideoUrl(videoUrl);
            
            // Only add conversation after video is ready
            newConversation = {
              type: currentMode,
              input: transcription || inputText,
              response: result.response,
              timestamp: new Date().toLocaleTimeString(),
              isCorrect: currentMode === 'diagnosis' ? result.response.includes("Congratulations") : undefined,
              transcription: transcription,
              videoUrl: null
            };
            setConversations(prev => [newConversation, ...prev]);
            
          } catch (error) {
            console.error('Error generating video:', error);
          } finally {
            setVideoLoading(false);
          }
          break;
        case 'test':
          response = await runTest(inputText);
          newConversation = {
            type: currentMode,
            input: inputText,
            response: response,
            timestamp: new Date().toLocaleTimeString(),
            isCorrect: currentMode === 'diagnosis' ? response.includes("Congratulations") : undefined,
          };
          break;
        case 'diagnosis':
          const isCorrect = await makeDiagnosis(inputText);
          response = isCorrect ? 
            "Congratulations! Your diagnosis is correct!" : 
            "Sorry, that diagnosis is incorrect.";
          setGameOver(isCorrect || newAttempts >= maxAttempts);
          newConversation = {
            type: currentMode,
            input: inputText,
            response: response,
            timestamp: new Date().toLocaleTimeString(),
            isCorrect: currentMode === 'diagnosis' ? response.includes("Congratulations") : undefined,
          };
          break;
        default:
          response = "Invalid mode";
      }

      if (currentMode !== 'question') {
        setConversations(prev => [newConversation, ...prev]);
      }

      setInputText('');

      if (newAttempts >= maxAttempts && !gameOver) {
        setGameOver(true);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudioSubmit = (newAudioData) => {
    setAudioData(newAudioData);
    handleSubmit(null, newAudioData);
  };

  const resetGame = () => {
    setAttempts(0);
    setGameOver(false);
    setConversations([]);
    setCurrentMode('question');
    setCurrentVideoUrl(null);
    setAudioData(null);
    resetGameHistory(); // Reset game history when starting new game
  };

  useEffect(() => {
    if (gameOver) {
      setEvaluationLoading(true);
      setFeedbackLoading(true);

      Promise.all([
        evaluateGamePerformance(),
        getProfessionalFeedback()
      ]).then(([evalResult, feedbackResult]) => {
        setEvaluation(evalResult);
        setFeedback(feedbackResult);
      }).catch(error => {
        console.error('Failed to get results:', error);
      }).finally(() => {
        setEvaluationLoading(false);
        setFeedbackLoading(false);
      });
    }
  }, [gameOver]);

  useEffect(() => {
    if (gameOver && conversations.find(c => c.type === 'diagnosis')?.isCorrect) {
      const interval = setInterval(() => {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * (window.innerHeight / 2);
        const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        
        setFireworks(prev => [...prev, { id: Date.now(), x, y, color }]);
      }, 500);

      return () => clearInterval(interval);
    }
  }, [gameOver, conversations]);

  useEffect(() => {
    if (fireworks.length > 0) {
      const timer = setTimeout(() => {
        setFireworks(prev => prev.slice(1));
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [fireworks]);

  return (
    <div className="app-container">
      {gameOver && conversations.find(c => c.type === 'diagnosis')?.isCorrect && (
        <div className="firework-container">
          {fireworks.map(fw => (
            <Firework key={fw.id} x={fw.x} y={fw.y} color={fw.color} />
          ))}
          <Sparkles />
        </div>
      )}
      <section className="hero-section">
        <h1 className="app-title">Medical Assistant</h1>
        <p className="app-subtitle">
          Your AI-powered medical companion. Ask questions, request tests, and get diagnostic insights through natural conversation.
        </p>
      </section>

      {!gameOver ? (
        <div className="main-content">
          <div className="left-panel">
            <div className="video-section">
              {currentVideoUrl && (
                <div className="video-player">
                  <video key={currentVideoUrl} controls autoPlay>
                    <source src={currentVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>

            <div className="mode-selector">
              <button
                onClick={() => setCurrentMode('question')}
                className={`mode-button question-mode ${currentMode === 'question' ? 'active' : ''}`}
              >
                Ask Question
              </button>
              <button
                onClick={() => setCurrentMode('test')}
                className={`mode-button test-mode ${currentMode === 'test' ? 'active' : ''}`}
              >
                Run Test
              </button>
              <button
                onClick={() => setCurrentMode('diagnosis')}
                className={`mode-button diagnosis-mode ${currentMode === 'diagnosis' ? 'active' : ''}`}
              >
                Make Diagnosis
              </button>
            </div>

            <section className="input-section">
              <form onSubmit={handleSubmit} className="input-form">
                <div className="input-group">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      currentMode === 'question'
                        ? "Ask the patient a question..."
                        : currentMode === 'test'
                        ? "Request a medical test..."
                        : "Make your diagnosis..."
                    }
                    disabled={isLoading}
                    className="main-input"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || (!inputText.trim() && !audioData)}
                    className="submit-button"
                  >
                    Submit
                  </button>
                </div>
                <div className="audio-recorder-container">
                  <AudioRecorder 
                    onRecordingComplete={handleAudioSubmit} 
                    isLoading={isLoading || videoLoading}
                  />
                </div>
              </form>
            </section>
          </div>

          <div className="right-panel">
            <section className="conversation-section">
              <h2 className="conversation-title">Conversation History</h2>
              <div className="conversation-list">
                {conversations.map((conv, index) => (
                  <div key={conv.timestamp + index} className="conversation-item fade-in">
                    <div className="conversation-header">
                      <span className="timestamp">{conv.timestamp}</span>
                      <span className={`type-badge ${conv.type}`}>{conv.type}</span>
                    </div>
                    <div className={`message user-message ${conv.type}-message`}>
                      <div className="message-label">You ({conv.type}):</div>
                      <div className="message-content">
                        {conv.transcription && (
                          <div className="transcription">
                            <span className="transcription-label">(Transcribed)</span> {conv.transcription}
                          </div>
                        )}
                        <div className="original-text">
                          <span className="original-label">(Original)</span> {conv.input}
                        </div>
                      </div>
                    </div>
                    <div className={`message assistant-message ${conv.type}-response`}>
                      <div className="message-label">Assistant:</div>
                      <div className="message-content">{conv.response}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="game-over">
          <h2 className="success-heading">
            {conversations.find(c => c.type === 'diagnosis')?.isCorrect ? 
              "Congratulations! You've made the correct diagnosis!" : 
              "Game Over - Better luck next time!"}
          </h2>
          
          {evaluationLoading ? (
            <div className="loading-evaluation">
              <h3>Analyzing Performance</h3>
              <div className="loading-spinner-container">
                <div className="loading-spinner"></div>
                <div className="loading-spinner"></div>
                <div className="loading-spinner"></div>
              </div>
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <div className="loading-status">
                Evaluating your diagnostic approach...
              </div>
            </div>
          ) : (
            evaluation && (
              <div className="evaluation-results">
                <h3>Performance Evaluation</h3>
                <div className="score-card">
                  <div className="score-item">
                    <h4>Quality of Patient Questions</h4>
                    <div className="score">Score: {evaluation.qualityOfQuestions.score}/4</div>
                    <p>{evaluation.qualityOfQuestions.reasoning}</p>
                  </div>
                  <div className="score-item">
                    <h4>Use of Patient Responses</h4>
                    <div className="score">Score: {evaluation.useOfResponses.score}/4</div>
                    <p>{evaluation.useOfResponses.reasoning}</p>
                  </div>
                  <div className="score-item">
                    <h4>Test Selection & Interpretation</h4>
                    <div className="score">Score: {evaluation.testSelection.score}/4</div>
                    <p>{evaluation.testSelection.reasoning}</p>
                  </div>
                  <div className="score-item">
                    <h4>Diagnostic Efficiency</h4>
                    <div className="score">Score: {evaluation.diagnosticEfficiency.score}/4</div>
                    <p>{evaluation.diagnosticEfficiency.reasoning}</p>
                  </div>
                </div>
              </div>
            )
          )}

          {feedbackLoading || feedback ? (
            <div className="professional-feedback">
              <h3>Professional Feedback</h3>
              
              <div className="feedback-section">
                <h4>Areas for Improvement</h4>
                <ul>
                  {feedback?.areasForImprovement.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="feedback-section">
                <h4>Real-World Context</h4>
                <p>{feedback?.realWorldContext}</p>
              </div>

              <div className="feedback-section">
                <h4>Professional Development Advice</h4>
                <ul>
                  {feedback?.professionalAdvice.map((advice, index) => (
                    <li key={index}>{advice}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="loading-message">Analyzing your performance...</div>
          )}

          <button 
            className="play-again-button"
            onClick={resetGame}
          >
            Play Again
          </button>

          <div className="game-history">
            <h3>Game History:</h3>
            <pre>{getGameHistory()}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
