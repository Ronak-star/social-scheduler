/*import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { Generation } from "../models/Generation.js";
import { promises } from "node:dns";

// Helper to poll OpenAI
const pollOpenAijob = async (GenerationId: string, apiKey: string) : promise<string>=>{
   const maxRetries = 20;
   cosnt delay = 5000;

   for(let i = 0; i< maxRetries; i++){
    try{
      const responce =  await axios.get(`${generationId}`,{headers:{
        accept: "application/json", authorization: `Bearer ${apiKey}`
      }})

      const generation = responce.data.generations_by_pk;
      if(generation.status === "COMPLETE"){
        if(generation.generated_images && generation.generated_images.length > 0){
          return generation.generated_images[0].url;
        }
        throw new Error ("Generation complete but no images found.")
      }
      if(generation.status === "FAILED"){
        throw new Error ("OpenAi generation failed")
      }
        
     } catch(err: any){
      console.error("Polling error:". err?.responce?.data || err.message);
          
      }
    }
   }
}
// Generate post
// POST /api/posts/generate
export const generatePost = async (req: AuthRequest, res: Response): Promise<void> => {

}

// Get generations
// GET /api/posts/generations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {prompt, tone, generateImage} = req.body

    const apikey = process.env.GEMINI_API_KEY;
    if(!apikey){
      res.status(400).json({message: "Gemini API key is missing please add it to your server/.env file."});
      return;
    }
const ai = new GoogleGenAI({
  apiKey: apikey,
});

// Generate Text
 const textResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate a social media post based on this promt: "${prompt}.Tone: ${tone}.
    Include relevant hashtags. 
    Format the responce as JSON with "content" and "imagePromt" fields. 
    The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.`,
  });

  let content = "";
  let imagePrompt = prompt;
try {
    const rawText = textResponse.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {content: rawText, imagePrompt: prompt};
    content = data.content;
    imagePrompt = data.imagePrompt;
} catch (e) {
    content = textResponse.text || ""
}

    // ── GPT Image 2: generate image (optional) ──────────────────
    let mediaUrl = "";
 
    if (generateImage) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        res
          .status(500)
          .json({ message: "OPENAI_API_KEY is missing from .env" });
        return;
      }
 
      // POST to OpenAI Images API
      const imageRes = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "gpt-image-2",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",   // "256x256" | "512x512" | "1024x1024"
          quality: "LOW",   // "low" | "medium" | "high"
          response_format: "url", // "url" | "b64_json"
        },
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
 
      // OpenAI returns: { data: [ { url: "..." } ] }

      const generationId = openAiKey.data.generate.generationId;
      const tempurl = await pollOpenAijob(generationId, openAiKey)
      mediaUrl = imageRes.data?.data?.[0]?.url ?? "";
    }
 
    // ── Return result ───────────────────────────────────────────
    res.status(200).json({
      success: true,
      content,
      imagePrompt,
      mediaUrl,
    });
  }catch(error){

  }

}


// Get posts
// GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {

}

// Schedule post
// POST / api/posts
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {

}
*/
/*

import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";

// ──────────────────────────────────────────────
// Generate post  →  POST /api/posts/generate
// ──────────────────────────────────────────────
export const generatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { prompt, tone, generateImage } = req.body;

    if (!prompt || !tone) {
      res.status(400).json({ message: "prompt aur tone dono required hain." });
      return;
    }

    // ── 1. Gemini se post text generate karo ───────────────────
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      res.status(500).json({ message: "GEMINI_API_KEY .env mein missing hai." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a social media post based on this prompt: "${prompt}".
Tone: ${tone}.
Include relevant hashtags.
Return ONLY a valid JSON object with exactly two keys:
  "content"     – the finished post text with hashtags
  "imagePrompt" – a highly descriptive image-generator prompt that complements the post.
Do NOT wrap the JSON in markdown backticks.`,
    });

    // ── 2. Gemini response parse karo ──────────────────────────
    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text ?? "";
      const cleaned = rawText.replace(/```(?:json)?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        content = data.content ?? rawText;
        imagePrompt = data.imagePrompt ?? prompt;
      } else {
        content = rawText;
      }
    } catch {
      content = textResponse.text ?? "";
    }

    // ── 3. OpenAI GPT Image 2 se image generate karo ───────────
    let mediaUrl = "";

    if (generateImage) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        res.status(500).json({ message: "OPENAI_API_KEY .env mein missing hai." });
        return;
      }

      const imageRes = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "gpt-image-2",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "low",
        },
        {
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // FIX 1: tempUrl variable mein store karo pehle
      const tempUrl = imageRes.data?.data?.[0]?.url ?? "";

      // FIX 2: sirf tab upload karo jab URL mila ho
      if (tempUrl) {
        const uploadResult = await cloudinary.uploader.upload(tempUrl, {
          folder: "ai-generations",
        });
        mediaUrl = uploadResult.secure_url;
      }
    }

    // FIX 3: Generation.create aur res.json — function ke andar hona chahiye
    const generation = await Generation.create({
      user: req.user?._id,   // FIX 4: semicolon tha, colon chahiye tha
      prompt,
      content,
      mediaUrl,
      mediaType: mediaUrl ? "image" : undefined,
      tone,
    });

    // ── 4. Result return karo ───────────────────────────────────
    // FIX 5: resizeBy.json → res.json
    res.status(200).json({
      success: true,
      generation,
    });

  } catch (error: unknown) {
    console.error("[generatePost] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ success: false, message });
  }
};

// ──────────────────────────────────────────────
// Get generations  →  GET /api/posts/generations
// ──────────────────────────────────────────────
// Get generations
// GET /api/posts/generations
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const generations = await Generation.find({user: req.user._id}).sort({createdAt: -1})
        res.json(generations)
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}


// ──────────────────────────────────────────────
// Get posts  →  GET /api/posts
// ──────────────────────────────────────────────
// Get posts
// GET /api/posts
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const posts = await Post.find({user: req.user?._id})
        res.json(posts)
    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}


// ──────────────────────────────────────────────
// Schedule post  →  POST /api/posts
// ──────────────────────────────────────────────
// Schedule post
// POST /api/posts
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;

        // Parse platforms if it comes as a stringified array from FormData
        let parsedPlatforms = platforms;
        if(typeof platforms === "string"){
            try {
                parsedPlatforms = JSON.parse(platforms)
            } catch (e) {
                parsedPlatforms = platforms.split(",");
            }
        }

    
        let mediaUrl: string | undefined = req.body.mediaUrl;
        let mediaType: "image" | "video" | undefined = req.body.mediaType;

        if(req.file){
            const result = await new Promise<any>((resolve, reject)=>{
                const stream = cloudinary.uploader.upload_stream({resource_type: "auto",
                folder: "social-scheduler"}, (error, result)=>{
                    if(error) reject(error);
                    else resolve(result)
                });
                stream.end(req.file!.buffer);
            });
            mediaUrl = result.secure_url;
            mediaType = result.resource_type === "video" ? "video" : "image"
        }

        const post = await Post.create({
            user: req.user._id,
            content,
            platforms: parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor,
            status,
        })
        res.status(201).json(post)




    } catch (error: any) {
        res.status(500).json({ message: error?.message || "Server error" });
    }
}
    */

