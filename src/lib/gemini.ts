import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateImage(prompt: string) {
  const apiKey = (import.meta as any).env.VITE_HF_API_KEY;

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
          inputs: `blog illustration about ${prompt}, digital art, professional`,
        }),
      }
    );

    // Hugging Face free tier often returns 503 when the model is loading into memory.
    // Wait 5 seconds and retry once.
    if (response.status === 503) {
      console.log("Model is loading, waiting 5 seconds to retry...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      response = await fetch(
        "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: `blog illustration about ${prompt}, digital art, professional`,
          }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("Hugging Face API failed, falling back to Pollinations AI:", error);
    // Fallback to Pollinations AI which is free, doesn't require an API key, and generates real AI images
    const encodedPrompt = encodeURIComponent(`blog illustration about ${prompt}, digital art, professional`);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true`;
  }
}

export async function generateBlogWithImages(topic: string, keyPoints: string, length: string, numImages: number) {
  const prompt = `
You are an expert blog writer. Write a highly engaging, well-structured blog post.
Topic: ${topic}
Key Points to cover: ${keyPoints}
Length: ${length} words (approximate)

You also need to provide ${numImages} image prompts that would be suitable for this blog post.
The image prompts should be highly detailed, descriptive, and suitable for an AI image generator.

Return the result as a JSON object with the following structure:
{
  "title": "The blog title",
  "content": "The full blog content in Markdown format. Do not include image placeholders.",
  "imagePrompts": ["prompt 1", "prompt 2", ...]
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          imagePrompts: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "content", "imagePrompts"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  // Generate images in parallel using Hugging Face
  const imageUrls = await Promise.all(
    (result.imagePrompts || []).slice(0, numImages).map(async (imgPrompt: string) => {
      try {
        return await generateImage(imgPrompt);
      } catch (e) {
        console.error("Failed to generate image", e);
        return null;
      }
    })
  );

  return {
    title: result.title,
    content: result.content,
    images: imageUrls.filter(Boolean)
  };
}
