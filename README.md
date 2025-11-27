# InsightSkin

**InsightSkin** is an advanced AI-powered intelligence platform designed to analyze the skincare industry. It helps users identify emerging market trends, uncover competitor gaps, and discover "white space" opportunities for new product development.

Built with modern web technologies and state-of-the-art AI models, InsightSkin combines internal data analysis with real-time web research to provide actionable insights.

## 🚀 Features

-   **Trend Analysis**: Detects rising ingredients, product formats, and consumer concerns in the skincare market.
-   **White Space Discovery**: Identifies gaps in the market where consumer needs are not being fully met.
-   **Competitor Intelligence**: Analyzes existing products and reviews to understand competitor strengths and weaknesses.
-   **RAG Pipeline**: Utilizes Retrieval-Augmented Generation (RAG) with a Pinecone vector database to ground answers in real-world product and review data.
-   **Real-Time Research**: Integrates with Exa AI to fetch the latest web data and validate trends.
-   **Interactive Chat Interface**: A seamless, chat-based UI for querying insights and generating reports.

## 🛠️ Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
-   **Language**: TypeScript, React 19
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **AI SDK**: [Vercel AI SDK](https://sdk.vercel.ai/docs)
-   **LLM**: OpenAI (GPT-4.1)
-   **Vector Database**: [Pinecone](https://www.pinecone.io/)
-   **Search Tool**: [Exa AI](https://exa.ai/)
-   **UI Components**: Radix UI, Lucide React, Sonner, Framer Motion

## 📂 Project Structure

```bash
├── app/                # Next.js App Router pages and layouts
├── components/         # Reusable UI components
│   ├── ai-elements/    # AI-specific components (chat, artifacts, tools)
│   └── ui/             # Generic UI components (buttons, inputs, etc.)
├── lib/                # Utility functions and helpers
├── scripts/            # Python scripts for data ingestion and chunking
├── public/             # Static assets (images, icons)
├── config.ts           # Application configuration and constants
└── prompts.ts          # System prompts and AI behavior definitions
```

## ⚡ Getting Started

### Prerequisites

-   Node.js 18+ installed
-   Python 3.9+ (for data processing scripts)
-   API Keys for:
    -   OpenAI
    -   Pinecone
    -   Exa AI

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/insight-skin.git
    cd insight-skin
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the root directory and add your API keys:
    ```env
    OPENAI_API_KEY=your_openai_key
    PINECONE_API_KEY=your_pinecone_key
    EXA_API_KEY=your_exa_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Open the app:**
    Visit `http://localhost:3000` in your browser.

## 🧠 Data Pipeline

The project includes a Python-based data pipeline located in the `scripts/` directory. This pipeline is responsible for:
1.  Loading raw product and review data (`.jsonl` files).
2.  Chunking and embedding the text.
3.  Upserting vectors into the Pinecone index (`beauty-whitespace`).

To run the data ingestion (ensure you have the necessary Python packages installed):
```bash
cd scripts
python chunking.py
```

## 📄 License

This project is proprietary and confidential.

---

**Developed by Prajwal Bakshi**
