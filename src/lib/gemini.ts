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
    if (response.status === 503) {
      console.log("Image model is loading, waiting 5 seconds to retry...");
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
    const encodedPrompt = encodeURIComponent(`blog illustration about ${prompt}, digital art, professional`);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true`;
  }
}

export async function generateBlogWithImages(topic: string, keyPoints: string, length: string, numImages: number) {
  const apiKey = (import.meta as any).env.VITE_HF_API_KEY;
  
  const prompt = `[INST] You are an expert blog writer. Write a highly engaging, well-structured blog post.
Topic: ${topic}
Key Points to cover: ${keyPoints}
Length: ${length} words (approximate)

You also need to provide ${numImages} image prompts that would be suitable for this blog post.
The image prompts should be highly detailed, descriptive, and suitable for an AI image generator.

Return ONLY a valid JSON object with the following structure. Do not include any other text or markdown formatting outside the JSON:
{
  "title": "The blog title",
  "content": "The full blog content in Markdown format. Do not include image placeholders.",
  "imagePrompts": ["prompt 1", "prompt 2"]
} [/INST]`;

  try {
    let response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2500,
            return_full_text: false,
            temperature: 0.7
          }
        }),
      }
    );

    if (response.status === 503) {
      console.log("Text model is loading, waiting 10 seconds to retry...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      response = await fetch(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 2500,
              return_full_text: false,
              temperature: 0.7
            }
          }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HF API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    let textOutput = data[0]?.generated_text || "";
    
    // Clean up the output to extract JSON
    let result: any = {};
    try {
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(textOutput);
      }
    } catch (e) {
      console.error("Failed to parse JSON from Mistral:", textOutput);
      result = {
        title: topic,
        content: textOutput.replace(/\`\`\`json|\`\`\`/g, '').trim(),
        imagePrompts: [topic]
      };
    }
    
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
      title: result.title || topic,
      content: result.content || "Failed to generate content.",
      images: imageUrls.filter(Boolean)
    };
  } catch (error) {
    console.error("Failed to generate blog with Mistral:", error);
    throw error;
  }
}
