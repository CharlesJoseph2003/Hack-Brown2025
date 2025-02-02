import React, { useState, useEffect, useRef } from 'react';

const AudioRecorder = ({ onRecordingComplete, isLoading }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [hasPermission, setHasPermission] = useState(null);
    const mediaRecorder = useRef(null);
    const audioContext = useRef(null);
    const audioStream = useRef(null);
    const audioChunks = useRef([]);

    useEffect(() => {
        checkMicrophonePermission();
        return () => {
            if (audioStream.current) {
                audioStream.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const checkMicrophonePermission = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            setHasPermission(result.state === 'granted');
            result.onchange = () => {
                setHasPermission(result.state === 'granted');
            };
        } catch (error) {
            console.error('Error checking permission:', error);
            setHasPermission(false);
        }
    };

    const convertToWav = (audioBuffer) => {
        const numOfChannels = 1;
        const sampleRate = 16000;
        const bytesPerSample = 2;
        const blockAlign = numOfChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = audioBuffer.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // WAV header
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numOfChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        // Write audio data
        const volume = 1;
        let index = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            view.setInt16(index, audioBuffer[i] * (0x7FFF * volume), true);
            index += 2;
        }

        return new Blob([buffer], { type: 'audio/wav' });
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const startRecording = async () => {
        try {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: 16000
                });
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000
                }
            });
            audioStream.current = stream;

            const source = audioContext.current.createMediaStreamSource(stream);
            const processor = audioContext.current.createScriptProcessor(16384, 1, 1);
            
            audioChunks.current = [];

            source.connect(processor);
            processor.connect(audioContext.current.destination);

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                audioChunks.current.push(new Float32Array(inputData));
            };

            mediaRecorder.current = processor;
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            alert('Could not access microphone. Please check your browser settings and try again.');
        }
    };

    const stopRecording = async () => {
        if (audioStream.current) {
            audioStream.current.getTracks().forEach(track => track.stop());
            
            // Concatenate all audio chunks
            const length = audioChunks.current.reduce((acc, chunk) => acc + chunk.length, 0);
            const audioData = new Float32Array(length);
            let offset = 0;
            audioChunks.current.forEach(chunk => {
                audioData.set(chunk, offset);
                offset += chunk.length;
            });

            // Convert to WAV
            const wavBlob = convertToWav(audioData);
            
            // Create FormData
            const formData = new FormData();
            formData.append('file', wavBlob, 'recording.wav');
            formData.append('model', 'whisper-1');

            onRecordingComplete(formData);
            setIsRecording(false);
            audioChunks.current = [];
        }
    };

    if (hasPermission === null) {
        return <button className="record-button">Checking microphone access...</button>;
    }

    if (hasPermission === false) {
        return (
            <button 
                onClick={checkMicrophonePermission}
                className="record-button permission-needed"
            >
                Grant Microphone Access
            </button>
        );
    }

    return (
        <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!hasPermission || isLoading}
            className={`record-button ${isRecording ? 'recording' : ''} ${isLoading ? 'loading' : ''}`}
        >
            {isLoading ? (
                <div className="loading-spinner"></div>
            ) : isRecording ? (
                <>
                    <div className="wave-container">
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                        <div className="wave-bar"></div>
                    </div>
                    Stop Recording
                </>
            ) : (
                'Start Recording'
            )}
        </button>
    );
};

export default AudioRecorder;
