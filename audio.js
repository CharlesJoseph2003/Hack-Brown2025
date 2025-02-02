import recorder from 'node-record-lpcm16';
import { createWriteStream, createReadStream } from 'fs';
import readline from 'readline';
import fetch from 'node-fetch';
import FormData from 'form-data';

const API_KEY = "";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function recordAudio(outputFile = 'recording.wav') {
    console.log('Recording... Press Enter to stop.');
    
    return new Promise((resolve) => {
        const fileStream = createWriteStream(outputFile);
        const rec = recorder.record({
            sampleRate: 16000,
            channels: 1,
            verbose: true
        });

        rec.stream().on('data', (data) => {
            fileStream.write(data);
        });

        rl.question('', () => {
            rec.stop();
            fileStream.end();
            rl.close();
            console.log(`Recording saved to ${outputFile}`);
            resolve(outputFile);
        });
    });
}

async function transcribeAudio(audioFile) {
    console.log('Transcribing audio...');
    const formData = new FormData();
    formData.append('file', createReadStream(audioFile));
    formData.append('model', 'whisper-1');

    try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Transcription failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
}

// Start recording and transcribe when done
async function main() {
    try {
        const audioFile = await recordAudio();
        console.log('\nTranscribing the recording...');
        const transcription = await transcribeAudio(audioFile);
        console.log('\nTranscription:', transcription);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();