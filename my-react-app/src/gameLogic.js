const ILLNESS = "pancreatic cancer";
const API_KEY = "";

// Global variable to store game history
let currentGameHistory = "";

const role_patient = `You are a tool to help medical students learn how to diagnose patients. Pretend you are a sick patient with ${ILLNESS}. Respond to student's questions with symptoms of someone who has ${ILLNESS}. Give two sentences maximum`;
const role_test = `You are a medical lab technician performing medical test on patient with ${ILLNESS}. Give one sentence report with measurements for described test in prompt. never mention anything about ${ILLNESS}`;

// Function to add interaction to game history
function addToGameHistory(type, input, response) {
    const timestamp = new Date().toLocaleTimeString();
    currentGameHistory += `\n[${timestamp}] ${type.toUpperCase()}:\nUser: ${input}\nAssistant: ${response}\n`;
}

// Function to get current game history
export function getGameHistory() {
    return currentGameHistory;
}

// Function to reset game history
export function resetGameHistory() {
    currentGameHistory = "";
}

export async function transcribeAudio(formData) {
    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Transcription failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Full transcription error:', error);
        throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
}

export async function interactWithGPT(role, prompt, model = "gpt-3.5-turbo") {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: role },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`GPT interaction failed: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Full GPT error:', error);
        throw new Error(`Failed to interact with GPT: ${error.message}`);
    }
}

export async function askQuestion(question, isAudio = false, audioData = null) {
    try {
        let questionText = question;
        
        if (isAudio && audioData) {
            console.log('Transcribing audio...');
            questionText = await transcribeAudio(audioData);
            console.log('Transcription result:', questionText);
        }

        console.log('Sending question to GPT:', questionText);
        const response = await interactWithGPT(role_patient, questionText);
        
        // Add to game history
        addToGameHistory('question', questionText, response);

        return {
            response,
            transcription: isAudio ? questionText : null,
            videoUrl: null
        };
    } catch (error) {
        console.error('Full question processing error:', error);
        throw new Error(`Failed to process question: ${error.message}`);
    }
}

export async function runTest(testType) {
    try {
        const response = await interactWithGPT(role_test, testType);
        
        // Add to game history
        addToGameHistory('test', testType, response);
        
        return response;
    } catch (error) {
        console.error('Full test error:', error);
        throw new Error(`Failed to run test: ${error.message}`);
    }
}

export async function makeDiagnosis(diagnosis) {
    const isCorrect = diagnosis.toLowerCase() === ILLNESS.toLowerCase();
    const response = isCorrect ? "Correct diagnosis!" : "Incorrect diagnosis.";
    
    // Add to game history
    addToGameHistory('diagnosis', diagnosis, response);
    
    return isCorrect;
}

export async function createVideo(text) {
    const url = 'https://api.d-id.com/talks';
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            'authorization': 'Basic '
        },
        body: JSON.stringify({
            source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
            script: {
                type: 'text',
                subtitles: 'false',
                provider: {type: 'microsoft', voice_id: 'Sara'},
                input: text
            },
            config: {fluent: 'false', pad_audio: '0.0'}
        })
    };

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        console.log('Video creation started:', json);
        
        if (!json.id) {
            throw new Error('No video ID received from API');
        }
        
        return json.id;
    } catch (error) {
        console.error('Error creating video:', error);
        throw error;
    }
}

export async function getVideo(video_id) {
    const url = `https://api.d-id.com/talks/${video_id}`;
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'authorization': 'Basic '
        }
    };
   
    const maxAttempts = 30;
    const delayMs = 3000;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(url, options);
            const json = await response.json();
            console.log('Video status:', json.status);
           
            // Only return if status is 'done' and we have a result_url
            if (json.status === 'done' && json.result_url) {
                console.log('Video completed with URL:', json.result_url);
                return json.result_url;
            } else if (json.status === 'error') {
                throw new Error('Video processing failed: ' + (json.error?.message || 'Unknown error'));
            } else if (json.status === 'started' || json.status === 'created') {
                console.log('Video still processing...');
            }
           
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempts++;
        } catch (err) {
            console.error('Error getting video:', err);
            if (err.message.includes('Video processing failed')) {
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
            attempts++;
        }
    }
   
    throw new Error('Timeout waiting for video to be ready - please try again');
}

