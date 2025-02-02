import fetch from 'node-fetch';
import readline from 'readline';

const ILLNESS = "pancreatic cancer";
const API_KEY = "";

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const role_patient = `You are a tool to help medical students learn how to diagnose patients. Pretend you are a sick patient with ${ILLNESS}. Respond to student's questions with symptoms of someone who has ${ILLNESS}. Give two sentences maximum`;
const role_test = `You are a medical lab technician preforming medical test on patient with ${ILLNESS}. Give one sentence report with measurements for described test in prompt. never mention anything about ${ILLNESS}`
async function interactWithGPT(role, prompt, model = "gpt-3.5-turbo") {
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

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        return `An error occurred: ${error.message}`;
    }
}


async function playGame() {
    let answer = false;
    let count = 0;
    
    while (!answer && count < 7) {
        // Present all three options
        console.log(`\nAttempt ${count + 1}/7`);
        const choice = await new Promise(resolve => {
            rl.question("Would you like to (1) ask a question, (2) run a test, or (3) make a diagnosis? ", resolve);
        });

        if (choice === "1") {
            // Ask question path
            const question = await new Promise(resolve => {
                rl.question("Question: ", resolve);
            });
            

            const result = await interactWithGPT(role_patient, question);
            let video_id = await createVideo(result);
            console.log("Video created with ID:", video_id);
            console.log("Waiting for video to process...");
            
            try {
                let video_url = await getVideo(video_id);
                console.log("Final video URL:", video_url);
            } catch (error) {
                console.error("Failed to get video:", error.message);
            }

            console.log("\nPatient response:", result);
        } 
        else if (choice === "2") {
            // Run test path
            const test = await new Promise(resolve => {
                rl.question("What test would you like to run? ", resolve);
            });
            
            const testResult = await interactWithGPT(role_test, test);
            console.log("\nTest Results:", testResult);
        }
        else if (choice === "3") {
            // Make diagnosis
            const guess = await new Promise(resolve => {
                rl.question("What is your diagnosis? ", resolve);
            });

            if (guess.toLowerCase() === ILLNESS.toLowerCase()) {
                answer = true;
            } else {
                console.log("\nIncorrect diagnosis. Keep trying!");
            }
        }

        count++;
    }

    if (answer) {
        console.log("Congratulations!");
    } else {
        console.log("Sorry, you lose. The illness was", ILLNESS);
    }

    rl.close();
}

async function getVideo(video_id) {
    const url = `https://api.d-id.com/talks/${video_id}`;
    const options = {
        method: 'GET', 
        headers: {
            accept: 'application/json',
            "authorization": "Basic Y2hhcmxlcy5qb3NlcGgyMTAzQGdtYWlsLmNvbQ:zIKoaauNzzT2xzB5OZ7K-"
        }
    };
    
    const maxAttempts = 10; // Maximum number of retry attempts
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(url, options);
            const json = await response.json();
            console.log('Video status:', json.status);
            
            if (json.result_url) {
                console.log('Result URL:', json.result_url);
                return json.result_url;
            }
            
            // If video is not ready, wait 2 seconds before trying again
            console.log('Video not ready yet, waiting...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;
        } catch (err) {
            console.error('Error:', err);
            throw err;
        }
    }
    
    throw new Error('Timeout waiting for video to be ready');
}

async function createVideo(gpt_text){
    const url = 'https://api.d-id.com/talks';
    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json', 
            'content-type': 'application/json',
            'authorization': 'Basic Y2hhcmxlcy5qb3NlcGgyMTAzQGdtYWlsLmNvbQ:zIKoaauNzzT2xzB5OZ7K-'
        },
        body: JSON.stringify({
            source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
            script: {
                type: 'text',
                subtitles: 'false',
                provider: {type: 'microsoft', voice_id: 'Sara'},
                input: gpt_text
            },
            config: {fluent: 'false', pad_audio: '0.0'}
        })
    };

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        console.log('Full response:', json);
        console.log('Video ID:', json.id);
        return json.id;
    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}



// Start the game
console.log("Welcome to the Medical Diagnosis Game!");
console.log("Try to diagnose the patient's condition by asking questions or running tests.");
console.log("You have 7 attempts to make the correct diagnosis.\n");

playGame();