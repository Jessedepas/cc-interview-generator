import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  PROFILE_SYSTEM_PROMPT,
  buildProfileUserPrompt,
} from "@/lib/profile-prompt";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { cvText } = await request.json();

    if (!cvText || typeof cvText !== "string") {
      return NextResponse.json(
        { error: "CV text is required" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: PROFILE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildProfileUserPrompt(cvText),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const profileData = JSON.parse(textBlock.text);
    return NextResponse.json(profileData);
  } catch (error) {
    console.error("Profile extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract profile data" },
      { status: 500 }
    );
  }
}
