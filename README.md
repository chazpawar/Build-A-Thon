# AI Lecture Summarizer

A full-stack application that summarizes books, notes, and lectures using the Gemini API.

## Features

- Summarize content from three different sources:
  - Books
  - Lecture videos/audio
  - Notes
- Input options:
  - URL/link
  - File upload
  - Direct text input
- Clean, responsive UI
- Chat history for reviewing previous summaries

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Express.js
- **AI**: Google Gemini API

## Prerequisites

- Node.js (v16+)
- npm or bun

## Setup Instructions

### Clone the repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### Backend Setup

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. The Gemini API key is included in the code, but you can replace it with your own in the `.env` file if needed.

4. Start the backend server:

```bash
npm run dev
```

The server will run on http://localhost:5000

### Frontend Setup

1. Open a new terminal and navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The frontend will run on http://localhost:3000

## Usage

1. Open your browser and go to http://localhost:3000
2. Choose the content type you want to summarize (Book, Lecture, or Notes)
3. Select your input method (URL, File Upload, or Direct Text)
4. Enter the URL, upload a file, or paste your text
5. Click the "Summarize" button
6. View the AI-generated summary and chat history

## Notes

- For video uploads, the backend extracts audio and transcribes it before summarization
- The application uses the Gemini API to generate intelligent, context-aware summaries
- Chat history is maintained during your session

## Limitations

- Video transcription is simplified for this demonstration
- For production use, implement proper authentication and rate limiting