/*

   import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";


// ──────────────────────────────────────────────
// Generate post  →  POST /api/posts/generate
// ──────────────────────────────────────────────
export const generatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { prompt, tone, generateImage } = req.body;

    if (!prompt || !tone) {
      res.status(400).json({ message: "prompt aur tone dono required hain." });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      res.status(500).json({ message: "GEMINI_API_KEY .env mein missing hai." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a social media post based on this prompt: "${prompt}".
Tone: ${tone}.
Include relevant hashtags.
Return ONLY a valid JSON object with exactly two keys:
  "content"     – the finished post text with hashtags
  "imagePrompt" – a highly descriptive image-generator prompt that complements the post.
Do NOT wrap the JSON in markdown backticks.`,
    });

    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text ?? "";
      const cleaned = rawText.replace(/```(?:json)?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        content = data.content ?? rawText;
        imagePrompt = data.imagePrompt ?? prompt;
      } else {
        content = rawText;
      }
    } catch {
      content = textResponse.text ?? "";
    }

    let mediaUrl = "";

    if (generateImage) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        res.status(500).json({ message: "OPENAI_API_KEY .env mein missing hai." });
        return;
      }

      const imageRes = await axios.post(
        "https://api.openai.com/v1/images/generations",
        {
          model: "gpt-image-2",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "low",
        },
        {
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const tempUrl = imageRes.data?.data?.[0]?.url ?? "";

      if (tempUrl) {
        // ✅ FIX: URL se seedha upload nahi — pehle buffer mein download, phir upload
        const imageBuffer = await axios.get(tempUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(imageBuffer.data);

        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { resource_type: "image", folder: "ai-generations" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            )
            .end(buffer);
        });

        mediaUrl = uploadResult.secure_url;
      }
    }

    const generation = await Generation.create({
      user: req.user?._id,
      prompt,
      content,
      mediaUrl,
      mediaType: mediaUrl ? "image" : undefined,
      tone,
    });

    res.status(200).json({
      success: true,
      generation,
    });

  } catch (error: unknown) {
    console.error("[generatePost] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ success: false, message });
  }
};

// ──────────────────────────────────────────────
// Get generations  →  GET /api/posts/generations
// ──────────────────────────────────────────────
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const generations = await Generation.find({ user: req.user?._id }).sort({ createdAt: -1 });
    res.json(generations);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

// ──────────────────────────────────────────────
// Get posts  →  GET /api/posts
// ──────────────────────────────────────────────
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const posts = await Post.find({ user: req.user?._id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

// ──────────────────────────────────────────────
// Schedule post  →  POST /api/posts
// ──────────────────────────────────────────────
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, platforms, scheduledFor, status } = req.body;

    let parsedPlatforms = platforms;
    if (typeof platforms === "string") {
      try {
        parsedPlatforms = JSON.parse(platforms);
      } catch {
        parsedPlatforms = platforms.split(",");
      }
    }

    let mediaUrl: string | undefined = req.body.mediaUrl;
    let mediaType: "image" | "video" | undefined = req.body.mediaType;

    if (req.file) {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { resource_type: "auto", folder: "social-scheduler" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });
      mediaUrl = result.secure_url;
      mediaType = result.resource_type === "video" ? "video" : "image";
    }

    const post = await Post.create({
      user: req.user?._id,
      content,
      platforms: parsedPlatforms,
      mediaUrl,
      mediaType,
      scheduledFor,
      status,
    });

    res.status(201).json(post);

  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};



*/





















