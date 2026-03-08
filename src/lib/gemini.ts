import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  
  // Generate images in parallel
  const imageUrls = await Promise.all(
    (result.imagePrompts || []).slice(0, numImages).map(async (imgPrompt: string) => {
      try {
        const imgRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: imgPrompt }] },
          config: {
            imageConfig: { aspectRatio: "16:9", imageSize: "1K" }
          }
        });
        for (const part of imgRes.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (e) {
        console.error("Failed to generate image", e);
      }
      return null;
    })
  );

  return {
    title: result.title,
    content: result.content,
    images: imageUrls.filter(Boolean)
  };
}