// Evaluation rubric
const evaluationRubric = `
Evaluate the medical student's diagnostic process using this rubric:

1. Quality of Patient Questions (1-4):
- Poor (1): Disorganized, mostly irrelevant questions that do not aid diagnosis.
- Fair (2): Some relevant questions but misses key info or strays off-topic.
- Good (3): Mostly focused and clear, with minor lapses or omissions.
- Excellent (4): Highly targeted, organized, and respectful questions leading to comprehensive patient information.

2. Use of Patient Responses (1-4):
- Poor (1): Ignores or misinterprets critical details; does not adapt questioning.
- Fair (2): Inconsistent use of patient info; misses follow-up on important clues.
- Good (3): Generally uses patient info effectively; minor missed opportunities for further probing.
- Excellent (4): Actively synthesizes patient responses, refining differentials in real time with targeted follow-up questions.

3. Test Selection & Interpretation (1-4):
- Poor (1): Requests irrelevant or excessive tests; misreads or disregards data.
- Fair (2): Selects some appropriate tests but omits others; struggles with interpreting complex results.
- Good (3): Generally appropriate test choices; interprets most results correctly with minor errors.
- Excellent (4): Selects highly relevant tests with strong rationale; interprets all results accurately and updates plan accordingly.

4. Diagnostic Efficiency & Attempts (1-4):
- Poor (1): Takes excessive tries, guesses, or is unable to converge on the correct diagnosis.
- Fair (2): Eventually finds a reasonable diagnosis but with multiple missteps or repeated guesses.
- Good (3): Reaches the correct or near-correct diagnosis in a moderate number of attempts, using data effectively.
- Excellent (4): Quickly converges on the correct diagnosis with minimal trials and clear, data-driven reasoning.

Based on the game history provided, give a score for each category and explain your reasoning. Format your response exactly like this:
{
  "qualityOfQuestions": {"score": X, "reasoning": "explanation..."},
  "useOfResponses": {"score": X, "reasoning": "explanation..."},
  "testSelection": {"score": X, "reasoning": "explanation..."},
  "diagnosticEfficiency": {"score": X, "reasoning": "explanation..."}
}`;

export async function evaluateGamePerformance() {
    try {
        const gameHistory = currentGameHistory;
        if (!gameHistory.trim()) {
            throw new Error("No game history available to evaluate");
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: evaluationRubric
                    },
                    {
                        role: "user",
                        content: `Here is the game history to evaluate:\n${gameHistory}`
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error('Failed to evaluate game performance');
        }

        const data = await response.json();
        const evaluation = JSON.parse(data.choices[0].message.content);
        return evaluation;
    } catch (error) {
        console.error('Evaluation error:', error);
        throw new Error(`Failed to evaluate game: ${error.message}`);
    }
}

export async function getProfessionalFeedback() {
    try {
        const gameHistory = currentGameHistory;
        if (!gameHistory.trim()) {
            throw new Error("No game history available for feedback");
        }

        const feedbackPrompt = `You are an experienced medical educator and practicing physician. Review this medical student's diagnostic process and provide constructive feedback in these areas:

1. Areas for Improvement:
- Analyze what could have been done better
- Identify missed opportunities or inefficiencies
- Suggest specific strategies for improvement

2. Real-World Context:
- Explain how this scenario relates to real medical practice
- Share relevant examples from actual clinical settings
- Discuss common challenges practitioners face in similar situations

3. Professional Development Advice:
- Offer specific recommendations for skill development
- Suggest resources or techniques for further learning
- Provide tips for handling similar cases in the future

Format your response as a JSON object like this:
{
    "areasForImprovement": ["point 1", "point 2", ...],
    "realWorldContext": "detailed explanation...",
    "professionalAdvice": ["advice 1", "advice 2", ...]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: feedbackPrompt
                    },
                    {
                        role: "user",
                        content: `Here is the diagnostic session to review:\n${gameHistory}`
                    }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get professional feedback');
        }

        const data = await response.json();
        const feedback = JSON.parse(data.choices[0].message.content);
        return feedback;
    } catch (error) {
        console.error('Feedback error:', error);
        throw new Error(`Failed to get feedback: ${error.message}`);
    }
}