import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddlewware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";

// ──────────────────────────────────────────────
// Generate post  →  POST /api/posts/generate
// ──────────────────────────────────────────────
export const generatePost = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { prompt, tone, generateImage } = req.body;

    if (!prompt || !tone) {
      res.status(400).json({ message: "prompt aur tone dono required hain." });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      res.status(500).json({ message: "GEMINI_API_KEY .env mein missing hai." });
      return;
    }

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a social media post based on this prompt: "${prompt}".
Tone: ${tone}.
Include relevant hashtags.
Return ONLY a valid JSON object with exactly two keys:
  "content"     – the finished post text with hashtags
  "imagePrompt" – a highly descriptive image-generator prompt that complements the post.
Do NOT wrap the JSON in markdown backticks.`,
    });

    let content = "";
    let imagePrompt = prompt;

    try {
      const rawText = textResponse.text ?? "";
      const cleaned = rawText.replace(/```(?:json)?/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        content = data.content ?? rawText;
        imagePrompt = data.imagePrompt ?? prompt;
      } else {
        content = rawText;
      }
    } catch {
      content = textResponse.text ?? "";
    }

    let mediaUrl = "";

    if (generateImage) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        res.status(500).json({ message: "OPENAI_API_KEY .env mein missing hai." });
        return;
      }

    const imageRes = await axios.post(
  "https://api.openai.com/v1/images/generations",
  {
    model: "dall-e-3",
    prompt: imagePrompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",  // "standard" ya "hd" — "low" valid nahi
  },
  {
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,  // ye bhi add karo
  }
);

      const tempUrl = imageRes.data?.data?.[0]?.url ?? "";

      if (tempUrl) {
        // ✅ FIX: URL se seedha upload nahi — pehle buffer mein download, phir upload
        const imageBuffer = await axios.get(tempUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(imageBuffer.data);

        const uploadResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { resource_type: "image", folder: "ai-generations" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            )
            .end(buffer);
        });

        mediaUrl = uploadResult.secure_url;
      }
    }

    const generation = await Generation.create({
      user: req.user?._id,
      prompt,
      content,
      mediaUrl,
      mediaType: mediaUrl ? "image" : undefined,
      tone,
    });

    res.status(200).json({
      success: true,
      generation,
    });

  } catch (error: unknown) {
    console.error("[generatePost] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    res.status(500).json({ success: false, message });
  }
};

// ──────────────────────────────────────────────
// Get generations  →  GET /api/posts/generations
// ──────────────────────────────────────────────
export const getGenerations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const generations = await Generation.find({ user: req.user?._id }).sort({ createdAt: -1 });
    res.json(generations);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

// ──────────────────────────────────────────────
// Get posts  →  GET /api/posts
// ──────────────────────────────────────────────
export const getPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const posts = await Post.find({ user: req.user?._id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};

// ──────────────────────────────────────────────
// Schedule post  →  POST /api/posts
// ──────────────────────────────────────────────
export const schedulePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, platforms, scheduledFor, status } = req.body;

    let parsedPlatforms = platforms;
    if (typeof platforms === "string") {
      try {
        parsedPlatforms = JSON.parse(platforms);
      } catch {
        parsedPlatforms = platforms.split(",");
      }
    }

    let mediaUrl: string | undefined = req.body.mediaUrl;
    let mediaType: "image" | "video" | undefined = req.body.mediaType;

    if (req.file) {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            { resource_type: "auto", folder: "social-scheduler" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });
      mediaUrl = result.secure_url;
      mediaType = result.resource_type === "video" ? "video" : "image";
    }

    const post = await Post.create({
      user: req.user?._id,
      content,
      platforms: parsedPlatforms,
      mediaUrl,
      mediaType,
      scheduledFor,
      status,
    });

    res.status(201).json(post);

  } catch (error: any) {
    res.status(500).json({ message: error?.message || "Server error" });
  }
};