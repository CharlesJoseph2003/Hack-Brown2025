Inspiration
Coming from a family of medical professionals, I noticed how my sister was frustrated with her nursing simulations for college. Her pain points were that the simulations weren't interactive and didn't provide real time feedback on her performance. Additionally, it is incredibly challenging to receive feedback from patients due to the intimate and sensitive nature of medical interactions. This led us to create a solution that makes learning more interactive and insightful, helping future medical professionals not just diagnose diseases, but truly care for their patients as people.

What it does
MediSim is an dynamic medical education simulation platform that empowers medical professionals to enhance patient care through life like avatar interactions. It provides real-time feedback on diagnostic decisions, guiding users on asking the right questions and selecting appropriate tests to improve accuracy and patient outcomes.

How we built it
D-ID (Pre-trained video generation model): Generates a realistic video avatar that speaks naturally and responds with lifelike expressions.
Whisper (Audio to text transcription): Converts spoken input from medical professionals into text, enabling seamless AI interaction in the simulation.
OpenAI(API Endpoint): Used OpenAI to generate responses for medical professionals, helping them analyze symptoms, provide test results, and evaluate performance in the simulation.
AWS S3(Video storage and download URL): Securely stores generated video avatars and provides reliable download links for seamless access.
React (Frontend): We used React to develop our frontend and create a dynamic UI and route to different tabs.
Node.js (Backend): Handles audio processing with audio-decode and manages file uploads via form-data, ensuring efficient data handling.
Chart.js(Data Visualization): Used Chart.js to visualize the performance results for each medical
Challenges we ran into
Avatar Generation - The main challenge we ran into was streamlining the avatar generation pipeline. We wanted the AI generated responses to be converted into audio and passed to the avatar to speak. Additionally, there was a lot of testing with different models to make sure that we chose one that was able to quickly generate video in a realistic manner. SoX library - Struggled to get the SoX library compliant for correct audio format interfaces

Accomplishments that we're proud of
We’re proud to have collaborated as a team to build a meaningful project that enhances the way medical professionals interact with patient simulations, improving diagnostic accuracy and decision-making. We spent time thinking of ways we could build something impactful but also push our technical skills to the limit by learning how to use video generation models and convert speech to text and back to speech.

What we learned
We had a lot of ideas that we wanted to implement and cool features that we would've liked to add, but had to learn what to prioritize given the time limit. We learned the importance of taking into account of everyone's technical abilities and leverage them to build something meaningful.

What's next for MediSim
We would like to create broader application that can include video generation of the tests and provide a more realistic interface with the patient. Additionally, we would like to implement an agentic avatar that is able to react in real time to medical professionals and even be able to give variable scenarios to test them.
