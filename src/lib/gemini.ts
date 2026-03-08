import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBlogWithImages(topic: string, keyPoints: string, length: string, numImages: number) {
  const prompt = `
You are an expert blog writer. Write a highly engaging, well-structured blog post.
Topic: ${topic}
Key Points to cover: ${keyPoints}
Length: ${length} words (approximate)

You also need to provide ${numImages} short, single-word keywords (e.g., 'technology', 'nature', 'business', 'ai', 'data') that represent suitable images for this blog post.

Return the result as a JSON object with the following structure:
{
  "title": "The blog title",
  "content": "The full blog content in Markdown format. Do not include image placeholders.",
  "imageKeywords": ["keyword1", "keyword2", ...]
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
          imageKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "content", "imageKeywords"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  // Use picsum.photos with the generated keywords for free tier compatibility
  const imageUrls = (result.imageKeywords || []).slice(0, numImages).map((keyword: string) => {
    // Clean up the keyword to ensure it's a valid seed
    const cleanKeyword = keyword.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'blog';
    return `https://picsum.photos/seed/${cleanKeyword}/1024/768`;
  });

  return {
    title: result.title,
    content: result.content,
    images: imageUrls
  };
}
