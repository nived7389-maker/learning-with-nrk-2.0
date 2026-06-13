# Learning With NRK

Kerala State Syllabus Higher Secondary (+1 & +2) Science streams educational portal. This app provides real-time study materials, a PDF manager, subscription controls, and dedicated admin controls.

## Features
- **Student Portal**: Access to +1 and +2 Science stream study materials.
- **Admin Dashboard**: Manage PDFs, banners, and student subscriptions.
- **Single Device Login**: Security feature that restricts student sign-in to a maximum of one registered device at a time to prevent account sharing.
- **AI Assistant**: Built-in AI assistant to help answer student questions.

## Technologies Used
- React 19
- Vite
- Tailwind CSS 4
- Express Server (for API routes)
- Firebase (Authentication, Firestore Database, Storage)
- Google Gemini API

## Setup Instructions

1. **Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

5. **Start Production Server**:
   ```bash
   npm start
   ```

## 🚀 Netlify Deployment Guide
This project is configured right out-of-the-box for Netlify deployment using Netlify Serverless Functions (for the backend AI Assistant).

**How to deploy via Zip:**
1. Download this project as a **ZIP** file from Google AI Studio.
2. Go to **[Netlify Drop](https://app.netlify.com/drop)** or use the Netlify App Dashboard to drag and drop your `.zip` folder.
3. Wait for the upload and deployment to finish.
4. **CRITICAL STEP: Setup the AI Key**
   - In Netlify, go to **Site configuration > Environment variables**.
   - Add a new variable:
     - Key: `OPENROUTER_API_KEY`
     - Value: your secret OpenRouter API Key (Get it from [OpenRouter](https://openrouter.ai/keys))
5. After setting the Environment variable, go to **Deploys** and click **Trigger deploy** -> **Clear cache and deploy site** to ensure Netlify applies the backend key.

Enjoy your seamlessly integrated Google GenAI Assistant on Netlify!
