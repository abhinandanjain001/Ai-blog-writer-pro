import { GoogleGenAI } from "@google/genai";

/* ---------------- IMAGE GENERATION (HUGGING FACE) ---------------- */

export async function generateImage(prompt: string) {
  const apiKey = (import.meta as any).env.VITE_HF_API_KEY;

  if (!apiKey) {
    console.warn("Hugging Face API key is missing. Falling back to Pollinations AI.");
    return fallbackImageGeneration(prompt);
  }

  try {
    let response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `professional blog illustration about ${prompt}, digital art, cinematic lighting, high quality`,
        }),
      }
    );

    // Hugging Face models may return 503 while loading
    if (response.status === 503) {
      console.log("HF image model loading... retrying in 5s");
      await new Promise((r) => setTimeout(r, 5000));

      response = await fetch(
        "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `professional blog illustration about ${prompt}, digital art`,
          }),
        }
      );
    }

    if (response.status === 401) {
      throw new Error("Invalid Hugging Face API key. Please check your AI Studio settings.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HF Error ${response.status}: ${errorText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.warn("HF failed → using Pollinations fallback:", error);
    return fallbackImageGeneration(prompt);
  }
}

function fallbackImageGeneration(prompt: string) {
  const encodedPrompt = encodeURIComponent(
    `blog illustration about ${prompt}, digital art`
  );
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true`;
}


/* ---------------- BLOG GENERATION (GEMINI) ---------------- */

async function generateContentWithRetry(ai: GoogleGenAI, prompt: string, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      return response;
    } catch (error: any) {
      // Check if it's a rate limit error (429)
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
        retries++;
        if (retries >= maxRetries) {
          throw new Error("Gemini API rate limit exceeded. Please try again later.");
        }
        
        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.pow(2, retries) * 1000;
        console.warn(`Gemini rate limit hit. Retrying in ${delay/1000}s... (Attempt ${retries} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (error?.status === 400 && error?.message?.includes("API key not valid")) {
        throw new Error("Invalid Gemini API key. Please check your AI Studio settings.");
      } else {
        // For other errors, throw immediately
        throw error;
      }
    }
  }
  throw new Error("Failed to generate content after multiple retries.");
}

export async function generateBlogWithImages(
  topic: string,
  keyPoints: string,
  length: string,
  numImages: number
) {
  // Use process.env for Gemini API key as it's injected by the platform
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please configure it in AI Studio settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert blog writer.

Write a highly engaging SEO blog.

Topic: ${topic}
Key Points: ${keyPoints}
Length: ${length}

Also generate ${numImages} image prompts suitable for AI image generation.

Return ONLY JSON in this format:

{
"title":"Blog title",
"content":"Markdown blog content",
"imagePrompts":["prompt1","prompt2"]
}
`;

  try {
    const response = await generateContentWithRetry(ai, prompt);
    const textOutput = response.text || "";

    let result: any = {};

    try {
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(textOutput);
      }
    } catch (e) {
      console.warn("Failed to parse JSON from Gemini");
      result = {
        title: topic,
        content: textOutput.replace(/\`\`\`json|\`\`\`/g, '').trim(),
        imagePrompts: [topic],
      };
    }

    /* -------- IMAGE GENERATION -------- */

    const imageUrls = await Promise.all(
      (result.imagePrompts || [])
        .slice(0, numImages)
        .map(async (imgPrompt: string) => {
          try {
            return await generateImage(imgPrompt);
          } catch (e) {
            console.error("Image generation failed:", e);
            return null;
          }
        })
    );

    return {
      title: result.title || topic,
      content: result.content || "Failed to generate content",
      images: imageUrls.filter(Boolean),
    };

  } catch (error: any) {
    console.error("Gemini blog generation failed:", error);
    // Re-throw with a user-friendly message if it's one of our custom errors
    if (error.message.includes("Gemini API key") || error.message.includes("rate limit")) {
      throw error;
    }
    throw new Error(`Failed to generate blog: ${error.message || "Unknown error"}`);
  }
}
